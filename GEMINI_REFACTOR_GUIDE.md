# ScholarGrid Refactoring Guide for Gemini 3.8 Flash

This guide outlines the critical steps needed to upgrade the ScholarGrid platform to fully utilize a local LLM + RAG (Retrieval-Augmented Generation) pipeline. The current implementation relies on hardcoded responses, extremely short timeouts, and heuristic pattern matching instead of genuine AI reasoning.

## The Core Problem
The system currently "fakes" AI functionality in several key areas. For example:
- `query_local_llm` calls are wrapped in `asyncio.wait_for` with timeouts as short as 3.5 or 4.0 seconds. If the LLM doesn't respond instantly, it falls back to hardcoded strings or deterministic functions.
- `generate_scholarly_response` uses basic regex and string matching to generate responses instead of passing the full context to the LLM.
- `synthesize_research_paper` has hardcoded knowledge about specific papers (e.g., "Attention Is All You Need", "BERT").
- Flashcards and code implementations are hardcoded seeds rather than dynamically generated from paper content.
- `analyze_math_equation` has hardcoded variables, python code, and concepts for specific formulas (softmax, sigmoid, tanh, etc.).

## Refactoring Plan

### 1. Implement True RAG (Retrieval-Augmented Generation)
**Goal:** Replace naive substring matching with a vector database (e.g., `pgvector` in PostgreSQL or a local vector store like ChromaDB/FAISS) to chunk and retrieve relevant parts of research papers.

**Actions:**
*   Add a proper embedding model (e.g., `all-MiniLM-L6-v2` via `sentence-transformers` or an Ollama embedding endpoint).
*   Create a robust chunking strategy for PDF text extraction. When a paper is uploaded (`/api/research/ingest`), extract text, split it into chunks, embed each chunk, and store it in the database.
*   Update `main.py` to accept queries, embed them, search the vector store for the top-k most relevant chunks, and inject those chunks as context into the LLM prompt.

### 2. Remove Hardcoded Timeouts and Fallbacks
**Goal:** Allow the local LLM the time it needs to generate thoughtful, accurate responses.

**Actions (in `living-science-grid/research_brain/main.py`):**
*   **Line ~2281 (`run_research_chat`):** Remove the `timeout=4.0` from `asyncio.wait_for(query_local_llm(...))`. Replace the massive heuristic `generate_scholarly_response` function (Lines 1887-2178) entirely with a well-crafted prompt containing the RAG context.
*   **Line ~3521 (`execute_rigor_audit`):** Remove the `timeout=4.0` in `asyncio.wait_for(query_local_llm(prompt, force_json=True), timeout=4.0)`. Allow the LLM to perform the full rigor audit. Replace `analyze_manuscript_dynamically` which uses regex/heuristic scoring with an LLM prompt that evaluates the retrieved chunks.
*   **Line ~2494 (`generate_domain_matrix`):** Remove `timeout=3.5`. Ensure the LLM processes the full abstract/content of each paper to extract `data_specs`, `dataset`, etc. Replace `synthesize_research_paper` (which has hardcoded paper logic).

### 3. Upgrade Specific Tools

#### A. InsightLens (Chat & Translation)
*   **Translation:** In `translate_research_text` (Line ~2185), remove the `timeout=3.5` constraint and the hardcoded translation fallbacks for Bengali, Spanish, French, and German.

#### B. Math Evaluator (`analyze_math_equation`)
*   **Current State:** Lines ~2960-3236 rely entirely on `if "softmax" in low_tex:` to return hardcoded python code, concepts, and graphs.
*   **Upgrade:** Prompt the LLM to generate the Python code, identify variables with their min/max/default ranges, and provide a critique based on the specific context of the research paper using RAG.

#### C. Scholar Audit (`check_manuscript_plagiarism` & `check_ai_writing_patterns`)
*   **Current State:** Plagiarism uses exact ngram matching against a hardcoded `canonical_corpus`. AI pattern checking uses regex for terms like "delve into" and "rich tapestry".
*   **Upgrade:** Use the LLM to evaluate stylistic writing patterns and stylistic coherence. Use semantic similarity (embeddings) rather than exact n-gram matching against the database to detect plagiarism or lack of originality.

#### D. Domain Matrix (`generate_domain_matrix`)
*   **Current State:** Hardcoded dictionaries for "Attention Is All You Need" (Line ~2305).
*   **Upgrade:** The LLM must read the abstract and full text (via RAG), and return structured JSON comparing the papers across user-defined or dynamically extracted parameters.

