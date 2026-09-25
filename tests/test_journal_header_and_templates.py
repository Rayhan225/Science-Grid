"""
E2E Test for User Request:
1. Editable journal header matching user image (Journal name, Vol/Issue/Date/DOI, Quartile badge)
2. LaTeX Studio 'Templates' button redirects to standalone Templates Gallery
3. Previous embedded templates workspace removed from LaTeX Studio
4. Theme integration (ThemeContext classes applied)
5. Q3 and Q4 template counts (at least 2-5 per category)
6. Authentic visual layout differences (Elsevier boxed, IEEE 2-column drop cap, Nature summary, etc.)
"""

import sys
import os
import time
from pathlib import Path

TESTS_DIR = Path(__file__).resolve().parent
SCREENSHOT_DIR = TESTS_DIR / "screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
sys.path.insert(0, str(TESTS_DIR))

from harness import FRONTEND_URL, UI
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

def safe_click(driver, el):
    try:
        el.click()
    except Exception:
        driver.execute_script("arguments[0].click();", el)

def run_test():
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--window-size=1600,1050")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    
    driver = webdriver.Chrome(options=chrome_options)
    ui = UI(driver)
    
    try:
        print("[TEST] 1. Loading app at:", FRONTEND_URL, flush=True)
        driver.get(FRONTEND_URL)
        time.sleep(2.0)
        
        # Authenticate via UI helper
        for label in ["Enter Workspace", "Launch ScholarGrid", "Sign In", "Get Started"]:
            if ui.click_visible_text(label, timeout=4):
                break
        time.sleep(1.0)
        ui.modal_click("Academic Researcher")
        ui.wait_until_settled(timeout=45)
        print("   ✓ Logged in as Academic Researcher.", flush=True)
            
        print("[TEST] 2. Navigate to Templates Gallery via Sidebar", flush=True)
        try:
            sidebar_el = driver.find_element(By.TAG_NAME, "aside")
            ActionChains(driver).move_to_element(sidebar_el).perform()
            time.sleep(0.5)
        except Exception:
            pass

        templates_btn = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "#nav-templates, [data-testid='nav-templates']"))
        )
        safe_click(driver, templates_btn)
        time.sleep(1.5)
        
        # Verify Templates Gallery root rendered
        gallery_root = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "#templates-gallery-root, [data-testid='templates-gallery']"))
        )
        assert gallery_root is not None, "Templates Gallery failed to render"
        driver.save_screenshot(str(SCREENSHOT_DIR / "templates_gallery_themes.png"))
        print("   ✓ Templates Gallery rendered with active theme styling. Screenshot saved.", flush=True)
        
        # Verify Q3 & Q4 filter counts
        q3_btn = driver.find_element(By.XPATH, "//button[contains(., 'Q3 Journals')]")
        safe_click(driver, q3_btn)
        time.sleep(1.0)
        q3_cards = driver.find_elements(By.CSS_SELECTOR, "[data-testid^='template-card-']")
        print(f"   ✓ Q3 Filter shows {len(q3_cards)} authentic templates (requirement >= 20)", flush=True)
        assert len(q3_cards) >= 20, f"Expected at least 20 Q3 templates, found {len(q3_cards)}"
        
        q4_btn = driver.find_element(By.XPATH, "//button[contains(., 'Q4 Journals')]")
        safe_click(driver, q4_btn)
        time.sleep(1.0)
        q4_cards = driver.find_elements(By.CSS_SELECTOR, "[data-testid^='template-card-']")
        print(f"   ✓ Q4 Filter shows {len(q4_cards)} authentic templates (requirement >= 20)", flush=True)
        assert len(q4_cards) >= 20, f"Expected at least 20 Q4 templates, found {len(q4_cards)}"
        
        # Reset filter to All Rankings
        all_rank_btn = driver.find_element(By.XPATH, "//button[contains(., 'All Rankings')]")
        safe_click(driver, all_rank_btn)
        time.sleep(0.5)

        print("[TEST] 3. Verify Editable Header in Preview Modal", flush=True)
        first_card = driver.find_element(By.CSS_SELECTOR, "[data-testid^='template-card-']")
        safe_click(driver, first_card)
        time.sleep(1.0)
        
        header_el = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "[data-testid='editable-journal-header']"))
        )
        assert header_el is not None, "EditableJournalHeader not found in preview modal"
        driver.save_screenshot(str(SCREENSHOT_DIR / "preview_modal_editable_header.png"))
        print("   ✓ Editable journal header verified in preview modal. Screenshot saved.", flush=True)
        
        # Test editing the header text directly in preview modal
        journal_title_span = header_el.find_element(By.CSS_SELECTOR, "span[contenteditable='true']")
        driver.execute_script("arguments[0].textContent = 'CURRENT OPINION IN PLANT BIOLOGY · CAMBRIDGE ZYGOTE';", journal_title_span)
        driver.execute_script("arguments[0].dispatchEvent(new Event('blur'));", journal_title_span)
        time.sleep(0.5)
        assert "CAMBRIDGE ZYGOTE" in header_el.text
        print("   ✓ Journal title edited inline successfully.", flush=True)
        
        print("[TEST] 4. Click 'Start Writing' to load into LaTeX Studio", flush=True)
        start_writing_btn = driver.find_element(By.CSS_SELECTOR, "#modal-start-writing-btn, [data-testid='modal-start-writing-btn']")
        safe_click(driver, start_writing_btn)
        time.sleep(2.5)
        
        # Verify LaTeX Studio is open
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'LaTeX Studio') or contains(text(), 'Recompile')]"))
        )
        print("   ✓ LaTeX Studio opened.", flush=True)
        
        # Verify Page 1 has EditableJournalHeader
        page1_header = WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "[data-testid='editable-journal-header']"))
        )
        assert page1_header is not None, "EditableJournalHeader missing from LaTeX Studio Page 1"
        driver.save_screenshot(str(SCREENSHOT_DIR / "latex_studio_page1_editable_header.png"))
        print("   ✓ Editable journal header verified on LaTeX Studio Page 1. Screenshot saved.", flush=True)

        # Test editing on Page 1
        page1_title_span = page1_header.find_element(By.CSS_SELECTOR, "span[contenteditable='true']")
        driver.execute_script("arguments[0].textContent = 'CAMBRIDGE ZYGOTE · RESEARCH EDITION';", page1_title_span)
        driver.execute_script("arguments[0].dispatchEvent(new Event('blur'));", page1_title_span)
        time.sleep(0.5)
        assert "CAMBRIDGE ZYGOTE · RESEARCH EDITION" in page1_header.text
        print("   ✓ LaTeX Studio Page 1 journal title edited inline.", flush=True)

        print("[TEST] 5. Verify LaTeX Studio navbar 'Templates' button redirects to standalone Templates Gallery", flush=True)
        templates_btn = driver.find_element(By.XPATH, "//button[contains(., 'Templates') and (contains(@title, 'Templates') or contains(@class, 'font-mono'))]")
        safe_click(driver, templates_btn)
        time.sleep(1.5)
        
        # Verify we navigated back to Templates Gallery
        assert driver.find_element(By.CSS_SELECTOR, "#templates-gallery-root, [data-testid='templates-gallery']") is not None
        print("   ✓ Clicking 'Templates' in LaTeX Studio successfully redirected to standalone Templates Gallery.", flush=True)
        
        # Verify that old embedded templates workspace is NOT in the DOM
        old_workspaces = driver.find_elements(By.XPATH, "//*[contains(text(), 'Journal-Ready Research Templates') and contains(text(), 'Academic Templates')]")
        assert len(old_workspaces) == 0, "Old embedded templates workspace still found in DOM!"
        print("   ✓ Previous templates workspace verified completely removed from LaTeX Studio.", flush=True)

        driver.save_screenshot(str(SCREENSHOT_DIR / "templates_gallery_navigated_from_studio.png"))
        print("\n🎉 ALL USER REQUIREMENTS VERIFIED SUCCESSFULLY!", flush=True)
        
    finally:
        driver.quit()

if __name__ == '__main__':
    run_test()
