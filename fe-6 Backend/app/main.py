from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

import tempfile
import os

from app.services.pdf_parser import (
    extract_text_from_pdf,
    extract_abstract
)

from app.services.publisher_service import (
    match_publishers,
    create_distribution_matrix,
    get_best_publisher
)

from app.services.formatting_service import (
    apply_publisher_format
)

from app.services.validation_service import (
    validate_formatted_pdf
)

class AbstractRequest(BaseModel):
    abstract: str


app = FastAPI(
    title="ScholarGrid Publisher API",
    description="Publisher Formatting and Distribution API",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# HOME
# =========================================================

@app.get("/")
def home():

    return {
        "message": "ScholarGrid Backend is Running",
        "feature": "Publisher Formatting & Distribution Matrix"
    }
@app.post("/match-abstract")
async def match_abstract(request: AbstractRequest):
    abstract = request.abstract.strip()

    if not abstract:
        raise HTTPException(
            status_code=400,
            detail="Abstract cannot be empty."
        )

    publisher_results = match_publishers(abstract)

    if not publisher_results:
        raise HTTPException(
            status_code=404,
            detail="No suitable publisher found."
        )

    recommended_publisher = get_best_publisher(publisher_results)
    distribution_matrix = create_distribution_matrix(publisher_results)

    return {
        "abstract": abstract,
        "recommended_publisher": recommended_publisher,
        "publisher_matches": publisher_results,
        "distribution_matrix": distribution_matrix
    }


# =========================================================
# ANALYZE PAPER
# =========================================================

@app.post("/analyze-paper")
async def analyze_paper(
    file: UploadFile = File(...)
):

    if not file.filename.lower().endswith(".pdf"):

        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed."
        )

    temp_path = None

    try:

        # -------------------------------------------------
        # Read uploaded PDF
        # -------------------------------------------------

        file_content = await file.read()

        # -------------------------------------------------
        # Create temporary PDF
        # -------------------------------------------------

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".pdf"
        ) as temp_file:

            temp_file.write(file_content)
            temp_path = temp_file.name

        # -------------------------------------------------
        # Extract text
        # -------------------------------------------------

        full_text = extract_text_from_pdf(
            temp_path
        )

        if not full_text.strip():

            raise HTTPException(
                status_code=400,
                detail="No readable text found in the PDF."
            )

        # -------------------------------------------------
        # Extract abstract
        # -------------------------------------------------

        abstract = extract_abstract(
            full_text
        )

        if not abstract.strip():

            raise HTTPException(
                status_code=400,
                detail="No abstract found in the PDF."
            )

        # -------------------------------------------------
        # Match publishers
        # -------------------------------------------------

        publisher_results = match_publishers(
            abstract
        )

        if not publisher_results:

            raise HTTPException(
                status_code=404,
                detail="No suitable publisher found."
            )

        # -------------------------------------------------
        # Get best publisher
        # -------------------------------------------------

        recommended_publisher = get_best_publisher(
            publisher_results
        )

        # -------------------------------------------------
        # Create distribution matrix
        # -------------------------------------------------

        distribution_matrix = create_distribution_matrix(
            publisher_results
        )

        # -------------------------------------------------
        # Final response
        # -------------------------------------------------

        return {

            "filename": file.filename,

            "abstract": abstract,

            "recommended_publisher":
                recommended_publisher,

            "distribution_matrix":
                distribution_matrix,

            "publisher_matches":
                publisher_results
        }

    except HTTPException:

        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )

    finally:

        if (
            temp_path
            and os.path.exists(temp_path)
        ):

            os.remove(temp_path)


# =========================================================
# FORMAT PAPER - AUTOMATIC BEST PUBLISHER
# =========================================================

