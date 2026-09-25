# Full User Workflow Testing (UI + API + DB) — Success Report

- **Timestamp:** 2026-09-24 03:37:40
- **Host:** DESKTOP-I8UOC9J
- **API backend:** http://127.0.0.1:8000
- **Express backend:** http://127.0.0.1:5000
- **Frontend:** http://localhost:5173
- **Result:** ✅ ALL PASS
- **Passed:** 70  **Failed:** 0  **Warnings:** 0  **Total:** 70

| Status | Test | Detail |
|--------|------|--------|
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-001` Lazy view chunks pre-warmed for persona navigation | imported view modules |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-002` Persona 'researcher' login resolves to 'usr_researcher' | ui uid=usr_researcher |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-003` Persona 'researcher' LaTeX API list includes both shared usr_admin projects | 2 projects; titles=['Nature Communications Evaluation Manuscript', 'CRUD Probe 4'] |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-004` Persona 'researcher' LaTeX Studio UI shows shared usr_admin projects | Projects workspace renders both shared titles |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-005` Persona 'researcher' Central Vault root files match expected | 5 files: ['Data Engineering Pathway (1).pdf', 'I want the perfected roadmap, all free resources link to learn every single thing. you can add paid resources links, but those are alternative. find the best free courses, resources. and make the best guidline specially for me.pdf', 'Untitled document.pdf', 'paperCRA.pdf', 'paperJZRE.pdf'] |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-006` Persona 'researcher' Vault UI shows expected files | looked for ['Data Engineering Pathway (1).pdf', 'Untitled document.pdf', 'paperCRA.pdf', 'paperJZRE.pdf']; 5-file root (long names asserted via API only) |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-007` Persona 'researcher' sign-out returns to landing | session token cleared |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-008` Persona 'student' login resolves to 'usr_student' | ui uid=usr_student |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-009` Persona 'student' LaTeX API list includes both shared usr_admin projects | 2 projects; titles=['Nature Communications Evaluation Manuscript', 'CRUD Probe 4'] |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-010` Persona 'student' LaTeX Studio UI shows shared usr_admin projects | Projects workspace renders both shared titles |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-011` Persona 'student' Central Vault root files match expected | 2 files: ['paperCRA.pdf', 'paperJZRE.pdf'] |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-012` Persona 'student' Vault UI shows expected files | looked for ['paperCRA.pdf', 'paperJZRE.pdf']; 2-file root (long names asserted via API only) |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-013` Persona 'student' sign-out returns to landing | session token cleared |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-014` Persona 'reviewer' login resolves to 'usr_reviewer' | ui uid=usr_reviewer |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-015` Persona 'reviewer' LaTeX API list includes both shared usr_admin projects | 2 projects; titles=['Nature Communications Evaluation Manuscript', 'CRUD Probe 4'] |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-016` Persona 'reviewer' LaTeX Studio UI shows shared usr_admin projects | Projects workspace renders both shared titles |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-017` Persona 'reviewer' Central Vault root files match expected | 1 files: ['paperCRA.pdf'] |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-018` Persona 'reviewer' Vault UI shows expected files | looked for ['paperCRA.pdf']; 1-file root (long names asserted via API only) |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-019` Persona 'reviewer' sign-out returns to landing | session token cleared |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-020` Persona 'programmer' login resolves to 'usr_programmer' | ui uid=usr_programmer |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-021` Persona 'programmer' LaTeX API list includes both shared usr_admin projects | 2 projects; titles=['Nature Communications Evaluation Manuscript', 'CRUD Probe 4'] |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-022` Persona 'programmer' LaTeX Studio UI shows shared usr_admin projects | Projects workspace renders both shared titles |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-023` Persona 'programmer' Central Vault root files match expected | 0 files: [] |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-024` Persona 'programmer' Vault UI shows empty state | no own root files -> 'Folder is empty' |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-025` Persona 'programmer' sign-out returns to landing | session token cleared |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-026` Persona 'admin' login resolves to 'usr_default' | ui uid=usr_default |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-027` Persona 'admin' LaTeX API list includes both shared usr_admin projects | 2 projects; titles=['Nature Communications Evaluation Manuscript', 'CRUD Probe 4'] |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-028` Persona 'admin' LaTeX Studio UI shows shared usr_admin projects | Projects workspace renders both shared titles |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-029` Persona 'admin' Central Vault root files match expected | 0 files: [] |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-030` Persona 'admin' Vault UI shows empty state | no own root files -> 'Folder is empty' |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-031` Persona 'admin' sign-out returns to landing | session token cleared |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-032` Persona 'professor' login resolves to 'usr_professor' | ui uid=usr_professor -- ui uid=usr_professor -- the Faculty Professor persona now auto-provisions its own usr_professor scope (was previously collapsing onto usr_researcher due to a missing 'professor' entry in the login provisioning whitelist). |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-033` Persona 'professor' no longer overlaps usr_researcher (fixed) | ui uid=usr_professor -- the Faculty Professor persona now auto-provisions its own usr_professor scope (was previously collapsing onto usr_researcher due to a missing 'professor' entry in the login provisioning whitelist). |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-034` Persona 'professor' LaTeX API list includes both shared usr_admin projects | 2 projects; titles=['Nature Communications Evaluation Manuscript', 'CRUD Probe 4'] |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-035` Persona 'professor' LaTeX Studio UI shows shared usr_admin projects | Projects workspace renders both shared titles |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-036` Persona 'professor' Central Vault root files match expected | 0 files: [] |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-037` Persona 'professor' Vault UI shows empty state | no own root files -> 'Folder is empty' |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-038` Persona 'professor' sign-out returns to landing | session token cleared |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-039` Fresh @test.local owner account registered via API | email=wfown_1790199284757_7dc978@test.local uid=usr_1790199284887 |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-040` Snapshot current theme for fresh account | theme=obsidian-core |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-041` Set theme to 'topography-dark' via profile API | HTTP 200 |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-042` Theme change persisted in GET profile | theme=topography-dark |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-043` Original theme restored after test | theme=obsidian-core |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-044` Owner A creates a private LaTeX project via API (isolation setup) | HTTP 200 |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-045` Owner A uploads a private vault file via API (isolation setup) | HTTP 200 |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-046` Owner A owns the private LaTeX project (setup) | title=ISO-Private-Paper-99287 |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-047` Owner A owns the private vault file (setup) | iso_private_99287.pdf |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-048` Reviewer API LaTeX list does NOT contain owner A's private project | reviewer=2 projects, A's title absent |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-049` Reviewer API Vault files do NOT contain owner A's private file | reviewer=1 files, A's file absent |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-050` Reviewer UI LaTeX workspace does NOT show owner A's private project | title absent from Projects workspace |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-051` Reviewer UI Vault Files tab does NOT show owner A's private file | filename absent from Files tab |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-052` Fresh owner logs into the UI with credentials | sign-in + Command Matrix |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-053` UI modal creates project T1 (New Research Paper -> Initialize Project in Database) | title=Workflow UI Paper A 99338 present in API list |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-054` UI modal creates project T2 | title=Workflow UI Paper B 99338 present in API list |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-055` Both created projects are owned by the fresh account | own titles=['Workflow UI Paper B 99338', 'Workflow UI Paper A 99338', 'ISO-Private-Paper-99287', 'Nature Communications Evaluation Manuscript', 'CRUD Probe 4'] |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-056` Projects workspace renders both new + shared usr_admin projects | T1/T2 visible alongside global admin manuscripts |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-057` UI trash-icon delete removes T1 (handleDeleteProject + API DELETE) | title=Workflow UI Paper A 99338 no longer in API list |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-058` T1 card disappears from the Projects workspace after delete | T1 gone, T2 still rendered |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-059` T2 deleted via DELETE /api/latex/projects/{id} | HTTP 200 pid=proj_1790199370384 (owner-scoped user_id=usr_1790199284887) |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-060` Ownership guard: un-owned project DELETE rejected (403) and survives | HTTP 403 on shared pid=proj_1790165366885; still present=True |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-061` Cleanup ran for the test owner account | {'latex_project_files(proj)': 2, 'latex_comments(proj)': 0, 'latex_references(proj)': 0, 'latex_versions(proj)': 1, 'latex_vault_backups(proj)': 0, 'latex_projects': 1, 'latex_references': 0, 'latex_versions': 0, 'latex_ |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-062` Shared usr_admin LaTeX projects untouched by workflow tests | usr_admin projects=2 |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-063` Cleanup removed all owner rows in 'users' | 0 rows left |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-064` Cleanup removed all owner rows in 'scholar_profiles' | 0 rows left |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-065` Cleanup removed all owner rows in 'latex_projects' | 0 rows left |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-066` Cleanup removed all owner rows in 'file_system' | 0 rows left |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-067` Cleanup removed all owner rows in 'global_vault_notes' | 0 rows left |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-068` Cleanup removed all owner rows in 'insightlens_workspaces' | 0 rows left |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-069` Cleanup removed all owner rows in 'domain_workspaces' | 0 rows left |
| ✅ PASS | `Full User Workflow Testing (UI + API + DB)-070` Zero @test.local users remain after cleanup | leftover test users=0 |

---
*Generated by the ScholarGrid E2E test harness. See `tests/README.md` for how to re-run.*