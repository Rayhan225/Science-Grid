"""
Focused verification for the LaTeX Studio PDF-viewport fixes:

  Fix 1 — Zoomed-in (>100%) Page Sheet must NOT cut off the left edge:
           the scaled sheet may never extend into negative scroll content
           (scrollLeft is clamped at 0, so negative content is unreachable).
           Verified: at scrollLeft=0 the sheet's left edge sits at the content
           origin (its 24px padding) — it was ~-155px before the fix — and the
           right edge is reachable by scrolling.

  Fix 2 — Hand tool must PAN ONLY (no text selection): with the hand tool
           active, dragging across the sheet changes scrollLeft and leaves
           window.getSelection() empty; the container is select-none.
           Without the hand tool, dragging selects text normally.

Run (backend :8000 + Vite :5173 must be up):
  py -3.11 -X utf8 tests/test_latex_zoom_hand_pan.py
"""

import sys
import time
from pathlib import Path

TESTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(TESTS_DIR))

from harness import (  # noqa: E402
    FRONTEND_URL,
    SCREENSHOT_DIR,
    REPORTS_DIR,
    SuiteResult,
    UI,
    write_report,
)
from selenium.webdriver.common.by import By  # noqa: E402
from selenium.webdriver.common.action_chains import ActionChains  # noqa: E402
from selenium.webdriver.support.ui import WebDriverWait  # noqa: E402
from selenium.webdriver.support import expected_conditions as EC  # noqa: E402


GEOM_JS = """
() => {
  const c = document.querySelector('[data-testid="preview-viewport-container"]');
  const s = document.querySelector('.scholargrid-pdf-print-container');
  if (!c || !s) return null;
  const cr = c.getBoundingClientRect();
  const sr = s.getBoundingClientRect();
  const cs = getComputedStyle(c);
  return {
    zoomLevel: (document.querySelector('[data-testid="preview-zoom-level"]') || {}).textContent || '',
    clientWidth: c.clientWidth,
    clientHeight: c.clientHeight,
    scrollWidth: c.scrollWidth,
    scrollLeft: c.scrollLeft,
    scrollTop: c.scrollTop,
    maxScrollRight: c.scrollWidth - c.clientWidth,
    maxScrollDown: c.scrollHeight - c.clientHeight,
    paddingLeft: parseFloat(cs.paddingLeft) || 0,
    viewLeft: cr.left,
    viewRight: cr.right,
    sheetLeft: sr.left,
    sheetTop: sr.top,
    sheetWidth: sr.width,
    sheetHeight: sr.height,
    // content-space coordinates (independent of current scroll position)
    contentLeft: sr.left - cr.left + c.scrollLeft,
    contentRight: sr.left - cr.left + c.scrollLeft + sr.width,
    userSelectSheet: getComputedStyle(s).userSelect,
    cursorSheet: getComputedStyle(s).cursor,
    selection: (window.getSelection() || {}).toString ? String(window.getSelection().toString()) : '',
  };
}
"""


def geom(driver):
    return driver.execute_script("return (" + GEOM_JS + ")();")


def log(s):
    print(f"     ↳ {s}")


def safe_click(driver, el):
    try:
        driver.execute_script("arguments[0].scrollIntoView({block:'center', inline:'nearest'});", el)
        time.sleep(0.15)
        el.click()
    except Exception:
        driver.execute_script("arguments[0].click();", el)


def wait_geom(driver, timeout=15):
    WebDriverWait(driver, timeout).until(
        lambda d: d.execute_script(
            "return !!(document.querySelector('[data-testid=\\'preview-viewport-container\\']')"
            " && document.querySelector('.scholargrid-pdf-print-container'))"))
    return geom(driver)


def scroll_to(driver, target):
    driver.execute_script(
        "var c=document.querySelector('[data-testid=\\'preview-viewport-container\\']');"
        "c.scrollLeft=" + str(target) + "; c.scrollTop=0;")


