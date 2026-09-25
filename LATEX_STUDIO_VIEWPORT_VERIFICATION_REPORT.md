# LaTeX Studio — Viewport Fixes & Full-Stack Verification Report

**Date:** 2026-09-24
**Scope:** `living-science-grid/src/components/LatexStudio.jsx` (frontend only) + live verification of the FastAPI (:8000) ↔ Supabase backend and DB CRUD for every LaTeX Studio endpoint.

---

## ✅ 1. Executive Summary

Three user-reported issues in LaTeX Studio's PDF view were fixed with **minimal, targeted frontend changes** (no backend code was modified):

| # | User issue | Status |
|---|-----------|--------|
| 1 | Zooming in **>100% cuts off the left side** of the PDF page sheet | ✅ Fixed & verified (left edge now reachable at any zoom, incl. 200%) |
| 2 | **Hand tool selects text** instead of only panning | ✅ Fixed & verified (pan-only, zero selection, both directions) |
| 3 | A few elements **overflow the view** in narrow windows | ✅ Fixed & verified (preview header scrolls instead of clipping) |

Full-stack health, every `/api/latex/*` endpoint → route mapping, and a live create/save/fetch/version round-trip against PostgreSQL (Supabase) were re-verified this session.

**Test results:** focused zoom/pan suite **8/8 PASS** · comprehensive LaTeX Studio elements suite **11/11 PASS** · production build ✅ (3.3s).

---

## ✅ 2. Fix 1 — PDF left-side cut-off when zoomed in

### Root cause
The Page-Sheet column kept its natural `794px` layout width and was scaled with
`transform: scale(zoom%)` while the parent used `flex items-center`. With
`transform-origin: top center`, scaling **up** from the center pushed the sheet's
left edge into **negative scroll content** (`scrollLeft` is clamped at 0, so that
part was physically unreachable — the "cut off" left side). Probed before the fix
at 130% zoom: sheet left edge sat at **−154.8px**.

### Fix (`LatexStudio.jsx`)
1. **`transform-origin: top left`** — the scaled sheet now always starts at the
   scroll origin instead of overflowing backward toward negative space.
2. **Layout width covers the full scaled extent** so the viewport's scroll area
   always contains the whole sheet:
   ```js
   const pdfSheetWidth = Math.max(794, Math.ceil(794 * (previewZoom / 100)));
   ```
3. **Auto margins** center the sheet whenever it fits and go flush-left (0px)
   whenever it must scroll — so the left edge is *always* reachable:
   ```js
   width: '794px',
   marginLeft:  `max(0px, calc((100% - ${pdfSheetWidth}px) / 2))`,
   marginRight: `max(0px, calc((100% - ${pdfSheetWidth}px) / 2))`,
   transform: `scale(${previewZoom/100})`,
   transformOrigin: 'top left'
   ```

