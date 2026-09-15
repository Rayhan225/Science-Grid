import urllib.request
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_endpoint(name, url, method="GET", payload=None):
    print(f"[*] Testing {name} ({method} {url})...")
    req = urllib.request.Request(url, method=method)
    req.add_header("Content-Type", "application/json")
    data = json.dumps(payload).encode("utf-8") if payload else None
    
    try:
        with urllib.request.urlopen(req, data=data, timeout=30) as response:
            res_body = response.read().decode("utf-8")
            res_json = json.loads(res_body)
            print(f"  [+] SUCCESS (Status: {response.status})")
            return res_json
    except Exception as e:
        print(f"  [-] FAILED: {e}")
        sys.exit(1)

def run_tests():
    print("=== ScholarGrid Full Verification Suite ===")
    
    # 1. Health & AI Tags
    tags = test_endpoint("AI Engine Tags", f"{BASE_URL}/api/ai/tags")
    assert "models" in tags, "Expected 'models' in /api/ai/tags response"
    
    sample_paper = {
        "title": "Adaptive Sparse Attention Formulation",
        "content": (
            "Standard scaled dot-product attention maps query Q, key K, and value V according to: "
            "$$Attention(Q, K, V) = \\text{softmax}(Q K^T / \\sqrt{d_k}) V$$. "
            "In this work, we present an adaptive sparse attention framework that dynamically prunes "
            "redundant attention weights \\mathbf{W} and scalar W. "
            "Let latency be bounded by t = 14ms and t = 1.2s under mobile constraints. "
            "In essence, it is pivotal to delve into these dynamics to understand the underlying framework."
        )
    }

    # 2. Rigor Audit
    rigor = test_endpoint(
        "ScholarAudit Rigor Audit",
        f"{BASE_URL}/api/research/rigor-audit",
        method="POST",
        payload={**sample_paper, "audit_id": "test_audit_1", "user_id": "usr_test"}
    )
    assert "rigorScore" in rigor, "Missing rigorScore"
    assert "auditFlags" in rigor, "Missing auditFlags"
    assert len(rigor["auditFlags"]) > 0, "Expected auditFlags to be generated"
    assert "target_snippet" in rigor["auditFlags"][0], "Expected target_snippet in audit flags for precision anchoring"

    # 3. AI Writing Patterns Check
    ai_patterns = test_endpoint(
        "AI Writing Patterns & Stylometry",
        f"{BASE_URL}/api/research/ai-patterns-check",
        method="POST",
        payload=sample_paper
    )
    assert "human_likelihood" in ai_patterns or "humanProbability" in ai_patterns, "Missing humanProbability"
    assert "burstiness_score" in ai_patterns or "burstinessIndex" in ai_patterns, "Missing burstiness"
    assert "flagged_sentences" in ai_patterns, "Missing flagged_sentences"

    # 4. Plagiarism Check
    plag = test_endpoint(
        "Canonical Literature & Self-Overlap Check",
        f"{BASE_URL}/api/research/plagiarism-check",
        method="POST",
        payload=sample_paper
    )
    assert "originalityScore" in plag, "Missing originalityScore"
    assert "internalSelfOverlap" in plag, "Missing internalSelfOverlap"
    assert plag["totalSourcesScanned"] >= 14, "Expected >=14 canonical sources scanned"

    # 5. Terminology Guard & LaTeX Formula Extraction
    term = test_endpoint(
        "Terminology Guard & LaTeX Formula Inspector",
        f"{BASE_URL}/api/research/terminology-guard",
        method="POST",
        payload=sample_paper
    )
    assert "consistencyScore" in term, "Missing consistencyScore"
    assert "formulas" in term, "Missing formulas in terminology guard response"
    assert len(term["formulas"]) > 0, "Expected LaTeX formulas to be parsed and anchored"
    assert "anchor" in term["formulas"][0], "Expected formula anchor"
    assert "snippet" in term["formulas"][0], "Expected formula snippet"

    print("\n[OK] ALL 5 CORE BACKEND SCHOLARAUDIT PIPELINES PASSED 100% PERFECTLY!")

if __name__ == "__main__":
    run_tests()
