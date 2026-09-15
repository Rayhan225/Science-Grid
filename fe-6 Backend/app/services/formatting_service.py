
from pathlib import Path
import re

import pymupdf

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib import colors


# =========================================================
# REGISTER TIMES NEW ROMAN
# =========================================================

windows_font = "C:/Windows/Fonts/times.ttf"
windows_font_bold = "C:/Windows/Fonts/timesbd.ttf"

if Path(windows_font).exists():
    pdfmetrics.registerFont(
        TTFont("TimesNewRoman", windows_font)
    )

if Path(windows_font_bold).exists():
    pdfmetrics.registerFont(
        TTFont("TimesNewRoman-Bold", windows_font_bold)
    )


# =========================================================
# EXTRACT PARAGRAPHS FROM PDF
# =========================================================

def extract_paragraphs(pdf_path: str):

    document = pymupdf.open(pdf_path)

    paragraphs = []

    for page in document:

        blocks = page.get_text("blocks")

        for block in blocks:

            text = block[4].strip()

            if not text:
                continue

            # Remove unnecessary line breaks
            text = re.sub(r"\s+", " ", text)

            paragraphs.append(text)

    document.close()

    return paragraphs


# =========================================================
# DETECT TITLE
# =========================================================

def is_title(text: str, index: int):

    if index > 2:
        return False

    if len(text) > 180:
        return False

    lower = text.lower()

    unwanted = [
        "abstract",
        "keywords",
        "introduction",
        "references",
        "doi:"
    ]

    if any(word in lower for word in unwanted):
        return False

    return True


# =========================================================
# DETECT AUTHOR
# =========================================================

def is_author(text: str):

    lower = text.lower()

    if (
        "corresponding author" in lower
        or "academy" in lower
        or "university" in lower
        or "department" in lower
        or "institute" in lower
    ):
        return False

    if "," in text and len(text) < 150:
        return True

    return False


# =========================================================
# DETECT HEADINGS
# =========================================================

def is_heading(text: str):

    lower = text.lower().strip()

    heading_patterns = [
        r"^\d+\.\s+.+",
        r"^\d+\.\s+[A-Za-z].+",
        r"^references$",
        r"^abstract:?$",
        r"^keywords?:?$"
    ]

    for pattern in heading_patterns:

        if re.match(
            pattern,
            text.strip(),
            re.IGNORECASE
        ):
            return True

    if lower.startswith("abstract"):
        return True

    if lower.startswith("keywords"):
        return True

    if lower == "references":
        return True

    return False


# =========================================================
# CHECK ABSTRACT
# =========================================================

def is_abstract(text: str):

    return text.lower().strip().startswith("abstract")


# =========================================================
# CHECK KEYWORDS
# =========================================================

def is_keywords(text: str):

    return text.lower().strip().startswith("keywords")


# =========================================================
# CREATE PARAGRAPH OBJECT
# =========================================================

def create_paragraph(
    text,
    font_name,
    font_size,
    bold=False,
    alignment=TA_LEFT,
    leading=None
):

    if leading is None:
        leading = font_size * 1.35

    # Select font
    if bold:

        if font_name == "TimesNewRoman":
            font = "TimesNewRoman-Bold"
        else:
            font = "Times-Roman"

    else:

        font = font_name

    style = ParagraphStyle(
        name="CustomParagraph",
        fontName=font,
        fontSize=font_size,
        leading=leading,
        alignment=alignment,
        textColor=colors.black,
        spaceAfter=0
    )

    # Escape HTML characters
    safe_text = (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )

    return Paragraph(
        safe_text,
        style
    )


# =========================================================
# MAIN FORMATTING FUNCTION
# =========================================================

