# Phase 2 Summary

## Source Reference

- Full roadmap: [`docs/reference/phase-2-roadmap.md`](./reference/phase-2-roadmap.md)

## Main Themes

- AI-assisted reporting with Workers AI
- deeper authority tooling
- stronger feedback and resolution visibility
- community participation and notification loops
- broader accessibility and translation support

## Planned Product Areas

### AI-assisted reporting

- automatic category suggestions from images
- AI-based severity suggestions
- mandatory face and license-plate blurring before storage

### Authority tools

- secure council-to-user clarification channel
- SLA and accountability reporting
- predictive hotspot analysis

### Resolution loop

- status timeline with explanatory stages
- required "after" photo when a report is resolved
- repair-method note from the authority
- personal impact dashboard for the reporter

### Community and sustainability

- neighborhood alerts
- community challenges
- sponsorship model
- transparency API for operating-cost visibility

### Accessibility and inclusivity

- multi-language support
- voice-to-report workflow

## Technical Signals

- Workers AI should be considered the primary AI path
- Vectorize is intended for semantic duplicate detection later
- privacy-preserving image handling must be part of the design
- webhook/CRM integrations will need to become more robust in later phases

## Build Impact

- Keep Phase 1 data structures extensible for timelines, chat, and authority uploads
- Avoid UI clutter; advanced intelligence features should remain secondary to the main report action
- Treat AI suggestions as assistive and editable, not authoritative