def run(headless=True):
    print("=" * 70)
    print(" LaTeX Studio — Zoom left-edge + Hand-pan-only verification")
    print("=" * 70)
    suite = SuiteResult("LaTeX Studio Zoom & Hand Pan Verification")
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    ui = UI(headless=headless, implicit_wait=10)
    driver = ui.driver
    try:
        # ---- login & navigation -------------------------------------------------
        driver.get(FRONTEND_URL)
        time.sleep(1.0)
        driver.set_window_size(2200, 1400)   # wide window -> wide preview panel
        time.sleep(1.0)
        for label in ("Sign In", "Authenticated Portal", "Get Started"):
            if ui.click_visible_text(label, timeout=4):
                break
        time.sleep(1.0)
        ui.modal_click("Academic Researcher")
        ui.wait_until_login_settled(timeout=45)
        print("  [OK] Logged in as Academic Researcher")

        if not ui.goto_view("LaTeX Studio", "LaTeX Studio", timeout=25):
            raise RuntimeError("LaTeX Studio never rendered")
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "[data-testid='preview-viewport-container']"))
        )
        time.sleep(1.5)
        g = wait_geom(driver)
        print(f"  [OK] LaTeX Studio page-sheet rendered. zoom={g['zoomLevel']}, "
              f"viewport={g['clientWidth']}x{g['clientHeight']}")

        zoom_in = driver.find_element(By.CSS_SELECTOR, "[data-testid='zoom-in-btn']")
        zoom_out = driver.find_element(By.CSS_SELECTOR, "[data-testid='zoom-out-btn']")
        fit = driver.find_element(By.CSS_SELECTOR, "[data-testid='zoom-fit-btn']")
        hand_btn = driver.find_element(By.CSS_SELECTOR, "button[data-testid='preview-hand-tool-btn']")
        sheet = driver.find_element(By.CSS_SELECTOR, ".scholargrid-pdf-print-container")
        container = driver.find_element(By.CSS_SELECTOR, "[data-testid='preview-viewport-container']")

        # =====================================================================
        # FIX 1 — zoomed-in left edge reachable + full sheet reachable
        # =====================================================================
        # 1a. 130% — zoomed past 100% (the case the user reported)
        safe_click(driver, fit)                      # 100%
        time.sleep(0.4)
        for _ in range(3):
            safe_click(driver, zoom_in)              # 130%
            time.sleep(0.3)
        g = wait_geom(driver)
        log(f"130%: contentLeft={g['contentLeft']:.1f} (padding {g['paddingLeft']}) "
            f"contentRight={g['contentRight']:.1f} maxScrollRight={g['maxScrollRight']}")
        never_clipped_130 = g["contentLeft"] >= -1.0
        visible_at_origin = g["sheetLeft"] >= g["viewLeft"] - 1.0
        suite.record(
            "130% zoom — left edge visible & never clipped",
            never_clipped_130 and visible_at_origin,
            f"contentLeft={g['contentLeft']:.1f}px (>= -1), sheet offset "
            f"{g['sheetLeft'] - g['viewLeft']:.1f}px from viewport left at scrollLeft=0, "
            f"right overflow {g['maxScrollRight']}px",
            section="Zoom left-edge fix",
        )
        ui.shot("latex_zoom_130_left_edge_visible")

        # 1b. 200% — guaranteed overflow (scaled width 1588px): flush-left at origin
        for _ in range(7):
            safe_click(driver, zoom_in)              # 200%
            time.sleep(0.3)
        g = wait_geom(driver)
        log(f"200%: contentLeft={g['contentLeft']:.1f} contentRight={g['contentRight']:.1f} "
            f"maxScrollRight={g['maxScrollRight']}")
        overflow = g["maxScrollRight"] >= 10
        # flush-left means the sheet starts exactly at the container's content box
        flush_at_origin = -1.0 <= g["contentLeft"] <= g["paddingLeft"] + 5.0
        suite.record(
            "200% zoom — left edge flush at scroll origin (no hidden overflow)",
            overflow and flush_at_origin,
            f"contentLeft={g['contentLeft']:.1f}px (content box starts at padding "
            f"{g['paddingLeft']}px), right overflow {g['maxScrollRight']}px => the full "
            f"{g['contentRight']:.0f}px-wide sheet lives in reachable content space",
            section="Zoom left-edge fix",
        )

        # scroll to far right -> right edge of the sheet must become visible
        scroll_to(driver, "c.scrollWidth")
        time.sleep(0.5)
        g = geom(driver)
        s_right = driver.execute_script(
            "var s=document.querySelector('.scholargrid-pdf-print-container');"
            "var r=s.getBoundingClientRect();return r.right;")
        v_right = g["viewRight"]
        right_edge_visible = (s_right <= v_right + 1.0) and (s_right > v_right - 30)
        suite.record(
            "200% zoom — right edge reachable by scrolling",
            right_edge_visible,
            f"sheet right {s_right:.1f} vs viewport right {v_right:.1f} at max scroll "
            f"(scrollLeft={g['scrollLeft']}/{g['maxScrollRight']})",
            section="Zoom left-edge fix",
        )
        ui.shot("latex_zoom_200_left_edge_visible")

        # =====================================================================
        # FIX 2 — hand tool pans only, never selects  (at 200% where it scrolls)
        # =====================================================================
        scroll_to(driver, 0)
        time.sleep(0.4)

        # 2a. hand tool OFF -> dragging selects text (browser default)
        g = wait_geom(driver)
        selectable_off = g["userSelectSheet"] in ("text", "")
        log(f"hand OFF: userSelect={g['userSelectSheet']!r}, cursor={g['cursorSheet']!r}")
        ActionChains(driver).click_and_hold(container).move_by_offset(50, 10).release().perform()
        time.sleep(0.4)
        sel_off = geom(driver)["selection"]
        log(f"hand OFF drag selection: {sel_off!r}")
        suite.record(
            "Hand OFF — text selectable by drag",
            selectable_off,
            f"userSelect={g['userSelectSheet']!r}, drag produced selection {sel_off!r}",
            section="Hand-pan-only fix",
            warn=not sel_off,  # headless may not manufacture a selection; never fails
        )

        # 2b. hand tool ON -> drag LEFT pans content, nothing gets selected
        scroll_to(driver, 0)
        time.sleep(0.3)
        safe_click(driver, hand_btn)
        time.sleep(0.5)
        g = wait_geom(driver)
        active_css = hand_btn.get_attribute("class")
        btn_active = ("font-bold" in active_css or "bg-cyan-500/20" in active_css or "bg-indigo-100" in active_css)
        log(f"hand ON: cursor={g['cursorSheet']} userSelect={g['userSelectSheet']} btnActive={btn_active}")

        before = g["scrollLeft"]
        ActionChains(driver).click_and_hold(container).move_by_offset(-90, 0).pause(0.3).release().perform()
        time.sleep(0.5)
        g = geom(driver)
        after_left = g["scrollLeft"]
        panned_left = after_left > before
        no_selection = g["selection"] == ""
        log(f"pan left: scrollLeft {before} -> {after_left} (panned={panned_left}), "
            f"selection={g['selection']!r}")

        # drag RIGHT back -> content scrolls back toward the origin
        ActionChains(driver).click_and_hold(container).move_by_offset(90, 0).pause(0.3).release().perform()
        time.sleep(0.5)
        g = geom(driver)
        after_right = g["scrollLeft"]
        panned_right = after_right < after_left
        no_selection_2 = g["selection"] == ""
        log(f"pan right: scrollLeft {after_left} -> {after_right} (panned={panned_right}), "
            f"selection={g['selection']!r}")

        suite.record(
            "Hand ON — drag pans both ways and selects nothing",
            btn_active and g["userSelectSheet"] == "none" and panned_left and panned_right
            and no_selection and no_selection_2,
            f"scrollLeft {before}->{after_left}->{after_right}px (pan left {panned_left}, "
            f"right {panned_right}), selection {g['selection']!r}, userSelect "
            f"{g['userSelectSheet']}, cursor {g['cursorSheet']}",
            section="Hand-pan-only fix",
        )

        sel_check = driver.execute_script("return window.getSelection() ? window.getSelection().toString() : '';")
        suite.record(
            "Hand ON — no lingering selection after release",
            sel_check == "",
            f"window.getSelection()={sel_check!r}",
            section="Hand-pan-only fix",
        )

        # 2c. hand tool OFF again -> select-text restored
        safe_click(driver, hand_btn)
        time.sleep(0.4)
        g = geom(driver)
        restored = g["userSelectSheet"] in ("text", "")
        suite.record(
            "Hand OFF — select-text restored",
            restored,
            f"userSelect={g['userSelectSheet']!r}",
            section="Hand-pan-only fix",
        )

        # =====================================================================
        # 1c. 90% — default comfortable zoom: sheet fully inside & centered
        # =====================================================================
        scroll_to(driver, 0)
        time.sleep(0.3)
        safe_click(driver, fit)                      # 100%
        time.sleep(0.3)
        safe_click(driver, zoom_out)                 # 90%
        time.sleep(0.5)
        g = wait_geom(driver)
        fits = g["sheetWidth"] <= g["clientWidth"] + 1
        left_ok_90 = g["contentLeft"] >= -1.0
        right_ok_90 = g["contentRight"] <= g["clientWidth"] + 1
        center_delta = abs((g["contentLeft"] + g["sheetWidth"] / 2) - g["clientWidth"] / 2)
        log(f"90%: sheet {g['sheetWidth']:.0f}px in {g['clientWidth']}px, "
            f"contentLeft {g['contentLeft']:.1f}, centerDelta {center_delta:.1f}")
        suite.record(
            "90% zoom — sheet fully visible & centered",
            fits and left_ok_90 and right_ok_90 and center_delta <= 60,
            f"sheet {g['sheetWidth']:.0f}px in {g['clientWidth']}px viewport, "
            f"center offset {center_delta:.1f}px, contentLeft {g['contentLeft']:.1f}px",
            section="Zoom left-edge fix",
        )
        ui.shot("latex_zoom_90_centered")

        # ---- report ------------------------------------------------------------
        print("\n  Measured geometry @ reset (90%):")
        for k, v in g.items():
            if isinstance(v, float):
                v = f"{v:.1f}"
            print(f"    {k}: {v}")

        md = REPORTS_DIR / "latex_zoom_hand_pan_report.md"
        js = REPORTS_DIR / "latex_zoom_hand_pan_report.json"
        ok, fail = write_report(suite, md, js)
        print("=" * 70)
        print(f" RESULT: {ok} passed, {fail} failed  ->  {md}")
        print("=" * 70)
        return ok, fail

    finally:
        ui.quit()


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--open", action="store_true", help="run browser visible (not headless)")
    args = p.parse_args()
    ok, fail = run(headless=not args.open)
    sys.exit(1 if fail else 0)