# Reporting Drawer Summary

The reporting flow should preserve a strong spatial sense while category selection happens.

Working guidance:

- Keep the map visible behind a darkened overlay during category selection.
- Anchor the report location visually above the drawer so the user never loses the pin context.
- Use a two-tap taxonomy flow:
  - Tier 1 group grid first
  - Tier 2 sub-category list second
- Transition between tiers inside the same surface. No page refreshes or full route changes.
- Add a sticky search field at the top of the Tier 2 list.
- Escalate urgent selections visually:
  - red drawer handle
  - emergency prompt when danger is immediate

Implementation consequence:

- The reporting UI should act like a drawer on mobile and a contained sheet on desktop.
- Taxonomy selection should use an explicit UI state machine instead of static radio inputs.
- ONS routing status can live inside the drawer so users understand whether the current pin is verified or still unresolved.
