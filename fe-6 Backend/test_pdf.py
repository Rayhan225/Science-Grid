from app.services.pdf_parser import (
    extract_text_from_pdf,
    extract_abstract
)

from app.services.embedding_service import create_embedding


pdf_path = "student_attention.pdf"


# Step 1: Extract text from PDF
text = extract_text_from_pdf(pdf_path)


# Step 2: Extract abstract
abstract = extract_abstract(text)


print("\n========== ABSTRACT ==========\n")
print(abstract)


# Step 3: Create embedding
embedding = create_embedding(abstract)


print("\n========== EMBEDDING ==========\n")
print("Embedding length:", len(embedding))

print("First 10 values:")
print(embedding[:10])