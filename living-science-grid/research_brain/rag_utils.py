import json
import logging
import asyncio
from typing import List, Dict, Any, Optional
from sentence_transformers import SentenceTransformer
import asyncpg
import fitz

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load embedding model globally
_embedder = None

def get_embedder():
    global _embedder
    if _embedder is None:
        logger.info("Loading SentenceTransformer model 'all-MiniLM-L6-v2'...")
        _embedder = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedder

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """Splits text into overlapping chunks."""
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        if chunk:
            chunks.append(chunk)
    return chunks

async def ensure_vector_schema(pool: asyncpg.Pool):
    """Ensure pgvector extension and document_chunks table exist."""
    async with pool.acquire() as conn:
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS document_chunks (
                id SERIAL PRIMARY KEY,
                paper_id VARCHAR(255),
                page_number INT,
                chunk_text TEXT,
                embedding vector(384)
            );
            CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
            ON document_chunks USING hnsw (embedding vector_cosine_ops);
        """)
        logger.info("Vector schema verified.")

async def ingest_paper_to_rag(pool: asyncpg.Pool, paper_id: str, file_bytes: bytes):
    """Extract text from PDF, chunk it, embed, and store in pgvector."""
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        chunks_data = []
        embedder = get_embedder()

        for page_num, page in enumerate(doc):
            text = page.get_text("text")
            if not text.strip(): continue

            page_chunks = chunk_text(text)
            if not page_chunks: continue

            embeddings = embedder.encode(page_chunks).tolist()

            for chunk, emb in zip(page_chunks, embeddings):
                chunks_data.append((str(paper_id), page_num + 1, chunk, emb))

        if chunks_data:
            async with pool.acquire() as conn:
                await conn.executemany(
                    "INSERT INTO document_chunks (paper_id, page_number, chunk_text, embedding) VALUES ($1, $2, $3, $4)",
                    chunks_data
                )
        logger.info(f"Ingested {len(chunks_data)} chunks for paper {paper_id}")
        return True
    except Exception as e:
        logger.error(f"RAG ingestion failed: {e}")
        return False

async def query_rag_context(pool: asyncpg.Pool, query: str, paper_id: Optional[str] = None, top_k: int = 4) -> str:
    """Retrieve most relevant chunks for a query."""
    try:
        embedder = get_embedder()
        query_embedding = embedder.encode(query).tolist()

        async with pool.acquire() as conn:
            if paper_id:
                rows = await conn.fetch("""
                    SELECT chunk_text, page_number, 1 - (embedding <=> $1::vector) AS similarity
                    FROM document_chunks
                    WHERE paper_id = $2
                    ORDER BY embedding <=> $1::vector
                    LIMIT $3
                """, query_embedding, str(paper_id), top_k)
            else:
                rows = await conn.fetch("""
                    SELECT chunk_text, page_number, 1 - (embedding <=> $1::vector) AS similarity
                    FROM document_chunks
                    ORDER BY embedding <=> $1::vector
                    LIMIT $3
                """, query_embedding, top_k)

        context_parts = []
        for r in rows:
            context_parts.append(f"[Page {r['page_number']}] {r['chunk_text']}")
        return "\n\n".join(context_parts)
    except Exception as e:
        logger.error(f"RAG query failed: {e}")
        return ""
