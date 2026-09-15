import json
import os
import re

from sentence_transformers import util

from app.services.embedding_service import create_embedding


# =========================================================
# Find publishers.json
# =========================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

PUBLISHERS_FILE = os.path.join(
    BASE_DIR,
    "data",
    "publishers.json"
)


# =========================================================
# Load Publishers
# =========================================================

def load_publishers():

    if not os.path.exists(PUBLISHERS_FILE):
        raise FileNotFoundError(
            "publishers.json not found."
        )

    with open(
        PUBLISHERS_FILE,
        "r",
        encoding="utf-8"
    ) as file:

        return json.load(file)


# =========================================================
# Semantic Similarity
# =========================================================

def calculate_similarity(
    text1: str,
    text2: str
) -> float:

    if not text1.strip() or not text2.strip():
        return 0.0

    embedding1 = create_embedding(text1)
    embedding2 = create_embedding(text2)

    score = util.cos_sim(
        embedding1,
        embedding2
    ).item()

    return float(score)


# =========================================================
# Keyword Matching
# =========================================================

def calculate_keyword_score(
    paper_text: str,
    keywords: list
) -> float:

    """
    Calculate how many publisher keywords
    appear in the research paper.
    """

    if not paper_text or not keywords:
        return 0.0

    # Convert paper to lowercase
    paper_text = paper_text.lower()

    # Clean punctuation
    paper_text = re.sub(
        r"[^a-z0-9\s]",
        " ",
        paper_text
    )

    matched_keywords = 0

    for keyword in keywords:

        keyword = keyword.lower().strip()

        if keyword in paper_text:
            matched_keywords += 1

    score = (
        matched_keywords / len(keywords)
    )

    return float(score)


# =========================================================
# Hybrid Score
# =========================================================

def calculate_final_score(
    semantic_score: float,
    keyword_score: float
) -> float:

    """
    Final publisher score.

    Semantic similarity = 70%
    Keyword matching    = 30%
    """

    final_score = (
        semantic_score * 0.70
        +
        keyword_score * 0.30
    )

    return round(
        final_score,
        4
    )


# =========================================================
# Match Publishers
# =========================================================

def match_publishers(
    paper_text: str
):

    """
    Match research paper with publishers
    using semantic similarity + keywords.
    """

    if not paper_text or not paper_text.strip():
        return []

    publishers = load_publishers()

    results = []

    for publisher in publishers:

        # -------------------------------------------------
        # Semantic score
        # -------------------------------------------------

        semantic_score = calculate_similarity(
            paper_text,
            publisher.get(
                "description",
                ""
            )
        )

        # -------------------------------------------------
        # Keyword score
        # -------------------------------------------------

        keyword_score = calculate_keyword_score(
            paper_text,
            publisher.get(
                "keywords",
                []
            )
        )

        # -------------------------------------------------
        # Final hybrid score
        # -------------------------------------------------

        final_score = calculate_final_score(
            semantic_score,
            keyword_score
        )

        publisher_format = publisher.get(
            "format",
            {}
        )

        # -------------------------------------------------
        # Result
        # -------------------------------------------------

        results.append({

            "publisher": publisher.get(
                "name",
                "Unknown"
            ),

            "semantic_score": round(
                semantic_score,
                4
            ),

            "keyword_score": round(
                keyword_score,
                4
            ),

            "similarity_score": final_score,

            "format": publisher_format,

            "citation_style": publisher_format.get(
                "citation_style",
                "Unknown"
            ),

            "font": publisher_format.get(
                "font",
                "Times New Roman"
            ),

            "font_size": publisher_format.get(
                "font_size",
                10
            ),

            "double_column": publisher_format.get(
                "double_column",
                False
            ),

            "submission_url": publisher.get(
                "submission_url",
                ""
            )
        })

    # -----------------------------------------------------
    # Highest final score first
    # -----------------------------------------------------

    results.sort(
        key=lambda x: x["similarity_score"],
        reverse=True
    )

    return results


# =========================================================
# Distribution Matrix
# =========================================================

def create_distribution_matrix(
    publisher_results
):

    """
    Create distribution matrix
    from publisher ranking.
    """

    matrix = []

    for rank, result in enumerate(
        publisher_results,
        start=1
    ):

        final_score = result[
            "similarity_score"
        ]

        percentage = round(
            max(0, min(1, final_score)) * 100,
            2
        )

        matrix.append({

            "rank": rank,

            "publisher": result[
                "publisher"
            ],

            "match_score": percentage,

            "semantic_score": round(
                result["semantic_score"] * 100,
                2
            ),

            "keyword_score": round(
                result["keyword_score"] * 100,
                2
            ),

            "citation_style": result[
                "citation_style"
            ],

            "font": result[
                "font"
            ],

            "font_size": result[
                "font_size"
            ],

            "double_column": result[
                "double_column"
            ],

            "format_available": bool(
                result["format"]
            ),

            "submission_url": result[
                "submission_url"
            ]
        })

    return matrix


# =========================================================
# Best Publisher
# =========================================================

def get_best_publisher(
    publisher_results
):

    """
    Return the highest-ranked publisher.
    """

    if not publisher_results:
        return None

    best = publisher_results[0]

    score = best[
        "similarity_score"
    ]

    percentage = round(
        max(0, min(1, score)) * 100,
        2
    )

    return {

        "publisher": best[
            "publisher"
        ],

        "match_score": percentage,

        "semantic_score": round(
            best["semantic_score"] * 100,
            2
        ),

        "keyword_score": round(
            best["keyword_score"] * 100,
            2
        ),

        "citation_style": best[
            "citation_style"
        ],

        "format": best[
            "format"
        ]
    }