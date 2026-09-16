import asyncio
from sentence_transformers import SentenceTransformer

async def main():
    print("Loading SentenceTransformer...")
    model = SentenceTransformer("all-MiniLM-L6-v2")
    emb = model.encode(["This is a test sentence for RAG setup."])
    print(f"Embedding shape: {emb.shape}")
    print("Dependencies successfully installed and tested!")

if __name__ == "__main__":
    asyncio.run(main())