### Verified (live app, headless Chrome 153)
At `scrollLeft = 0` the sheet's left edge now sits **exactly** at the content box
(the container's 24px padding) instead of −155px:

| Zoom | left edge (content-x) | Right overflow | Result |
|------|----------------------|----------------|--------|
| 130% | **+24.0px** (padding only) | 130px scrollable | ✅ visible, never clipped |
| 200% | **+24.0px** (flush at origin) | 686px scrollable | ✅ no hidden overflow |
| 200% scrolled right | right edge visible at viewport edge | — | ✅ full sheet reachable |
| 90% | +65.8px, centered (offset 40px) | fits | ✅ fully visible & centered |

Screenshots: `tests/screenshots/latex_zoom_130_left_edge_visible.png`,
`tests/screenshots/latex_zoom_200_left_edge_visible.png`,
`tests/screenshots/latex_zoom_90_centered.png`.

---

## ✅ 3. Fix 2 — Hand tool: pan only, never select

### Root cause
The hand-tool drag handler mapped mouse deltas to `scrollLeft/scrollTop`, but the
browser's native drag still launched text selection over the page sheet, and the
container was `select-text` even while the hand tool was active.

### Fix (`LatexStudio.jsx`)
- `handlePanMouseDown`: `e.preventDefault()` on the pan surface + **left-button-only
  guard** (`e.button !== 0`) so right/middle clicks are never hijacked.
- `preview-viewport-container`: `onDragStart` → `e.preventDefault()` when the hand
  tool is active.
- Page-Sheet wrapper now gets **conditional** selection behavior:
  ```js
  className={`scholargrid-pdf-print-container ... ${isHandToolActive ? 'select-none' : 'select-text'}`}
  ```
  and the scroll container gets `cursor-grab` / `cursor-grabbing` + `select-none`
  only while the hand tool is active (normal `select-text` is restored after).

### Verified (live app at 200% zoom, where the sheet actually scrolls)

| Stage | Cursor | `user-select` | Drag result | Selection |
|-------|--------|---------------|-------------|-----------|
| Hand **OFF** | `auto` | `text` | normal drag | ✅ `'r em'` selected (browser default) |
| Hand **ON** | `grab` | `none` | pan left: `scrollLeft 0 → 90px` | ✅ `` (empty) |
| Hand **ON** | `grabbing` | `none` | pan right: `90 → 0px` (2nd drag) | ✅ `` (empty) |
| Hand **OFF** again | `auto` | `text` | — | restored ✅ |

Pan tracking is exact (90px drag ↔ 90px scroll), the selection is empty after both
drags and **after release**, and toggling the tool back restores text selection.

---

## ✅ 4. Fix 3 — Minor visual overflow

- **Preview panel header** (`Preview header` bar): added `min-w-0 overflow-x-auto
  custom-scrollbar` so in narrow windows the zoom/pan controls scroll horizontally
  instead of clipping out of the view.
- **Menu bar intentionally untouched** — it is kept `overflow-visible` so its
  dropdowns never get clipped (this was verified, not changed).

---

## ✅ 5. Full-Stack Connectivity & DB CRUD (re-verified live)

- **Frontend → Backend:** every LaTeX Studio fetch targets `http://127.0.0.1:8000`
  (FastAPI). All **35** `/api/latex/*` calls made by the frontend map 1:1 to routes
  in `research_brain/latex_studio.py`. ✅
- **Backend → DB:** `/health` → `{"status":"online","database":"supabase_postgresql_cloud",
  "records":{"files":45,"matrices":19,"insight_workspaces":14,"math_sessions":15}}`. ✅
- **Live CRUD round-trip (this session):** create project → save content → fetch →
  save version → list versions → vault sync — every request returned **200** and was
  confirmed persisted in PostgreSQL; test rows cleaned up afterwards. ✅
- **Express :5000/:5001** remains an orphan duplicate (nothing in `src/` references it);
  no changes applied.

---

## ✅ 6. Test Results

| Suite | Result | Notes |
|-------|--------|-------|
| `tests/test_latex_zoom_hand_pan.py` (**new** — focused proof of Fix 1 + 2) | **8/8 PASS** | geometry + pan/selection assertions; report in `tests/reports/latex_zoom_hand_pan_report.md` |
| `tests/test_latex_studio_visual.py` (11-step elements suite) | **11/11 PASS** | full regression of header, zoom controls, file CRUD, find/replace, visual editor, page sheet, manual modal |
| Production build | ✅ `vite build` 3.32s | no errors |
| DB `DELETE` cleanup | ✅ | CRUD round-trip artifacts removed |

> Note: one run of the elements suite showed a transient `buffer isolation: False`
> (a tab-switch timing flake in a pre-existing test — the file tab click raced the
> state switch). The immediate rerun passed **11/11**; the flake involves the
> `notes.txt` tab/buffer test only and is unrelated to these changes.

---

## ✅ 7. Files Changed

- `living-science-grid/src/components/LatexStudio.jsx` — all three fixes (untracked
  WIP file, unchanged by this session's follow-up except re-verification).
- `tests/test_latex_zoom_hand_pan.py` — new focused verification suite.
- `tests/reports/latex_zoom_hand_pan_report.{md,json}` — generated results.
- `tests/screenshots/latex_zoom_{130,200}_left_edge_visible.png`,
  `tests/screenshots/latex_zoom_90_centered.png` — visual proof.

**Deliberately not touched:** `research_brain/latex_studio.py`, `research_brain/main.py`,
Express `server/index.js`, and all other frontend components.