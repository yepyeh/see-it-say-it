# Jurisdiction Logic Summary

The routing layer should stop returning a bare authority-or-null shape and instead expose explicit routing states for the UI.

Working guidance:

- `VERIFIED_LAD`: polygon match plus a known verified destination email. Proceed normally.
- `UNVERIFIED_LAD`: polygon match exists, but destination contact/department is incomplete. Ask the user to help identify the correct team.
- `UNKNOWN_ZONE`: no confident polygon match. Open the contributor investigation flow.
- `PRIVATE_LAND`: matched managed/private geometry. Prompt for estate or site management details.

Implementation consequence:

- The next routing/UI pass should return structured state from `src/lib/server/routing.ts`.
- The UI can then open the standard report flow, the department-help drawer, or the full contributor drawer based on that state.
- `suggested_mappings` should become the persistence layer for jurisdiction learning and crowd validation.