@app.post("/format-paper")
async def format_paper(
    file: UploadFile = File(...)
):

    if not file.filename.lower().endswith(".pdf"):

        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed."
        )

    temp_path = None
    formatted_path = None

    try:

        # -------------------------------------------------
        # Read uploaded PDF
        # -------------------------------------------------

        file_content = await file.read()

        # -------------------------------------------------
        # Create temporary PDF
        # -------------------------------------------------

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".pdf"
        ) as temp_file:

            temp_file.write(file_content)
            temp_path = temp_file.name

        # -------------------------------------------------
        # Extract text
        # -------------------------------------------------

        full_text = extract_text_from_pdf(
            temp_path
        )

        if not full_text.strip():

            raise HTTPException(
                status_code=400,
                detail="No readable text found in the PDF."
            )

        # -------------------------------------------------
        # Extract abstract
        # -------------------------------------------------

        abstract = extract_abstract(
            full_text
        )

        if not abstract.strip():

            raise HTTPException(
                status_code=400,
                detail="No abstract found in the PDF."
            )

        # -------------------------------------------------
        # Match publishers
        # -------------------------------------------------

        publisher_results = match_publishers(
            abstract
        )

        if not publisher_results:

            raise HTTPException(
                status_code=404,
                detail="No publisher match found."
            )

        # -------------------------------------------------
        # Get best publisher
        # -------------------------------------------------

        recommended_publisher = get_best_publisher(
            publisher_results
        )

        # -------------------------------------------------
        # Get formatting rules
        # -------------------------------------------------

        publisher_format = (
            recommended_publisher["format"]
        )

        # -------------------------------------------------
        # Apply formatting
        # -------------------------------------------------

        formatted_path = apply_publisher_format(
            temp_path,
            publisher_format
        )

        # -------------------------------------------------
        # Check formatted PDF
        # -------------------------------------------------

        if not formatted_path:

            raise HTTPException(
                status_code=500,
                detail="Formatted PDF was not created."
            )

        if not os.path.exists(formatted_path):

            raise HTTPException(
                status_code=500,
                detail="Formatted PDF file not found."
            )

        # -------------------------------------------------
        # Validate formatted PDF
        # -------------------------------------------------

        validation_result = validate_formatted_pdf(
            formatted_path,
            publisher_format
        )

        # -------------------------------------------------
        # Return formatted PDF
        # -------------------------------------------------

        return FileResponse(

            path=formatted_path,

            media_type="application/pdf",

            filename=(
                f"{os.path.splitext(file.filename)[0]}"
                "_formatted.pdf"
            )
        )

    except HTTPException:

        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Formatting failed: {str(e)}"
        )

    finally:

        if (
            temp_path
            and os.path.exists(temp_path)
        ):

            os.remove(temp_path)


# =========================================================
# FORMAT PAPER BY SELECTED PUBLISHER
# =========================================================

@app.post("/format-paper-by-publisher")
async def format_paper_by_publisher(
    publisher_name: str,
    file: UploadFile = File(...)
):

    if not file.filename.lower().endswith(".pdf"):

        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed."
        )

    temp_path = None
    formatted_path = None

    try:

        # -------------------------------------------------
        # Read uploaded PDF
        # -------------------------------------------------

        file_content = await file.read()

        # -------------------------------------------------
        # Create temporary PDF
        # -------------------------------------------------

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".pdf"
        ) as temp_file:

            temp_file.write(file_content)
            temp_path = temp_file.name

        # -------------------------------------------------
        # Extract text
        # -------------------------------------------------

        full_text = extract_text_from_pdf(
            temp_path
        )

        if not full_text.strip():

            raise HTTPException(
                status_code=400,
                detail="No readable text found in the PDF."
            )

        # -------------------------------------------------
        # Extract abstract
        # -------------------------------------------------

        abstract = extract_abstract(
            full_text
        )

        if not abstract.strip():

            raise HTTPException(
                status_code=400,
                detail="No abstract found in the PDF."
            )

        # -------------------------------------------------
        # Match publishers
        # -------------------------------------------------

        publisher_results = match_publishers(
            abstract
        )

        if not publisher_results:

            raise HTTPException(
                status_code=404,
                detail="No publisher data found."
            )

        # -------------------------------------------------
        # Find selected publisher
        # -------------------------------------------------

        selected_publisher = None

        for publisher in publisher_results:

            if (
                publisher["publisher"].strip().lower()
                == publisher_name.strip().lower()
            ):

                selected_publisher = publisher
                break

        # -------------------------------------------------
        # Publisher not found
        # -------------------------------------------------

        if selected_publisher is None:

            available_publishers = [
                publisher["publisher"]
                for publisher in publisher_results
            ]

            raise HTTPException(
                status_code=404,
                detail=(
                    f"Publisher '{publisher_name}' not found. "
                    f"Available publishers: "
                    f"{', '.join(available_publishers)}"
                )
            )

        # -------------------------------------------------
        # Get selected publisher format
        # -------------------------------------------------

        publisher_format = (
            selected_publisher["format"]
        )

        # -------------------------------------------------
        # Apply selected publisher format
        # -------------------------------------------------

        formatted_path = apply_publisher_format(
            temp_path,
            publisher_format
        )

        # -------------------------------------------------
        # Check output
        # -------------------------------------------------

        if not formatted_path:

            raise HTTPException(
                status_code=500,
                detail="Formatted PDF was not created."
            )

        if not os.path.exists(formatted_path):

            raise HTTPException(
                status_code=500,
                detail="Formatted PDF file not found."
            )

        # -------------------------------------------------
        # Validate formatted PDF
        # -------------------------------------------------

        validation_result = validate_formatted_pdf(
            formatted_path,
            publisher_format
        )

        # -------------------------------------------------
        # Safe publisher name
        # -------------------------------------------------

        safe_publisher_name = (
            selected_publisher["publisher"]
            .strip()
            .lower()
            .replace(" ", "_")
        )

        # -------------------------------------------------
        # Return formatted PDF
        # -------------------------------------------------

        return FileResponse(

            path=formatted_path,

            media_type="application/pdf",

            filename=(
                f"{os.path.splitext(file.filename)[0]}"
                f"_{safe_publisher_name}"
                "_formatted.pdf"
            )
        )

    except HTTPException:

        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                f"Publisher formatting failed: "
                f"{str(e)}"
            )
        )

    finally:

        if (
            temp_path
            and os.path.exists(temp_path)
        ):

            os.remove(temp_path)


