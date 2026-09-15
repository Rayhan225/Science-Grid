# server/slm_engine.py
# ═══════════════════════════════════════════════════════════════════
# SLM Engine — Local Llama-3.2-3B-Instruct via llama-cpp-python
# Zero-network, CPU-only, deterministic greedy decoding
# ═══════════════════════════════════════════════════════════════════
import os
import json
import threading
from pathlib import Path

try:
    from llama_cpp import Llama
except ImportError:
    Llama = None
    print("[WARN] [SLM Engine] llama-cpp-python not installed. Run: pip install llama-cpp-python")

# ── Model path resolution ──
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
_MODEL_PATH = _PROJECT_ROOT / "models" / "llama-3.2-3b-instruct.Q5_K_M.gguf"

# Singleton instance & thread-safety lock
_llm_instance = None
_inference_lock = threading.Lock()


def get_model():
    """Load and return the singleton LLM instance."""
    global _llm_instance
    if _llm_instance is None:
        if Llama is None:
            raise RuntimeError(
                "llama-cpp-python is not installed. "
                "Run: pip install llama-cpp-python"
            )
        if not _MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Model file not found: {_MODEL_PATH}\n"
                f"Expected at: models/llama-3.2-3b-instruct.Q5_K_M.gguf"
            )

        n_threads = os.cpu_count() or 4
        _llm_instance = Llama(
            model_path=str(_MODEL_PATH),
            n_ctx=4096,
            n_threads=n_threads,
            n_threads_batch=n_threads,
            n_gpu_layers=0,       # CPU-only
            verbose=False,
            seed=42,              # Reproducibility
        )
        print(
            f"[OK] [SLM Engine] Loaded {_MODEL_PATH.name} "
            f"| ctx=4096 | threads={n_threads} | CPU-only | deterministic"
        )
    return _llm_instance


def format_llama3_prompt(system_prompt: str, user_prompt: str) -> str:
    """Build a strict Llama-3 instruction-template string."""
    return (
        "<|start_header_id|>system<|end_header_id|>\n\n"
        f"{system_prompt}<|eot_id|>"
        "<|start_header_id|>user<|end_header_id|>\n\n"
        f"{user_prompt}<|eot_id|>"
        "<|start_header_id|>assistant<|end_header_id|>\n\n"
    )


def generate(
    prompt: str,
    system_prompt: str = "You are a precise academic research assistant. Be concise and technical.",
    max_tokens: int = 512,
    force_json: bool = False,
) -> str:
    """
    Generate text with deterministic greedy decoding.
    temperature=0.0  →  fully reproducible output.
    top_k=1          →  always pick the highest-probability token.
    """
    llm = get_model()

    if force_json:
        system_prompt += (
            "\nYou MUST respond with valid JSON only. "
            "No markdown fences, no explanation outside the JSON object."
        )

    formatted = format_llama3_prompt(system_prompt, prompt)

    with _inference_lock:
        tokens = llm.tokenize(formatted.encode("utf-8"))
        max_allowed = 4096 - max_tokens - 32
        if len(tokens) > max_allowed:
            tokens = tokens[:max_allowed]
            formatted = llm.detokenize(tokens).decode("utf-8", errors="ignore")

        result = llm(
            formatted,
            max_tokens=max_tokens,
            temperature=0.0,
            top_k=1,
            top_p=1.0,
            repeat_penalty=1.0,
            stop=["<|eot_id|>", "<|end_of_text|>"],
            echo=False,
        )

    text = result["choices"][0]["text"].strip() if result.get("choices") else ""
    return text


def warmup():
    """Pre-load model into memory during server startup."""
    try:
        result = generate("Say 'ready'.", max_tokens=8)
        print(f"[OK] [SLM Engine] Warmup complete -> {result[:50]}")
        return True
    except Exception as e:
        print(f"[ERROR] [SLM Engine] Warmup failed: {e}")
        return False


def get_model_info() -> dict:
    """Return metadata about the loaded model."""
    return {
        "name": "llama-3.2-3b-instruct-q5km",
        "file": _MODEL_PATH.name,
        "engine": "llama-cpp-python",
        "device": "cpu",
        "context_length": 4096,
        "decoding": "greedy (temperature=0.0, top_k=1)",
        "threads": os.cpu_count() or 4,
        "loaded": _llm_instance is not None,
    }