#### E. Flashcards & Code Implementations
*   **Current State:** `get_student_flashcards` and `get_code_implementations` inject hardcoded seed data if the database is empty. `extract_pytorch_algorithm` uses string templates.
*   **Upgrade:** Use the LLM to actively synthesize flashcards (Concept, Definition, Formula) by querying the vector database for the paper's key methodologies. For code, prompt the LLM to generate syntactically correct PyTorch code representing the core equations extracted from the paper.

## Execution Directives for Gemini
1.  **Introduce `pgvector` or FAISS:** Establish a `DocumentChunk` table/store for RAG.
2.  **Rewrite `query_local_llm` calls:** Ensure no artificially low timeouts force fallbacks.
3.  **Delete Heuristic Functions:** Remove `generate_scholarly_response`, `synthesize_research_paper`, `analyze_manuscript_dynamically`, and hardcoded `analyze_math_equation` logic. Replace them with structured LLM prompts (using `force_json=True` where necessary) combined with RAG context.
4.  **Verify End-to-End:** Ensure that every prompt provides adequate context from the document chunks so the LLM has all the information it needs to reason effectively.

### 4. Implement User-Specific Long-Term Memory & Caching
**Goal:** Make the LLM "smarter" and faster over time by remembering user preferences, past interactions, and previously processed paper contexts.

**Actions:**
*   **User Persona & Context Graph:** Create a database schema (e.g., in Postgres) to store a "User Memory Graph" or "User Context Profile". When the user asks a question, embed the query and retrieve not just paper chunks, but also previous relevant interactions or preferences stored for that `user_id`.
*   **Paper Embedding Caching:** Once a paper is parsed, chunked, and embedded, cache these embeddings and summary metadata (e.g., extracted methodologies, math equations) permanently. When the Domain Matrix or Scholar Audit requests analysis on an already-processed paper, the system should fetch the cached context instantly rather than re-reading/re-embedding the raw text.
*   **Contextual Chat History:** In `InsightLens` and `Domain Matrix`, ensure the chat history is properly managed. Instead of passing the entire history to the LLM (which blows up context limits), maintain a rolling window of recent chat messages AND embed previous chat summaries into the user's memory vector store for long-term recall.
*   **Adaptive Prompts:** Adjust the `system_prompt` dynamically based on the user's role (extracted from the database, e.g., 'researcher', 'student') and their past interaction history, so the LLM tailors its complexity and focus automatically.

## Execution Directives for Gemini (Continued)
5.  **Implement Memory Store:** Create a mechanism (using PostgreSQL JSONB and pgvector) to store and retrieve user-specific historical context, preferences, and paper summaries.
6.  **Modify Chat Endpoints:** Update endpoints like `/api/research/chat` and `/api/research/matrix` to inject this retrieved user memory alongside the paper RAG context.

### 5. Enforce Academic Rigor and Enterprise-Grade Stability
**Goal:** This is a high-grade, authentic research reviewing platform. Underhanded shortcuts, "faked" AI responses, silent failures, and bug-prone heuristics are entirely unacceptable. The system must be robust, scientifically accurate, and completely transparent in its AI reasoning.

**Actions:**
*   **Eradicate Heuristic Fallbacks:** Remove all instances where the code falls back to hardcoded strings, regex pattern matching, or generic templates if the AI fails or times out. The AI must perform the actual work.
*   **Strict Error Handling:** Do not use empty `except Exception: pass` blocks (as seen heavily throughout `main.py`). If the LLM generation fails or the vector retrieval fails, return a proper, informative `500 Internal Server Error` or a clear JSON error payload to the frontend. Silent failures compromise academic integrity.
*   **Hallucination Prevention:** In the RAG pipeline, explicitly instruct the LLM in the `system_prompt` to strictly base its answers *only* on the provided context chunks. If the answer is not in the text, the LLM must explicitly state that the document does not contain the information.
*   **Auditability:** Every AI-generated response, summary, or math evaluation must be logged with the context chunks that were used to generate it. This ensures that users (researchers) can verify exactly which parts of the paper the AI used to form its conclusions.
*   **Robust JSON Parsing:** When requiring JSON from the LLM (e.g., in `execute_rigor_audit` or `analyze_math_equation`), use robust schema validation (like Pydantic) to ensure the LLM's output exactly matches the expected structure. Reject and retry malformed JSON instead of silently returning empty/default objects.

## Execution Directives for Gemini (Continued)
7.  **Remove Silent Failures:** Audit `main.py` and remove all `try/except: pass` blocks related to LLM generation, PDF parsing, and database transactions. Implement proper error logging and HTTP exception raising.
8.  **Strict Context Constraints:** Update all LLM prompts to explicitly prohibit hallucinations and enforce strict reliance on the retrieved context.
9.  **Implement Validation:** Wrap all LLM JSON generation in a Pydantic validation flow with automated retry logic to ensure system stability and predictable output structures.
