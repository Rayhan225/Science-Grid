import asyncio
import httpx
import json

BACKEND_URL = "http://127.0.0.1:8000"

async def test_all():
    async with httpx.AsyncClient(timeout=15.0) as client:
        print("\n" + "="*80)
        print("   SCHOLARGRID VERIFICATION OF CORE FIXES & DEEP ENHANCEMENTS")
        print("="*80 + "\n")

        # 1. TEST LOGIN AUTHENTICATION (NO 401s)
        print("1. Testing Auth Login (Case-insensitive, demo accounts, trimming)...")
        login_cases = [
            {"email": "researcher@scholargrid.io", "password": "password123"},
            {"email": "RESEARCHER@SCHOLARGRID.IO", "password": "password123"},
            {"email": "  student@scholargrid.io  ", "password": "password123  "},
            {"email": "rayhan2530@gmail.com", "password": "123456"}
        ]
        for c in login_cases:
            res = await client.post(f"{BACKEND_URL}/api/v1/auth/login", json=c)
            assert res.status_code == 200, f"Login failed for {c['email']}: {res.status_code} - {res.text}"
            data = res.json()
            assert "access_token" in data, f"No token for {c['email']}"
            print(f"   [PASS] Login OK for '{c['email']}' -> user_id: {data['user']['id']}, role: {data['user']['role']}")

        # 2. TEST AUDIT LOOKUP (NO 404s)
        print("\n2. Testing Audit Detail Lookup (Existing UUID, Non-existent UUID, String IDs)...")
        test_ids = [
            "d99e4135-c3c8-4706-95bc-6c8f470f21cc",
            "non-existent-uuid-9999",
            "paperCRA.pdf"
        ]
        for aid in test_ids:
            res = await client.get(f"{BACKEND_URL}/api/research/audits/{aid}")
            assert res.status_code == 200, f"Audit lookup failed for {aid}: {res.status_code}"
            data = res.json()
            assert "audit_id" in data or "id" in data, "No audit payload returned"
            print(f"   [PASS] Audit lookup OK for '{aid}' -> returned audit_id: {data.get('audit_id')}")

        # 3. TEST MATH EXTRACTION OVER MULTI-PAGE TEXT (NO STATIC 2-TEMPLATE FALLBACK)
        print("\n3. Testing MathEvaluator Math Extraction Engine...")
        sample_multipage_text = (
            "Page 1 Content:\n"
            "We define the scaled cross-entropy optimization objective as follows:\n"
            "\\mathcal{L}_{CE}(\\theta) = -\\sum_{i=1}^B y_i \\log(\\hat{y}_i) + \\lambda ||\\theta||^2\n\n"
            "Page 2 Content:\n"
            "Next, the multi-head attention projection satisfies:\n"
            "\\text{Attn}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V\n\n"
            "Page 3 Content:\n"
            "The recurrent state update equation is formulated as:\n"
            "h_t = \\sigma(W_h x_t + U_h h_{t-1} + b_h)\n"
        )
        res = await client.post(f"{BACKEND_URL}/api/research/math-extract", json={
            "content": sample_multipage_text,
            "paper_title": "Deep Transformer Latent Dynamics",
            "max_equations": 5
        })
        assert res.status_code == 200, f"Math extract failed: {res.status_code}"
        eq_data = res.json()
        assert eq_data.get("status") == "success"
        eqs = eq_data.get("equations", [])
        assert len(eqs) >= 3, f"Expected at least 3 extracted equations, got {len(eqs)}"
        print(f"   [PASS] Math Extract isolated {len(eqs)} authentic equations:")
        for eq in eqs:
            print(f"      - Page {eq.get('pageNum')}: {eq.get('name')} -> {eq.get('latex')[:45]}...")

        # 4. TEST DOMAIN MATRIX COMPARISON (AUTHENTIC, NON-BOILERPLATE SYNTHESIS)
        print("\n4. Testing DomainMatrix Synthesis (Comparing 2 Distinct Papers)...")
        papers = [
            {
                "id": "p1",
                "title": "Attention Is All You Need",
                "content": "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We propose the Transformer, a model architecture eschewing recurrence and entirely relying on an attention mechanism. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train. On the WMT 2014 English-to-German translation task, the big model achieves 28.4 BLEU, improving over the existing best results by over 2 BLEU. On the WMT 2014 English-to-French task, our model establishes a new single-model state-of-the-art BLEU score of 41.8. We trained using the Adam optimizer with beta_1 = 0.9, beta_2 = 0.98 and learning rate warm up of 4000 steps. A notable limitation is the quadratic O(n^2) complexity with respect to sequence length."
            },
            {
                "id": "p2",
                "title": "Mamba: Linear-Time Sequence Modeling with Selective State Spaces",
                "content": "Foundation models, now mostly based on the Transformer architecture, suffer from linear-time computation bottlenecks during autoregressive generation and quadratic scaling during training. In this work, we propose Mamba, an architecture based on selective state space models (SSM). By making the state space parameters time-varying functions of the input, Mamba addresses the limitation of prior subquadratic models to perform content-based reasoning. We evaluate Mamba on the Pile dataset with 300B tokens across parameter scales from 130M to 2.8B. Mamba achieves 5x higher inference throughput than Transformers of similar size and matches Transformers twice its size. We train using AdamW with lr=6e-4, batch size 0.5M tokens, weight decay 0.1 on 128 A100 GPUs. A limitation is the difficulty of recalling long verbatim text spans compared to full attention key-value caches."
            }
        ]
        res = await client.post(f"{BACKEND_URL}/api/research/matrix", json={"papers": papers})
        assert res.status_code == 200, f"Matrix synthesis failed: {res.status_code}"
        matrix_res = res.json()
        matrix_rows = matrix_res.get("matrixData", [])
        assert len(matrix_rows) == 2, f"Expected 2 rows, got {len(matrix_rows)}"
        row1, row2 = matrix_rows[0], matrix_rows[1]
        
        # Verify non-boilerplate
        assert row1["dataset"] != row2["dataset"], "Datasets should be distinct!"
        assert row1["models"] != row2["models"], "Models should be distinct!"
        assert "N=2,800 evaluated instances" not in row1["data_specs"], "Boilerplate instances detected in row 1!"
        assert "Demonstrates robust parameter efficiency" not in row1["strengths"], "Boilerplate strengths detected in row 1!"
        
        print(f"   [PASS] Paper 1 Extracted:")
        print(f"      - Dataset: {row1['dataset']}")
        print(f"      - Model:   {row1['models']}")
        print(f"      - Strengths: {row1['strengths'][:70]}...")
        print(f"      - Result:    {row1['result'][:70]}...")
        print(f"   [PASS] Paper 2 Extracted:")
        print(f"      - Dataset: {row2['dataset']}")
        print(f"      - Model:   {row2['models']}")
        print(f"      - Strengths: {row2['strengths'][:70]}...")
        print(f"      - Result:    {row2['result'][:70]}...")

        # 5. TEST VALIDATION RIGOR SCORING ON AI-GENERATED TEXT (CALIBRATION: 35-55%)
        print("\n5. Testing ValidationRigor Rigor Scoring on AI-Generated / Cliché Manuscript...")
        ai_manuscript = (
            "In this paper, we delve into the multifaceted realm of artificial intelligence. "
            "It is a testament to the ever-evolving landscape of machine learning, serving as a beacon of innovation. "
            "The interplay between deep networks underscores the paramount importance of navigating complex architectures. "
            "In summary, this groundbreaking framework seamlessly harnesses the power of data, playing a crucial role in modern science."
        )
        res = await client.post(f"{BACKEND_URL}/api/research/rigor-audit", json={
            "title": "Delving into Multifaceted AI Paradigms",
            "content": ai_manuscript
        })
        assert res.status_code == 200, f"Rigor audit failed: {res.status_code}"
        audit_eval = res.json()
        score = audit_eval.get("rigor_score")
        passed = audit_eval.get("verification_passed")
        flags = audit_eval.get("audit_flags", [])
        
        print(f"   [PASS] AI-generated manuscript score: {score}/100 (Passed: {passed})")
        assert score <= 55.0, f"Expected score <= 55.0 for AI text, got {score}"
        assert passed is False, f"Expected verification_passed == False for AI text, got {passed}"
        
        critical_flags = [f for f in flags if f.get("severity") == "Critical"]
        assert len(critical_flags) >= 1, "Expected Critical flags for AI stylometry / lack of empirical proofs"
        for cf in critical_flags:
            print(f"      - [CRITICAL FLAG]: {cf.get('title')}")

        print("\n" + "="*80)
        print("   ALL VERIFICATIONS PASSED 100% WITH EXCELLENCE!")
        print("="*80 + "\n")

if __name__ == "__main__":
    asyncio.run(test_all())

