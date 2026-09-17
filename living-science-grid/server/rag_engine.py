# server/rag_engine.py
# ═══════════════════════════════════════════════════════════════════
# RAG Engine — Local Vector Embeddings (fastembed/all-MiniLM-L6-v2)
# Semantic Sliding Window Chunking, pgvector Search & User Memory
# ═══════════════════════════════════════════════════════════════════

import re
import math
import uuid
from typing import List, Dict, Any, Optional, Tuple

try:
    from fastembed import TextEmbedding
    FASTEMBED_AVAILABLE = True
except ImportError:
    TextEmbedding = None
    FASTEMBED_AVAILABLE = False
    print("[WARN] [RAG Engine] fastembed not installed. Run: pip install fastembed")

import db_manager

# Singleton embedder instance
_embedder_instance = None


def get_embedder():
    """Retrieve or initialize the singleton 384-dimensional embedding model."""
    global _embedder_instance
    if _embedder_instance is None:
        if not FASTEMBED_AVAILABLE or TextEmbedding is None:
            raise RuntimeError("fastembed is not available in current Python environment.")
        # Uses sentence-transformers/all-MiniLM-L6-v2 (384 dims, ONNX, CPU-optimized)
        _embedder_instance = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
        print("[OK] [RAG Engine] Initialized fastembed (all-MiniLM-L6-v2, 384-dim, ONNX CPU).")
    return _embedder_instance


def embed_text(text: str) -> List[float]:
    """Generate a single 384-dimensional embedding vector."""
    embedder = get_embedder()
    clean_text = (text or "").strip()
    if not clean_text:
        clean_text = "empty"
    embeddings = list(embedder.embed([clean_text]))
    return [float(x) for x in embeddings[0]]


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Batch generate 384-dimensional embedding vectors."""
    if not texts:
        return []
    embedder = get_embedder()
    clean_texts = [t.strip() if (t and t.strip()) else "empty" for t in texts]
    embeddings = list(embedder.embed(clean_texts))
    return [[float(x) for x in emb] for emb in embeddings]


# ═══════════════════════════════════════════════════════════════════
# CHUNKING STRATEGY
# ═══════════════════════════════════════════════════════════════════

def split_into_sentences(text: str) -> List[str]:
    """Split text into sentences while preserving mathematical equations."""
    # Protect common abbreviations and LaTeX periods
    clean = text.replace("et al.", "et_al").replace("e.g.", "e_g").replace("i.e.", "i_e")
    sentences = re.split(r'(?<=[.!?])\s+', clean)
    restored = [
        s.replace("et_al", "et al.").replace("e_g", "e.g.").replace("i_e", "i.e.").strip()
        for s in sentences if s.strip()
    ]
    return restored


def chunk_manuscript(
    pages: Dict[str, str],
    sections: Optional[List[Dict]] = None,
    chunk_size_words: int = 350,
    overlap_words: int = 50,
    paper_id: Optional[str] = None,
    file_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Produce semantically rich chunks across all pages of a research manuscript.
    Preserves page numbers, section titles, and boundary coherence.
    """
    raw_chunks = []
    chunk_idx = 0

    # Build section lookup by page number
    sec_by_page = {}
    if sections:
        for sec in sections:
            p = sec.get("page", 1)
            title = sec.get("title", "Section")
            if p not in sec_by_page:
                sec_by_page[p] = title

    # Sort pages numerically
    sorted_page_keys = sorted(pages.keys(), key=lambda x: int(x) if str(x).isdigit() else 0)

    for page_key in sorted_page_keys:
        page_num = int(page_key) if str(page_key).isdigit() else 1
        page_text = pages[page_key] or ""
        sec_title = sec_by_page.get(page_num, f"Page {page_num}")

        paragraphs = [p.strip() for p in page_text.split("\n\n") if p.strip()]
        if not paragraphs:
            paragraphs = [page_text.strip()] if page_text.strip() else []

        current_words = []
        current_sentences = []

        for para in paragraphs:
            para_sentences = split_into_sentences(para)
            for sent in para_sentences:
                words = sent.split()
                if not words:
                    continue

                if len(current_words) + len(words) > chunk_size_words and current_words:
                    # Finalize current chunk
                    chunk_text = " ".join(current_sentences).strip()
                    if chunk_text:
                        raw_chunks.append({
                            "chunk_id": str(uuid.uuid4()),
                            "paper_id": paper_id,
                            "file_id": file_id,
                            "chunk_index": chunk_idx,
                            "page_number": page_num,
                            "section_title": sec_title,
                            "content": chunk_text,
                            "token_count": len(current_words),
                            "metadata": {
                                "page": page_num,
                                "section": sec_title,
                                "source": "pdf_extractor"
                            }
                        })
                        chunk_idx += 1

                    # Keep overlap from the end
                    overlap_tokens = current_words[-overlap_words:] if overlap_words < len(current_words) else current_words
                    current_words = list(overlap_tokens)
                    current_sentences = [" ".join(overlap_tokens)] if overlap_tokens else []

                current_words.extend(words)
                current_sentences.append(sent)

        # Flush any trailing sentences on this page
        if current_sentences:
            chunk_text = " ".join(current_sentences).strip()
            if chunk_text and len(chunk_text) > 30:
                raw_chunks.append({
                    "chunk_id": str(uuid.uuid4()),
                    "paper_id": paper_id,
                    "file_id": file_id,
                    "chunk_index": chunk_idx,
                    "page_number": page_num,
                    "section_title": sec_title,
                    "content": chunk_text,
                    "token_count": len(current_words),
                    "metadata": {
                        "page": page_num,
                        "section": sec_title,
                        "source": "pdf_extractor"
                    }
                })
                chunk_idx += 1

    # Generate embeddings in batch for all raw chunks
    if raw_chunks:
        all_texts = [c["content"] for c in raw_chunks]
        embeddings = embed_texts(all_texts)
        for i, emb in enumerate(embeddings):
            raw_chunks[i]["embedding"] = emb

    return raw_chunks