# =========================================================
# VALIDATE FORMATTED PDF
# =========================================================

@app.post("/validate-formatted-paper")
async def validate_formatted_paper(
    file: UploadFile = File(...),
    publisher_name: str = "IEEE"
):

    if not file.filename.lower().endswith(".pdf"):

        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed."
        )

    temp_path = None

    try:

        # -------------------------------------------------
        # Read uploaded PDF
        # -------------------------------------------------

        file_content = await file.read()

        # -------------------------------------------------
        # Create temporary PDF
        # -------------------------------------------------

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".pdf"
        ) as temp_file:

            temp_file.write(file_content)
            temp_path = temp_file.name

        # -------------------------------------------------
        # Extract text
        # -------------------------------------------------

        full_text = extract_text_from_pdf(
            temp_path
        )

        if not full_text.strip():

            raise HTTPException(
                status_code=400,
                detail="No readable text found in the PDF."
            )

        # -------------------------------------------------
        # Extract abstract
        # -------------------------------------------------

        abstract = extract_abstract(
            full_text
        )

        # -------------------------------------------------
        # Match publisher
        # -------------------------------------------------

        publisher_results = match_publishers(
            abstract
        )

        if not publisher_results:

            raise HTTPException(
                status_code=404,
                detail="No publisher data found."
            )

        # -------------------------------------------------
        # Find selected publisher
        # -------------------------------------------------

        selected_publisher = None

        for publisher in publisher_results:

            if (
                publisher["publisher"].strip().lower()
                == publisher_name.strip().lower()
            ):

                selected_publisher = publisher
                break

        # -------------------------------------------------
        # Publisher not found
        # -------------------------------------------------

        if selected_publisher is None:

            available_publishers = [
                p["publisher"]
                for p in publisher_results
            ]

            raise HTTPException(
                status_code=404,
                detail=(
                    f"Publisher '{publisher_name}' not found. "
                    f"Available publishers: "
                    f"{', '.join(available_publishers)}"
                )
            )

        # -------------------------------------------------
        # Get publisher format
        # -------------------------------------------------

        publisher_format = (
            selected_publisher["format"]
        )

        # -------------------------------------------------
        # Validate PDF
        # -------------------------------------------------

        validation_result = validate_formatted_pdf(
            temp_path,
            publisher_format
        )

        # -------------------------------------------------
        # Final response
        # -------------------------------------------------

        return {

            "filename": file.filename,

            "publisher":
                selected_publisher["publisher"],

            "publisher_format":
                publisher_format,

            "validation":
                validation_result
        }

    except HTTPException:

        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                f"Validation failed: "
                f"{str(e)}"
            )
        )

    finally:

        if (
            temp_path
            and os.path.exists(temp_path)
        ):

            os.remove(temp_path)

    



