# server/slm_engine.py
# ═══════════════════════════════════════════════════════════════════
# SLM Engine — Local Llama-3.2-3B-Instruct via llama-cpp-python
# Zero-network, CPU-only, deterministic greedy decoding
# ═══════════════════════════════════════════════════════════════════
import os
import json
import threading
from typing import List, Optional, Dict, Any
from pathlib import Path

try:
    from llama_cpp import Llama, LlamaRAMCache
except ImportError:
    Llama = None
    LlamaRAMCache = None
    print("[WARN] [SLM Engine] llama-cpp-python not installed. Run: pip install llama-cpp-python")

# ── Model path resolution ──
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
_CANDIDATE_PATHS = [
    _PROJECT_ROOT / "models" / "llama-3.2-3b-instruct.Q5_K_M.gguf",
    Path("E:/Downloads/Llama-3.2-3B-Instruct.Q5_K_M.gguf"),
    Path("E:/Science Grid - Copy - Copy/living-science-grid/models/llama-3.2-3b-instruct.Q5_K_M.gguf"),
    Path("E:/Science-Grid/living-science-grid/models/llama-3.2-3b-instruct.Q5_K_M.gguf"),
]

def resolve_model_path() -> Path:
    """Find the GGUF model across candidate project and local storage paths."""
    for p in _CANDIDATE_PATHS:
        try:
            if p.exists() and p.stat().st_size > 1_000_000_000:
                return p
        except Exception:
            pass
    return _CANDIDATE_PATHS[0]

def get_optimal_threads() -> int:
    """
    Calculate optimal thread count for llama.cpp on AMD Zen/Intel CPUs.
    Using logical threads (hyperthreads) on SMT CPUs causes severe cache line contention.
    Physical cores (e.g. 8 on Ryzen 7 5800U) maximize AVX2 throughput.
    """
    total = os.cpu_count() or 4
    physical = total // 2 if total > 4 else total
    return max(2, min(8, physical))

# Singleton instance & thread-safety lock
_llm_instance = None
_inference_lock = threading.Lock()


def get_model():
    """Load and return the singleton LLM instance with hardware-tuned settings."""
    global _llm_instance
    if _llm_instance is None:
        if Llama is None:
            raise RuntimeError(
                "llama-cpp-python is not installed. "
                "Run: pip install llama-cpp-python"
            )
        resolved_path = resolve_model_path()
        if not resolved_path.exists():
            raise FileNotFoundError(
                f"Model file not found: {resolved_path}\n"
                f"Checked candidate locations: {[str(p) for p in _CANDIDATE_PATHS]}"
            )

        n_threads = get_optimal_threads()
        _llm_instance = Llama(
            model_path=str(resolved_path),
            n_ctx=2048,
            n_batch=512,
            n_threads=n_threads,
            n_threads_batch=n_threads,
            n_gpu_layers=0,       # CPU-only AVX2
            verbose=False,
            seed=42,              # Reproducibility
            use_mmap=True,
        )

        if LlamaRAMCache is not None:
            try:
                # 256MB RAM cache for prompt prefix KV states
                cache = LlamaRAMCache(capacity_bytes=256 * 1024 * 1024)
                _llm_instance.set_cache(cache)
                print("[OK] [SLM Engine] Attached 256MB LlamaRAMCache for prefix reuse.")
            except Exception as cache_err:
                print(f"[WARN] [SLM Engine] Could not attach LlamaRAMCache: {cache_err}")

        print(
            f"[OK] [SLM Engine] Loaded {resolved_path.name} "
            f"| ctx=2048 | batch=512 | threads={n_threads} | AVX2 CPU | deterministic"
        )
    return _llm_instance


def format_llama3_prompt(
    system_prompt: str,
    user_prompt: Optional[str] = None,
    messages: Optional[List[dict]] = None
) -> str:
    """
    Build a strict Meta Llama-3 instruction-template string.
    BOS token is added by llama-cpp tokenizer.
    """
    prompt_str = "<|start_header_id|>system<|end_header_id|>\n\n"
    prompt_str += f"{system_prompt.strip()}<|eot_id|>"

    # Handle multi-turn dialogue history if provided
    if messages:
        for m in messages:
            role = m.get("role", "user")
            content = m.get("content", "").strip()
            if role not in ("system", "user", "assistant") or not content:
                continue
            if role == "system":
                continue  # System prompt already added
            prompt_str += f"<|start_header_id|>{role}<|end_header_id|>\n\n{content}<|eot_id|>"

    # Append current user prompt if provided
    if user_prompt:
        prompt_str += f"<|start_header_id|>user<|end_header_id|>\n\n{user_prompt.strip()}<|eot_id|>"

    # Open assistant turn
    prompt_str += "<|start_header_id|>assistant<|end_header_id|>\n\n"
    return prompt_str


def generate(
    prompt: Optional[str] = None,
    system_prompt: str = "You are a precise academic research assistant. Be concise, mathematically rigorous, and technical.",
    messages: Optional[List[dict]] = None,
    max_tokens: int = 512,
    temperature: float = 0.1,
    top_p: float = 0.95,
    force_json: bool = False,
) -> str:
    """
    Generate text with tailored analytical decoding for academic reasoning.
    temperature=0.0 when force_json=True for strict deterministic JSON schemas.
    temperature=0.1 for grounded reasoning with minimal hallucination risk.
    """
    llm = get_model()

    if force_json:
        system_prompt += (
            "\nYou MUST respond with valid JSON only. "
            "No markdown fences, no explanation outside the JSON object."
        )
        temperature = 0.0
        top_k = 1
        top_p = 1.0
    else:
        top_k = 40

    formatted = format_llama3_prompt(system_prompt, user_prompt=prompt, messages=messages)

    with _inference_lock:
        tokens = llm.tokenize(formatted.encode("utf-8"))
        # Native 2048 context window: leave at least max_tokens for response
        max_allowed_input = 2048 - max_tokens - 32
        if len(tokens) > max_allowed_input:
            tokens = tokens[:max_allowed_input]
            formatted = llm.detokenize(tokens).decode("utf-8", errors="ignore")

        result = llm(
            formatted,
            max_tokens=max_tokens,
            temperature=temperature,
            top_k=top_k,
            top_p=top_p,
            repeat_penalty=1.05,
            stop=["<|eot_id|>", "<|end_of_text|>", "<|start_header_id|>"],
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
    active_path = resolve_model_path()
    return {
        "name": "llama-3.2-3b-instruct-q5km",
        "file": active_path.name,
        "path": str(active_path),
        "engine": "llama-cpp-python",
        "device": "cpu-avx2",
        "context_length": 2048,
        "batch_size": 512,
        "decoding": "greedy analytical",
        "threads": get_optimal_threads(),
        "ram_cache_enabled": LlamaRAMCache is not None,
        "loaded": _llm_instance is not None,
    }
