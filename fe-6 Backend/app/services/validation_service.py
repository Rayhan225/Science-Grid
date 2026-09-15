import os
import re
import pymupdf


# =========================================================
# VALIDATION SERVICE
# ScholarGrid Layer 6
# =========================================================


# ---------------------------------------------------------
# Extract PDF information
# ---------------------------------------------------------

def inspect_pdf(pdf_path: str):

    if not os.path.exists(pdf_path):
        raise FileNotFoundError(
            f"PDF file not found: {pdf_path}"
        )

    document = pymupdf.open(pdf_path)

    pages = len(document)

    full_text = ""
    fonts = []
    font_sizes = []
    page_columns = []

    for page in document:

        # ---------------------------------------------
        # Extract text
        # ---------------------------------------------

        full_text += page.get_text() + "\n"

        # ---------------------------------------------
        # Extract font information
        # ---------------------------------------------

        page_dict = page.get_text("dict")

        for block in page_dict.get("blocks", []):

            if "lines" not in block:
                continue

            for line in block["lines"]:

                for span in line.get("spans", []):

                    font_name = span.get("font")
                    font_size = span.get("size")

                    if font_name:
                        fonts.append(font_name)

                    if font_size:
                        font_sizes.append(
                            round(font_size, 2)
                        )

        # ---------------------------------------------
        # Detect columns
        # ---------------------------------------------

        page_columns.append(
            detect_page_columns(page)
        )

    document.close()

    return {
        "pages": pages,
        "text": full_text,
        "fonts": fonts,
        "font_sizes": font_sizes,
        "page_columns": page_columns
    }


# ---------------------------------------------------------
# Detect columns on a single page
# ---------------------------------------------------------

def detect_page_columns(page):

    page_width = page.rect.width

    text_blocks = page.get_text("blocks")

    left_blocks = 0
    right_blocks = 0

    middle_blocks = 0

    # Ignore header/footer area
    top_limit = page.rect.height * 0.12
    bottom_limit = page.rect.height * 0.90

    for block in text_blocks:

        if len(block) < 5:
            continue

        x0, y0, x1, y1 = block[:4]

        text = block[4].strip()

        if not text:
            continue

        # Ignore header/footer
        if y1 < top_limit:
            continue

        if y0 > bottom_limit:
            continue

        block_width = x1 - x0

        # Ignore very wide blocks
        if block_width > page_width * 0.70:
            continue

        center_x = (x0 + x1) / 2

        # ---------------------------------------------
        # Left column
        # ---------------------------------------------

        if center_x < page_width * 0.48:

            left_blocks += 1

        # ---------------------------------------------
        # Right column
        # ---------------------------------------------

        elif center_x > page_width * 0.52:

            right_blocks += 1

        else:

            middle_blocks += 1

    # ---------------------------------------------
    # Two-column decision
    # ---------------------------------------------

    if (
        left_blocks >= 2
        and right_blocks >= 2
    ):

        return 2

    # ---------------------------------------------
    # Alternative detection
    # ---------------------------------------------

    if (
        left_blocks >= 1
        and right_blocks >= 1
        and (left_blocks + right_blocks) >= 4
    ):

        return 2

    return 1


# ---------------------------------------------------------
# Check title
# ---------------------------------------------------------

def validate_title(text: str):

    lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip()
    ]

    if not lines:

        return {
            "passed": False,
            "message": "Title not found."
        }

    # Find a meaningful title
    title = None

    for line in lines[:10]:

        lower = line.lower()

        if (
            lower.startswith("abstract")
            or lower.startswith("keywords")
            or lower.startswith("index terms")
        ):
            continue

        if len(line) >= 5:

            title = line
            break

    if not title:

        return {
            "passed": False,
            "message": "Title not found."
        }

    if len(title) < 5:

        return {
            "passed": False,
            "message": "Title appears too short."
        }

    return {
        "passed": True,
        "message": "Title detected.",
        "title": title
    }


# ---------------------------------------------------------
# Check authors
# ---------------------------------------------------------

def validate_authors(text: str):

    lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip()
    ]

    if len(lines) < 2:

        return {
            "passed": False,
            "message": "Author information not detected."
        }

    for line in lines[1:8]:

        lower = line.lower()

        if (
            "abstract" in lower
            or "keywords" in lower
        ):
            continue

        if "," in line:

            return {
                "passed": True,
                "message": "Author information detected."
            }

    return {
        "passed": False,
        "message": "Author information may be missing."
    }


# ---------------------------------------------------------
# Check abstract
# ---------------------------------------------------------

def validate_abstract(text: str):

    if re.search(
        r"\babstract\b",
        text,
        re.IGNORECASE
    ):

        return {
            "passed": True,
            "message": "Abstract section detected."
        }

    return {
        "passed": False,
        "message": "Abstract section not found."
    }


# ---------------------------------------------------------
# Check keywords
# ---------------------------------------------------------

def validate_keywords(text: str):

    if re.search(
        r"\bkeywords?\b",
        text,
        re.IGNORECASE
    ):

        return {
            "passed": True,
            "message": "Keywords section detected."
        }

    return {
        "passed": False,
        "message": "Keywords section not found."
    }


# ---------------------------------------------------------
# Check references
# ---------------------------------------------------------

