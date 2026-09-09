# setup_ollama.py
import os
import subprocess
import json
import urllib.request
import urllib.error

FAST_MODEL = "llama3"

def run_command(command):
    try:
        subprocess.run(command, check=True, shell=True)
    except subprocess.CalledProcessError as e:
        print(f"Command failed: {e}")

def setup():
    print("[*] Configuring Ollama environment variables for maximum throughput...")
    os.environ["OLLAMA_FLASH_ATTENTION"] = "1"
    os.environ["OLLAMA_KV_CACHE_TYPE"] = "q8_0"
    os.environ["OLLAMA_KEEP_ALIVE"] = "-1"

    print(f"[*] Ensuring model '{FAST_MODEL}' is downloaded...")
    run_command(f"ollama pull {FAST_MODEL}")

    print("[*] Warming up model in VRAM/Memory to eliminate load latency...")
    url = "http://localhost:11434/api/generate"
    payload = {
        "model": FAST_MODEL,
        "prompt": "warmup",
        "stream": False,
        "options": {"num_ctx": 512}
    }
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    
    try:
        with urllib.request.urlopen(req, timeout=15.0) as response:
            if response.status == 200:
                print("[+] Ollama setup completed successfully! Model is hot and ready.")
            else:
                print("[-] Warning: Warmup request returned non-200 status.")
    except urllib.error.URLError as e:
        print(f"[-] Could not connect to Ollama server at {url}. Make sure 'ollama serve' is running. Error: {e.reason}")
    except Exception as e:
        print(f"[-] Error during warmup: {e}")

if __name__ == "__main__":
    setup()