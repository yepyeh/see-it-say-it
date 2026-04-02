# UX Interaction Summary

This checklist defines the interaction quality bar for the reporting drawer.

Working guidance:

- The mobile sheet should feel close to Vaul, with clear snap behavior between half and full states.
- Tier transitions should feel immediate, ideally through slide or fade motion, without browser-level navigation.
- The sub-category view must include a clear breadcrumb or back action.
- The map should dim slightly while the drawer is active, but stay visible enough to preserve spatial awareness.
- The pin should stay visually centered in the visible map area.
- Sub-category search should filter instantly while typing.
- The mobile keyboard should not obscure the search field or break the drawer flow.

Implementation consequence:

- The drawer needs explicit half/full sheet modes.
- Search filtering should run locally on already-loaded taxonomy data.
- The map and drawer need to be designed together, not as separate screens.
