import pymupdf


def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extract all text from a PDF file.
    """

    document = pymupdf.open(pdf_path)

    full_text = ""

    for page in document:
        full_text += page.get_text()

    document.close()

    return full_text


def extract_abstract(text: str) -> str:
    """
    Extract the abstract section from the extracted PDF text.
    """

    text_lower = text.lower()

    start = text_lower.find("abstract")

    if start == -1:
        return "Abstract not found."

    remaining_text = text[start + len("abstract"):]

    end_keywords = [
        "introduction",
        "keywords",
        "1. introduction",
        "i. introduction"
    ]

    end_positions = []

    remaining_lower = remaining_text.lower()

    for keyword in end_keywords:
        position = remaining_lower.find(keyword)

        if position != -1:
            end_positions.append(position)

    if end_positions:
        end = min(end_positions)
        abstract = remaining_text[:end]
    else:
        abstract = remaining_text[:3000]

    abstract = abstract.strip()

    if abstract.startswith(":"):
        abstract = abstract[1:].strip()

    return abstract