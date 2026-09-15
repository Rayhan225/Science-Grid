from fastapi import FastAPI, UploadFile, File, HTTPException
import tempfile
import os

from app.services.pdf_parser import extract_text_from_pdf, extract_abstract
from app.services.publisher_service import match_publishers


app = FastAPI(
    title="ScholarGrid Publisher API",
    description="Publisher Formatting and Distribution API",
    version="1.0.0"
)


@app.get("/")
def home():
    return {
        "message": "ScholarGrid Backend is Running",
        "feature": "Publisher Formatting & Distribution Matrix"
    }


@app.post("/analyze-paper")
async def analyze_paper(file: UploadFile = File(...)):

    # Check PDF file
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed."
        )

    temp_path = None

    try:
        # Read uploaded file
        file_content = await file.read()

        # Create temporary PDF file
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".pdf"
        ) as temp_file:

            temp_file.write(file_content)
            temp_path = temp_file.name

        # Extract text from PDF
        full_text = extract_text_from_pdf(temp_path)

        if not full_text.strip():
            raise HTTPException(
                status_code=400,
                detail="No readable text found in the PDF."
            )

        # Extract abstract
        abstract = extract_abstract(full_text)

        # Match paper with publishers
        publisher_results = match_publishers(abstract)

        return {
            "filename": file.filename,
            "abstract": abstract,
            "publisher_matches": publisher_results
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )

    finally:
        # Delete temporary file
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)