# setup_ollama.py — DEPRECATED
# ═══════════════════════════════════════════════════════════════════
# Ollama has been replaced by llama-cpp-python (server/slm_engine.py).
# The local LLM is now initialized automatically on server startup.
# ═══════════════════════════════════════════════════════════════════

import sys

print("⚠️  setup_ollama.py is DEPRECATED.")
print("   The local LLM (Llama-3.2-3B-Instruct Q5_K_M) is now loaded")
print("   automatically via llama-cpp-python when research_brain/main.py starts.")
print()
print("   Engine module:  server/slm_engine.py")
print("   Model file:     models/llama-3.2-3b-instruct.Q5_K_M.gguf")
print()
print("   To manually warm up the model:")
print('   python -c "import sys; sys.path.insert(0, \'server\'); import slm_engine; slm_engine.warmup()"')