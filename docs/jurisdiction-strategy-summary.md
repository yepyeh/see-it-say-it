# Crowdsourced Jurisdiction Summary

This strategy defines the fallback path when automatic authority routing cannot confidently identify the right destination.

Working guidance:

- When polygon lookup fails or contact coverage is missing, do not treat it as a dead-end.
- Introduce a contributor flow that lets users suggest the managing body, nearby authority, or direct contact email.
- Store crowd-sourced mappings separately from verified authority records.
- Track confidence and verification over time instead of treating every manual suggestion as canon.
- Allow public “needs a lead” handling for regions or assets that do not map cleanly to council structures.

Implementation consequence:

- The routing layer should eventually return a structured “unknown or unverified jurisdiction” result, not just null.
- D1 needs room for `suggested_mappings`, verification state, and confidence scoring.
- The UI should later open a contributor drawer when routing fails or when no department/contact destination is known.
