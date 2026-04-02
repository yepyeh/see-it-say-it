# UI Style Summary

## Source Reference

- Full guide: [`docs/reference/ui-ux-style-guide.md`](./reference/ui-ux-style-guide.md)

## Required Design Direction

- Use Shadcn/ui with Tailwind CSS
- Favor an Are.na-like utility aesthetic
- Prefer flat layouts, subtle borders, and minimal visual noise
- Prioritize labels over decorative icons
- Keep one clear primary action per screen

## Mobile Interaction Rules

- Put primary interaction zones in the bottom 60 percent of the screen
- Avoid centered modals on mobile
- Prefer drawer-style step progression
- Keep tap targets at roughly 44px minimum height
- Always provide visible loading and success feedback

## Information Density Rules

- Show the essential 80 percent first
- Hide metadata, technical details, and logs behind progressive disclosure
- Use clean empty states rather than blank screens

## Component Guidance

- Use secondary or outline buttons by default
- Reserve solid primary buttons for final confirmation actions
- Avoid excessive card nesting
- Prefer separators and simple grouped sections over ornamental containers
- Keep inputs plain and functional

## Status Palette Guidance

- Pending: soft gray
- In progress: soft blue
- Resolved: muted green
- Critical: deep red, used sparingly

## Build Impact

- Current UI should be flattened over time to reduce glassmorphism and heavy surface treatment
- Reporting flow should move closer to one-question-per-step drawer behavior
- Future components should default toward utility and clarity over expressive decoration
