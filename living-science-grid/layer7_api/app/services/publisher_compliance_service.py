from typing import Dict, Any, List


class PublisherComplianceService:
    """Simple rule-based compliance checks for common publisher requirements."""

    @staticmethod
    def check_word_count(text: str, max_words: int) -> Dict[str, Any]:
        words = len(text.split())
        return {'words': words, 'max_words': max_words, 'ok': words <= max_words}

    @staticmethod
    def check_image_dpi(images: List[Dict[str, Any]], min_dpi: int) -> Dict[str, Any]:
        # images: list of {'filename': str, 'dpi': int}
        failures = [img for img in images if (img.get('dpi') or 0) < min_dpi]
        return {'checked': len(images), 'min_dpi': min_dpi, 'failures': failures, 'ok': len(failures) == 0}

    @staticmethod
    def check_page_count(text: str, max_pages: int, words_per_page: int = 500) -> Dict[str, Any]:
        words = len(text.split())
        pages = (words + words_per_page - 1) // words_per_page
        return {'pages': pages, 'max_pages': max_pages, 'ok': pages <= max_pages}

    @staticmethod
    def run_compliance_checks(text: str, images: List[Dict[str, Any]], rules: Dict[str, Any]) -> Dict[str, Any]:
        results = {}
        if 'max_words' in rules:
            results['word_count'] = PublisherComplianceService.check_word_count(text, rules['max_words'])
        if 'min_image_dpi' in rules:
            results['image_dpi'] = PublisherComplianceService.check_image_dpi(images, rules['min_image_dpi'])
        if 'max_pages' in rules:
            results['page_count'] = PublisherComplianceService.check_page_count(text, rules['max_pages'], rules.get('words_per_page', 500))
        overall_ok = all(r.get('ok', True) for r in results.values())
        return {'overall_ok': overall_ok, 'details': results}