# ═══════════════════════════════════════════════════════════════════
# RETRIEVAL & CONTEXT WINDOW ASSEMBLY
# ═══════════════════════════════════════════════════════════════════

def retrieve_rag_context(
    query: str,
    paper_id: Optional[str] = None,
    file_id: Optional[str] = None,
    top_k: int = 5,
    max_chars: int = 3000
) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Embed the query, perform pgvector cosine search, and assemble formatted context
    with explicit chunk citations.
    Returns: (formatted_context_string, list_of_citation_dicts)
    """
    if not query.strip():
        return "", []

    try:
        q_emb = embed_text(query)
    except Exception as err:
        print(f"[ERROR] [RAG Engine] Embedding query failed: {err}")
        return "", []

    chunks = db_manager.search_document_chunks(
        query_embedding=q_emb,
        paper_id=paper_id,
        file_id=file_id,
        top_k=top_k,
        min_similarity=0.10
    )

    if not chunks and (paper_id or file_id):
        # Fallback: if no chunks matched query closely or embedding table empty,
        # retrieve raw chunks for this paper
        chunks = db_manager.get_chunks_by_paper(paper_id)[:top_k] if paper_id else []

    context_parts = []
    citations = []
    total_chars = 0

    for ch in chunks:
        content = ch.get("content", "").strip()
        if not content:
            continue
        page = ch.get("page_number", 1)
        sec = ch.get("section_title") or f"Page {page}"
        cid = ch.get("chunk_id")
        sim = ch.get("similarity", 0.0)

        header = f"[Source: Page {page} | Section: '{sec}' | Chunk ID: {cid}]"
        entry = f"{header}\n{content}\n"
        
        if total_chars + len(entry) > max_chars and context_parts:
            break

        context_parts.append(entry)
        citations.append({
            "chunk_id": cid,
            "page": page,
            "section": sec,
            "snippet": content[:180] + "...",
            "similarity": round(float(sim), 3) if sim else None
        })
        total_chars += len(entry)

    formatted_context = "\n---\n".join(context_parts)
    return formatted_context, citations


# ═══════════════════════════════════════════════════════════════════
# USER MEMORY GRAPH & ADAPTIVE PERSONA
# ═══════════════════════════════════════════════════════════════════

def retrieve_user_memory_context(user_id: str, query: str, top_k: int = 3) -> str:
    """Retrieve semantically relevant user history, preferences, and findings."""
    if not user_id or user_id == "usr_admin":
        return ""
    try:
        q_emb = embed_text(query)
        memories = db_manager.search_user_memory(user_id=user_id, query_embedding=q_emb, top_k=top_k)
        if not memories:
            return ""
        items = [f"- ({m.get('memory_type', 'history')}): {m.get('content')}" for m in memories if m.get("content")]
        if not items:
            return ""
        return "RELEVANT USER RESEARCH CONTEXT & PREFERENCES:\n" + "\n".join(items)
    except Exception as err:
        print(f"[WARN] [RAG Engine] User memory retrieval error: {err}")
        return ""


def save_user_interaction(user_id: str, query: str, answer_snippet: str, memory_type: str = "interaction_summary"):
    """Record an interaction summary into the user's long-term memory graph."""
    if not user_id:
        return
    summary = f"User inquired: '{query[:160]}'. Key finding: '{answer_snippet[:220]}'."
    try:
        emb = embed_text(summary)
        db_manager.insert_user_memory(
            user_id=user_id,
            memory_type=memory_type,
            content=summary,
            embedding=emb,
            metadata={"query": query[:100]}
        )
    except Exception as err:
        print(f"[WARN] [RAG Engine] Saving user interaction memory failed: {err}")


