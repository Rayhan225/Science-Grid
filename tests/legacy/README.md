# Legacy Test & Diagnostic Scripts

These scripts were relocated here from `living-science-grid/` and
`living-science-grid/research_brain/` as part of consolidating all testing
under the `tests/` folder. **Nothing was deleted or modified** - only moved.

| Original location              | Files                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------ |
| `living-science-grid/`         | `test_system.py`, `test_spec_features.py`, `test_enhanced_features.py`, `check_endpoints.py`, `check_notes_schema.py`, `check_backend.py`, `verify_refactor.py` |
| `living-science-grid/research_brain/` | `test_suite.py`, `test_selenium_latex_suite.py`, `test_refactor_e2e.py`, `test_db_latex.py`, `test_input.json` |

**Status:** historical / superseded. The current, maintained suites live in the
parent directory (`tests/`): `test_backend_api.py`, `test_database.py`,
`test_frontend_selenium.py`, `test_user_workflows.py`.

## Note on relative paths

Scripts that previously resolved paths relative to `living-science-grid/`
(e.g. `test_system.py` checking `research_brain/`, or `check_backend.py`
finding `main.py`) may need their cwd or path constants adjusted if you run
them from here. They are preserved as-is for reference.

`.vscode/launch.json` has been updated to point at the new locations.
