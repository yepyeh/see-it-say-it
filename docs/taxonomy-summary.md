# Taxonomy & UI Summary

The latest taxonomy documents define the category and routing model more precisely than the earlier prototype.

Working guidance:

- Move from flat categories to a tiered taxonomy with `group_id` and `category_id`.
- Use six Tier 1 groups for high-level filtering and first-tap selection.
- Use Tier 2 sub-categories for routing and department/email mapping.
- Keep a search-first bypass so users can type directly to a sub-category.
- Flag Level 5 severity and specific dangerous categories as `is_emergency`.
- Route by council from ONS LAD matching, then by department from the selected category group.

Implementation consequence:

- The next data-model pass should add explicit category group/category fields and department routing metadata.
- The current Sprint 1 routing work should be designed so category-driven department dispatch can slot in without changing the council lookup path.