def apply_publisher_format(
    pdf_path: str,
    publisher_format: dict
) -> str:

    input_path = Path(pdf_path)

    # =====================================================
    # PUBLISHER SETTINGS
    # =====================================================

    publisher = publisher_format.get(
        "citation_style",
        "Unknown"
    )

    font_name = publisher_format.get(
        "font",
        "Times New Roman"
    )

    font_size = publisher_format.get(
        "font_size",
        10
    )

    double_column = publisher_format.get(
        "double_column",
        False
    )

    # =====================================================
    # FONT
    # =====================================================

    if (
        font_name == "Times New Roman"
        and Path(windows_font).exists()
    ):

        selected_font = "TimesNewRoman"

    else:

        selected_font = "Times-Roman"

    # =====================================================
    # EXTRACT CONTENT
    # =====================================================

    paragraphs = extract_paragraphs(
        str(input_path)
    )

    if not paragraphs:

        raise ValueError(
            "No readable text found in PDF."
        )

    # =====================================================
    # OUTPUT PATH
    # =====================================================

    output_path = (
        input_path.parent
        / f"{input_path.stem}_{publisher.lower()}_formatted.pdf"
    )

    # =====================================================
    # CREATE PDF
    # =====================================================

    page_width, page_height = A4

    pdf = canvas.Canvas(
        str(output_path),
        pagesize=A4
    )

    pdf.setTitle(
        f"{input_path.stem} - {publisher} Format"
    )

    # =====================================================
    # MARGINS
    # =====================================================

    margin_left = 55
    margin_right = 55
    margin_top = 55
    margin_bottom = 55

    # =====================================================
    # COLUMN SETUP
    # =====================================================

    if double_column:

        column_gap = 20

        available_width = (
            page_width
            - margin_left
            - margin_right
            - column_gap
        )

        column_width = (
            available_width / 2
        )

        columns = [
            margin_left,
            margin_left
            + column_width
            + column_gap
        ]

    else:

        column_width = (
            page_width
            - margin_left
            - margin_right
        )

        columns = [
            margin_left
        ]

    # =====================================================
    # PAGE / COLUMN STATE
    # =====================================================

    current_column = 0

    x = columns[current_column]

    y = page_height - margin_top

    page_number = 1

    # =====================================================
    # PAGE NUMBER
    # =====================================================

    def draw_page_number():

        pdf.setFont(
            selected_font,
            9
        )

        pdf.drawCentredString(
            page_width / 2,
            25,
            str(page_number)
        )

    # =====================================================
    # MOVE TO NEXT COLUMN / PAGE
    # =====================================================

    def move_to_next_column():

        nonlocal current_column
        nonlocal x
        nonlocal y
        nonlocal page_number

        # -------------------------------------------------
        # DOUBLE COLUMN
        # -------------------------------------------------

        if double_column:

            # Column 1 -> Column 2
            if current_column == 0:

                current_column = 1

                x = columns[1]

                y = (
                    page_height
                    - margin_top
                )

                return

            # Column 2 -> New Page
            else:

                draw_page_number()

                pdf.showPage()

                page_number += 1

                current_column = 0

                x = columns[0]

                y = (
                    page_height
                    - margin_top
                )

                return

        # -------------------------------------------------
        # SINGLE COLUMN
        # -------------------------------------------------

        draw_page_number()

        pdf.showPage()

        page_number += 1

        current_column = 0

        x = columns[0]

        y = (
            page_height
            - margin_top
        )

    # =====================================================
    # DRAW PARAGRAPH SAFELY
    # =====================================================

    def draw_paragraph_safe(
        text,
        bold=False,
        alignment=TA_LEFT,
        size=None,
        leading=None,
        extra_space=6
    ):

        nonlocal y

        if not text.strip():
            return

        if size is None:
            size = font_size

        paragraph = create_paragraph(
            text=text,
            font_name=selected_font,
            font_size=size,
            bold=bold,
            alignment=alignment,
            leading=leading
        )

        # Calculate paragraph height
        required_width, required_height = (
            paragraph.wrap(
                column_width,
                1000
            )
        )

        # -------------------------------------------------
        # CHECK AVAILABLE SPACE BEFORE DRAWING
        # -------------------------------------------------

        available_height = (
            y - margin_bottom
        )

        if (
            required_height + extra_space
            > available_height
        ):

            move_to_next_column()

            # Recalculate after moving
            available_height = (
                y - margin_bottom
            )

        # -------------------------------------------------
        # DRAW
        # -------------------------------------------------

        paragraph.drawOn(
            pdf,
            x,
            y - required_height
        )

        y -= (
            required_height
            + extra_space
        )

    # =====================================================
    # START CONTENT
    # =====================================================

    title_found = False

    author_found = False

    for index, text in enumerate(paragraphs):

        text = text.strip()

        if not text:
            continue

        # -------------------------------------------------
        # REMOVE ORIGINAL PAGE NUMBERS
        # -------------------------------------------------

        if re.fullmatch(
            r"\d+",
            text
        ):
            continue

        # =================================================
        # TITLE
        # =================================================

        if (
            not title_found
            and is_title(text, index)
        ):

            draw_paragraph_safe(
                text=text,
                bold=True,
                alignment=TA_CENTER,
                size=font_size + 2,
                leading=(font_size + 2) * 1.25,
                extra_space=10
            )

            title_found = True

            continue

        # =================================================
        # AUTHORS
        # =================================================

        if (
            title_found
            and not author_found
        ):

            if len(text) < 180:

                draw_paragraph_safe(
                    text=text,
                    bold=False,
                    alignment=TA_CENTER,
                    size=font_size,
                    extra_space=6
                )

                author_found = True

                continue

        # =================================================
        # ABSTRACT
        # =================================================

        if is_abstract(text):

            # -------------------------------------------------
            # ABSTRACT WITH COLON
            # -------------------------------------------------

            if ":" in text:

                heading, content = (
                    text.split(":", 1)
                )

                draw_paragraph_safe(
                    text=heading.strip(),
                    bold=True,
                    alignment=TA_LEFT,
                    size=font_size,
                    extra_space=3
                )

                draw_paragraph_safe(
                    text=content.strip(),
                    bold=False,
                    alignment=TA_LEFT,
                    size=font_size,
                    extra_space=8
                )

            # -------------------------------------------------
            # ABSTRACT WITHOUT COLON
            # -------------------------------------------------

            else:

                draw_paragraph_safe(
                    text="Abstract",
                    bold=True,
                    alignment=TA_LEFT,
                    size=font_size,
                    extra_space=4
                )

                remaining = re.sub(
                    r"^abstract\s*",
                    "",
                    text,
                    flags=re.IGNORECASE
                )

                if remaining.strip():

                    draw_paragraph_safe(
                        text=remaining.strip(),
                        bold=False,
                        alignment=TA_LEFT,
                        size=font_size,
                        extra_space=8
                    )

            continue

        # =================================================
        # KEYWORDS
        # =================================================

        if is_keywords(text):

            draw_paragraph_safe(
                text=text,
                bold=True,
                alignment=TA_LEFT,
                size=font_size,
                extra_space=10
            )

            continue

        # =================================================
        # SECTION HEADINGS
        # =================================================

        if is_heading(text):

            # Extra spacing before heading
            y -= 5

            draw_paragraph_safe(
                text=text,
                bold=True,
                alignment=TA_LEFT,
                size=font_size,
                extra_space=5
            )

            continue

        # =================================================
        # NORMAL PARAGRAPH
        # =================================================

        draw_paragraph_safe(
            text=text,
            bold=False,
            alignment=TA_LEFT,
            size=font_size,
            extra_space=8
        )

    # =====================================================
    # FINAL PAGE NUMBER
    # =====================================================

    draw_page_number()

    # =====================================================
    # SAVE PDF
    # =====================================================

    pdf.save()

    return str(output_path)