def validate_references(text: str):

    if re.search(
        r"\breferences\b",
        text,
        re.IGNORECASE
    ):

        return {
            "passed": True,
            "message": "References section detected."
        }

    return {
        "passed": False,
        "message": "References section not found."
    }


# ---------------------------------------------------------
# Validate font
# ---------------------------------------------------------

def validate_font(
    fonts,
    expected_font="Times New Roman"
):

    if not fonts:

        return {
            "passed": False,
            "message": "No font information detected."
        }

    expected = expected_font.lower()

    for font in fonts:

        font_lower = font.lower()

        if (
            expected in font_lower
            or "times" in font_lower
        ):

            return {
                "passed": True,
                "message": (
                    f"Expected font '{expected_font}' "
                    "detected."
                )
            }

    return {
        "passed": False,
        "message": (
            f"Expected font '{expected_font}' "
            "was not detected."
        )
    }


# ---------------------------------------------------------
# Validate font size
# ---------------------------------------------------------

def validate_font_size(
    font_sizes,
    expected_size
):

    if not font_sizes:

        return {
            "passed": False,
            "message": "No font size information detected."
        }

    tolerance = 0.5

    matching_sizes = [

        size
        for size in font_sizes

        if abs(
            size - expected_size
        ) <= tolerance
    ]

    if matching_sizes:

        return {
            "passed": True,
            "message": (
                f"Expected font size "
                f"{expected_size} detected."
            )
        }

    return {
        "passed": False,
        "message": (
            f"Expected font size "
            f"{expected_size} not detected."
        )
    }


# ---------------------------------------------------------
# Validate columns
# ---------------------------------------------------------

def validate_columns(
    page_columns,
    expected_double_column
):

    expected_columns = (
        2
        if expected_double_column
        else 1
    )

    if not page_columns:

        return {
            "passed": False,
            "message": "Column information unavailable.",
            "expected_columns": expected_columns
        }

    correct_pages = sum(
        1
        for columns in page_columns
        if columns == expected_columns
    )

    total_pages = len(page_columns)

    percentage = (
        correct_pages / total_pages
    ) * 100

    # ---------------------------------------------
    # 70% or more = PASS
    # ---------------------------------------------

    if percentage >= 70:

        return {
            "passed": True,
            "message": (
                f"Column layout appears correct "
                f"on {percentage:.1f}% of pages."
            ),
            "expected_columns": expected_columns
        }

    return {
        "passed": False,
        "message": (
            f"Expected {expected_columns} column(s), "
            f"but validation matched only "
            f"{percentage:.1f}% of pages."
        ),
        "expected_columns": expected_columns
    }


# ---------------------------------------------------------
# Main validation function
# ---------------------------------------------------------

def validate_formatted_pdf(
    pdf_path: str,
    publisher_format: dict
):

    pdf_info = inspect_pdf(
        pdf_path
    )

    text = pdf_info["text"]

    expected_font = publisher_format.get(
        "font",
        "Times New Roman"
    )

    expected_font_size = publisher_format.get(
        "font_size",
        10
    )

    expected_double_column = publisher_format.get(
        "double_column",
        False
    )

    # -----------------------------------------------------
    # Individual validations
    # -----------------------------------------------------

    title_result = validate_title(
        text
    )

    author_result = validate_authors(
        text
    )

    abstract_result = validate_abstract(
        text
    )

    keywords_result = validate_keywords(
        text
    )

    references_result = validate_references(
        text
    )

    font_result = validate_font(
        pdf_info["fonts"],
        expected_font
    )

    font_size_result = validate_font_size(
        pdf_info["font_sizes"],
        expected_font_size
    )

    column_result = validate_columns(
        pdf_info["page_columns"],
        expected_double_column
    )

    # -----------------------------------------------------
    # All checks
    # -----------------------------------------------------

    checks = [

        title_result,
        author_result,
        abstract_result,
        keywords_result,
        references_result,
        font_result,
        font_size_result,
        column_result

    ]

    passed_checks = sum(
        1
        for check in checks
        if check["passed"]
    )

    total_checks = len(checks)

    validation_score = round(
        (
            passed_checks
            / total_checks
        ) * 100,
        2
    )

    # -----------------------------------------------------
    # Overall status
    # -----------------------------------------------------

    if validation_score >= 80:

        status = "PASS"

    elif validation_score >= 60:

        status = "WARNING"

    else:

        status = "FAIL"

    # -----------------------------------------------------
    # Final result
    # -----------------------------------------------------

    return {

        "validation_status": status,

        "validation_score": validation_score,

        "passed_checks": passed_checks,

        "total_checks": total_checks,

        "checks": {

            "title": title_result,

            "authors": author_result,

            "abstract": abstract_result,

            "keywords": keywords_result,

            "references": references_result,

            "font": font_result,

            "font_size": font_size_result,

            "columns": column_result

        },

        "pdf_info": {

            "pages": pdf_info["pages"],

            "detected_fonts": list(
                set(pdf_info["fonts"])
            ),

            "detected_font_sizes": sorted(
                list(
                    set(
                        pdf_info["font_sizes"]
                    )
                )
            ),

            "detected_columns_per_page":
                pdf_info["page_columns"]
        }

    }