def build_system_prompt(
    role: str = "researcher",
    user_context: str = "",
    force_json: bool = False
) -> str:
    """
    Construct a role-tailored academic instruction prompt that enforces
    Chain-of-Thought reasoning and strict adherence to context without hallucinations.
    """
    norm_role = (role or "researcher").lower().strip()

    role_descriptions = {
        "professor": (
            "You are a Distinguished Tenured Professor and Peer-Review Editor. "
            "Focus on methodological rigor, statistical power, theoretical contribution, "
            "and curricular clarity. Critique assumptions with institutional peer-review standards."
        ),
        "programmer": (
            "You are a Lead AI Research Engineer and Systems Architect. "
            "Focus on computational graph complexity, PyTorch implementation details, memory bottlenecks, "
            "tensor dimensions, Big-O scaling, and numerical precision (FP16/BF16)."
        ),
        "student": (
            "You are an Advanced Scientific Tutor. Explain foundational mechanisms clearly, "
            "highlight primary mathematical formulations, unpack architectural intuitions step-by-step, "
            "and contrast concepts against standard baselines."
        ),
        "reviewer": (
            "You are an Elite Forensics Literature Reviewer. Scrutinize empirical bounds, claim-evidence alignment, "
            "ablation soundness, reproducibility metrics, and potential publication vulnerabilities."
        ),
        "researcher": (
            "You are a Principal AI Scientist and Comparative Literature Review Engine. "
            "Provide mathematically grounded, nuanced analyses citing specific equations, algorithmic trade-offs, "
            "and architectural innovations."
        )
    }

    base_persona = role_descriptions.get(norm_role, role_descriptions["researcher"])

    instructions = [
        base_persona,
        "\nCRITICAL ACADEMIC INTEGRITY DIRECTIVES:",
        "1. GROUNDING: Answer strictly and exclusively using the provided RESEARCH CONTEXT chunks. "
        "Every claim must be substantiated by the text.",
        "2. ANTI-HALLUCINATION: If the provided research context does not contain the answer or data requested, "
        "explicitly state: 'The provided manuscript context does not contain information regarding this inquiry.' "
        "Do NOT speculate, fabricate baselines, or invent equations.",
        "3. CHAIN-OF-THOUGHT: Analyze the context step-by-step before producing your conclusive findings.",
        "4. CITATIONS: Attribute key claims to the specific page or section referenced in the context brackets (e.g. [Page X])."
    ]

    if user_context:
        instructions.append(f"\n{user_context}")

    if force_json:
        instructions.append(
            "\nFORMATTING RULE: You MUST respond ONLY with a valid JSON object matching the requested schema. "
            "No conversational preambles, no commentary outside the JSON."
        )

    return "\n".join(instructions)

