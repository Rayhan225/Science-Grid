"""
End-to-End Verification Test Suite for ScholarGrid Refactoring.
Tests SLM + RAG, pgvector integration, math analysis, rigor audit, plagiarism, and code extraction.
"""
import asyncio
import os
import sys
import json

# Ensure parent server and current dir are in path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "..", "server"))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)
if PARENT_DIR not in sys.path:
    sys.path.insert(0, PARENT_DIR)

import rag_engine
import db_manager
import main

async def run_tests():
    print("================================================================")
    print("  SCHOLARGRID COMPLETE REFACTORING VERIFICATION SUITE")
    print("================================================================")
    passed_count = 0
    total_tests = 8

    # TEST 1: RAG Engine Chunking & Embedding Generation
    print("\n[TEST 1] Testing RAG Engine Semantic Chunking & 384-Dim Dense Embeddings...")
    sample_paper = (
        "We introduce the Sovereign Neural Network architecture for scientific exploration. "
        "The model integrates continuous Hamiltonian dynamical systems with discrete topological representations. "
        "Given an input state x in R^d, the trajectory evolves according to dx/dt = J grad H(x), where H is a learned Hamiltonian function. "
        "We evaluate our formulation on standard chaotic dynamical benchmarks, achieving a 42% reduction in prediction error over symplectic integrators."
    )
    chunks = rag_engine.chunk_manuscript(pages={"1": sample_paper}, paper_id="test-paper-001", chunk_size_words=300, overlap_words=50)
    assert len(chunks) >= 1, "Expected at least 1 chunk"
    first_chunk = chunks[0]
    assert len(first_chunk["embedding"]) == 384, f"Expected 384-dim vector, got {len(first_chunk['embedding'])}"
    print(f"  --> PASS: Created {len(chunks)} chunk(s), dense embedding dimension: {len(first_chunk['embedding'])}")
    passed_count += 1

    # TEST 2: pgvector Storage & Vector Search
    print("\n[TEST 2] Testing pgvector Document Chunks Ingestion & Cosine Search...")
    inserted_count = await asyncio.to_thread(db_manager.insert_document_chunks_batch, chunks)
    assert inserted_count >= 1, "Failed to insert document chunks into pgvector"
    query_vec = rag_engine.embed_text("Hamiltonian dynamical systems and symplectic integrators")
    search_results = await asyncio.to_thread(db_manager.search_document_chunks, query_vec, None, None, 3)
    assert len(search_results) >= 1, "Vector search returned no results"
    top_result = search_results[0]
    print(f"  --> PASS: Inserted {inserted_count} chunks into PostgreSQL pgvector.")
    sim = top_result.get('similarity', 1.0)
    txt = top_result.get('content') or top_result.get('chunk_text', '')
    print(f"  --> Top search result similarity: {sim:.4f}, text preview: {txt[:60]}...")
    passed_count += 1

    # TEST 3: Math Evaluator without Hardcoded Branches
    print("\n[TEST 3] Testing Math Evaluator on a Non-Hardcoded Formula (Gaussian PDF)...")
    gaussian_req = main.MathAnalyzeRequest(
        latex=r"f(x) = \frac{1}{\sigma \sqrt{2\pi}} \exp\left(-\frac{(x - \mu)^2}{2\sigma^2}\right)",
        name="Gaussian Probability Density Function",
        pageNum=1,
        context="Normal distribution parameterized by mean mu and standard deviation sigma."
    )
    math_res = await main.analyze_math_equation(gaussian_req)
    assert math_res["status"] == "success"
    assert "concept" in math_res and len(math_res["concept"]) > 10
    assert "rating" in math_res
    assert len(math_res["variables"]) >= 1
    assert len(math_res["chartData"]) == 51  # 50 steps -> 51 points
    print(f"  --> PASS: Math Evaluator analyzed '{math_res['name']}'")
    print(f"      Concept: {math_res['concept'][:80]}...")
    print(f"      Rating: {math_res['rating']}")
    print(f"      Variables: {[v['symbol'] for v in math_res['variables']]}")
    print(f"      Trajectory points computed: {len(math_res['chartData'])}")
    passed_count += 1

    # TEST 4: Scholar Rigor Audit (No 4.0s timeout, genuine LLM/RAG audit)
    print("\n[TEST 4] Testing Scholar Rigor Audit with Caching...")
    audit_req = main.RigorAuditRequest(
        paper_id=None,
        title="Hamiltonian Neural Mechanics",
        content=sample_paper
    )
    audit_res = await main.execute_rigor_audit(audit_req)
    assert audit_res["status"] == "success"
    assert "rigorScore" in audit_res or "rigor_score" in audit_res
    score = audit_res.get("rigorScore", audit_res.get("rigor_score"))
    assert 0.0 <= float(score) <= 100.0
    flags = audit_res.get("auditFlags", audit_res.get("audit_flags", []))
    assert len(flags) >= 1
    summary = audit_res.get("reviewSummary", audit_res.get("review_summary", ""))
    assert len(summary) > 20
    print(f"  --> PASS: Rigor score: {score}/100, Flags count: {len(flags)}")
    print(f"      Summary: {summary[:100]}...")
    passed_count += 1

    # TEST 5: Plagiarism Check via pgvector Literature Vector Matching
    print("\n[TEST 5] Testing Plagiarism Check with pgvector Dense Literature Matching...")
    plag_req = main.PlagiarismCheckRequest(
        title="Query Paper on Hamiltonian Mechanics",
        content=sample_paper
    )
    plag_res = await main.check_manuscript_plagiarism(plag_req)
    assert plag_res["status"] == "success"
    assert "originalityScore" in plag_res
    assert "matchedSources" in plag_res
    print(f"  --> PASS: Originality score: {plag_res['originalityScore']}%, Overlap index: {plag_res['canonicalOverlapIndex']}%")
    print(f"      Matched sources count: {len(plag_res['matchedSources'])}")
    passed_count += 1

    # TEST 6: Stylometry & AI Writing Pattern Analysis
    print("\n[TEST 6] Testing AI Writing Patterns & Stylometrics...")
    pattern_req = main.AIPatternsCheckRequest(
        title="Authentic Scientific Report",
        content="We evaluate our formulation on standard chaotic dynamical benchmarks, achieving a 42% reduction in prediction error over symplectic integrators."
    )
    pattern_res = await main.check_ai_writing_patterns(pattern_req)
    assert pattern_res["status"] == "success"
    assert "humanProbability" in pattern_res
    assert "burstinessIndex" in pattern_res
    assert "lexicalDiversity" in pattern_res
    print(f"  --> PASS: Human Probability: {pattern_res['humanProbability']}%, Burstiness: {pattern_res['burstinessIndex']}, Lexical Diversity: {pattern_res['lexicalDiversity']}")
    passed_count += 1

    # TEST 7: Graduate Student Flashcards Synthesis
    print("\n[TEST 7] Testing Flashcards Synthesis from Paper Content...")
    flash_payload = {
        "paper_title": "Hamiltonian Neural Mechanics",
        "content": sample_paper,
        "user_id": "usr_test"
    }
    flash_res = await main.generate_flashcards_from_text(flash_payload)
    assert flash_res["status"] == "success"
    assert len(flash_res["cards"]) >= 1
    first_card = flash_res["cards"][0]
    assert "concept" in first_card and "definition" in first_card
    print(f"  --> PASS: Generated {len(flash_res['cards'])} flashcards.")
    print(f"      Card 1: {first_card['concept']} -> {first_card['definition'][:60]}...")
    passed_count += 1

    # TEST 8: PyTorch Algorithm Extraction
    print("\n[TEST 8] Testing PyTorch Algorithm Extraction via Local LLM...")
    code_payload = {
        "paper_title": "Hamiltonian Neural Mechanics",
        "content": sample_paper,
        "user_id": "usr_test"
    }
    code_res = await main.extract_pytorch_algorithm(code_payload)
    assert code_res["status"] == "success"
    impl = code_res["implementation"]
    assert "algorithm_name" in impl
    assert "code_snippet" in impl
    assert "class " in impl["code_snippet"]
    print(f"  --> PASS: Generated algorithm: {impl['algorithm_name']}")
    print(f"      Complexity: {impl['complexity']}")
    print(f"      Code preview:\n{impl['code_snippet'][:180]}...")
    passed_count += 1

    # Cleanup test chunks
    await asyncio.to_thread(db_manager.delete_chunks_by_paper, "test-paper-001")
    print(f"\n[CLEANUP] Deleted test chunks from pgvector.")

    print("\n================================================================")
    print(f"  ALL {passed_count}/{total_tests} REFACTORING VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("================================================================")

if __name__ == "__main__":
    asyncio.run(run_tests())
