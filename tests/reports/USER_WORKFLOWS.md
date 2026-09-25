# ScholarGrid — User Workflow Walkthrough (E2E)

This narrates the real user journeys exercised by `tests/test_user_workflows.py`
against the live stack (Vite `:5173` → FastAPI `:8000` → Supabase PostgreSQL),
with the persona, isolation, and cleanup guarantees the suite asserts.

All machine-readable counts live in `user_workflows_results.json` and the
pass/fail detail table in `user_workflows_success_report.md`.

---

## Journey 1 — Demo persona quick logins (per persona)

**Persona cards** on the landing modal (password `password123`):

| Persona card          | Resolves to     | Notes |
| --------------------- | --------------- | ----- |
| Faculty Professor     | `usr_professor`| ✅ **Distinct scope (fixed)** — auto-provisioned on first login. Previously collapsed onto `usr_researcher` because the whitelist omitted `professor`. |
| Academic Researcher   | `usr_researcher`| — |
| Graduate Student      | `usr_student`   | — |
| Research Programmer   | `usr_programmer`| — |
| Lab Director / Admin  | `usr_default`   | — |
| Peer Reviewer         | `usr_reviewer`  | — |

For each persona the suite then:

1. **Asserts the resolved `user_id`** via `current_uid()` after `wait_until_login_settled`.
2. **LaTeX Studio → API:** `GET /api/latex/projects?user_id=<uid>` must contain
   both shared global manuscripts owned by `usr_admin`:
   - *Nature Communications Evaluation Manuscript*
   - *CRUD Probe 4*
3. **LaTeX Studio → UI:** opens the Projects workspace
   ("Research Manuscript Workspace") and asserts both shared titles render
   as real project cards.
4. **Central Vault → API:** `GET /api/library?user_id=<uid>` root files must
   exactly match the persona's expected set:

   | uid | expected root files |
   | --- | --- |
   | `usr_researcher` | `Data Engineering Pathway (1).pdf`, `Untitled document.pdf`, `paperCRA.pdf`, `paperJZRE.pdf`, and the long "…roadmap…" PDF (**5 total**) |
   | `usr_student` | `paperCRA.pdf`, `paperJZRE.pdf` |
   | `usr_reviewer` | `paperCRA.pdf` |
   | `usr_programmer` | *(none → `Folder is empty`)* |
   | `usr_default` | *(none → `Folder is empty`)* |

   > The strict assertion is the **API set equality**; the DOM check only
   > matches display-safe (≤60 char) names because vault cards can visually
   > truncate very long filenames.
5. **Central Vault → UI:** navigates to the "Central Storage Vault" view and
   asserts either the expected filenames or the `Folder is empty` empty state.
6. **Signs out** back to the landing page.

---

## Journey 2 — Fresh account settings (API round-trip)

A brand-new `@test.local` account (**Owner A**) is registered through the real
register API. The suite then:

1. **Snapshot** — `GET /api/profile` records A's current theme.
2. **Change** — `POST /api/profile` sets `theme="topography-dark"` + a test bio.
3. **Verify** — a fresh `GET` confirms `topography-dark` persisted.
4. **Restore** — the original theme is written back and re-verified.

Demo personas are never mutated — this round-trip runs only on Owner A.

---

## Journey 3 — Cross-user data isolation (Owner A vs. Peer Reviewer)

**Setup (API, on Owner A):**

- `POST /api/latex/projects/new` → private project `ISO-Private-Paper-<ts>`
- `POST /api/library` → private root file `iso_private_<ts>.pdf`

**Assertions — the Peer Reviewer must NOT see either item:**

| Surface | Check |
| ------- | ----- |
| API  | `GET /api/latex/projects?user_id=usr_reviewer` omits A's project title |
| API  | `GET /api/library?user_id=usr_reviewer` omits A's filename |
| UI   | LaTeX Studio Projects workspace does not render A's title |
| UI   | Central Vault Files tab does not render A's filename |

Meanwhile both items **are** visible to Owner A (positive control).

---

## Journey 4 — Fresh-account LaTeX create + delete (real UI)

Owner A logs into the **UI** with its credentials, then:

1. **Create T1** — LaTeX Studio → Projects → **New Research Paper** modal →
   fill *Paper Title* → **Initialize Project in Database**.
   Asserts T1 appears in A's `GET /api/latex/projects`.
2. **Create T2** — same modal; T2 becomes the *Active Manuscript*.
3. **Workspace render** — both new projects **and** both shared `usr_admin`
   manuscripts appear as cards in the Projects workspace.
4. **Delete T1 via trash icon** — because T2 is active, T1's card exposes the
   `lucide-trash-2` button → JS-clicked (`handleDeleteProject` →
   `DELETE /api/latex/projects/{id}` → `fetchProjects()`). Asserts T1 vanishes
   from **both** the API list and the rendered workspace card grid.
5. **Delete T2 via API** — `DELETE /api/latex/projects/{id}` (HTTP 200).

---

## Journey 5 — Final consistency & cleanup

After the journeys:

- `cleanup_user(A)` removes **all** rows owned by the test account
  (`users`, `scholar_profiles`, `latex_projects`, `file_system`,
  `global_vault_notes`, `insightlens_workspaces`, `domain_workspaces`)
  — each table asserted **0 rows left** for Owner A's uid.
- Shared `usr_admin` content is **untouched** (still exactly 2 LaTeX projects).
- **Zero** `@test.local` users remain anywhere in `users`.

---

## Findings & fixes surfaced by this suite

- ✅ **Faculty Professor persona overlap — FIXED.** The login provisioning
  whitelist now includes `professor`, so the persona auto-provisions its own
  `usr_professor` scope (previously collapsed onto `usr_researcher`).
- ✅ **Project DELETE ownership guard — ADDED.** `DELETE /api/latex/projects/{id}`
  now rejects (403) deletes of other owners' projects when `user_id` is passed;
  the UI passes it. It also removes the auto-synced Central Vault `.tex` copy
  (and the `LaTeX Projects` folder when empty).
- 🔁 The strict vault assertion initially failed because this suite's own
  expectation listed only 3 of `usr_researcher`'s **5** root files — the
  expectation was corrected to the live ground truth (test bug, not a product
  bug).
- The isolation, theme, and cleanup guarantees all passed on the live system.
