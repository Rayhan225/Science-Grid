from backend.app.services.publisher_compliance_service import PublisherComplianceService


def test_word_count_check_ok():
    text = "word " * 100
    res = PublisherComplianceService.check_word_count(text, max_words=200)
    assert res['ok'] is True


def test_word_count_check_fail():
    text = "word " * 1000
    res = PublisherComplianceService.check_word_count(text, max_words=500)
    assert res['ok'] is False


def test_image_dpi_check():
    images = [{'filename': 'fig1.png', 'dpi': 300}, {'filename': 'fig2.png', 'dpi': 200}]
    res = PublisherComplianceService.check_image_dpi(images, min_dpi=300)
    assert res['ok'] is False
    assert len(res['failures']) == 1


def test_run_compliance_checks():
    text = 'word ' * 1200
    images = [{'filename': 'fig1.png', 'dpi': 600}]
    rules = {'max_words': 2000, 'min_image_dpi': 300, 'max_pages': 10, 'words_per_page': 250}
    res = PublisherComplianceService.run_compliance_checks(text, images, rules)
    assert 'overall_ok' in res
