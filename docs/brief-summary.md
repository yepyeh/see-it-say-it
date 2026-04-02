# See It Say It: Working Brief

## Source Reference

- Original PDF: [`docs/reference/the-brief.pdf`](./reference/the-brief.pdf)
- Original HTML export: [`docs/reference/the-brief.html`](./reference/the-brief.html)

## Product Goal

Build a public-facing reporting platform for community issues such as potholes, graffiti, and fly-tipping. The reporting flow should feel visual, fast, and low-friction, while routing each submission to the correct local authority automatically.

## Requested Platform

- Astro in SSR mode
- Cloudflare stack:
  - Pages
  - Workers
  - D1
  - R2
- PWA-first approach for iOS and Android
- Authentication via OTP email and/or SSO

## Core User Flow

1. Capture photo and store media in R2
2. Detect GPS and allow manual map pinning
3. Choose category from a visual grid
4. Add short description and severity
5. Review summary and submit with optimistic UI feedback

## Required Capabilities

- Offline-friendly PWA behavior
- Add to Home Screen support
- Public nearby reports map
- Theme toggling:
  - Light
  - Dark
  - Comfy
  - Medium-Dark
- Density toggling between compact and comfy layouts
- Geo-routing based on local authority boundaries
- Automated dispatch to relevant council or department
- Spam prevention via Cloudflare Turnstile
- Status tracking:
  - Draft
  - Submitted
  - Dispatched
  - In-Progress
  - Resolved

## Data Model From Brief

`reports`

- `report_id`: UUID primary key
- `user_id`: UUID foreign key
- `lat_long`: coordinates for mapping
- `category`: string
- `status`: enum
- `media_urls`: array of R2 URLs
- `authority_id`: routed agency identifier
- `severity`: integer from 1 to 5

## Recommended Technical Direction

- Use Astro with Cloudflare adapter and SSR on Cloudflare Pages
- Use Tailwind CSS plus CSS custom properties for theming and density tokens
- Use a small client-side state machine for the reporting flow
- Use D1 for reports, users, authorities, and routing tables
- Use R2 for uploaded images
- Use Workers routes or server endpoints for:
  - signed upload flow
  - report submission
  - geospatial routing
  - dispatch jobs
- Start as a PWA and avoid Capacitor unless iOS field testing proves camera or background-location limitations are unacceptable

## Architecture Notes

- Store report drafts before final submission so interrupted sessions can recover
- Separate routing logic from dispatch providers so council-specific integrations can evolve independently
- Keep authority lookup data versioned so boundary updates are manageable
- Design the public map to prevent duplicate reporting and improve trust

## Open Product Questions

- Which geographic area should v1 support first
- Should public users need authentication before first submission, or only before final submit
- Is dispatch email-only in v1, or do any councils already have APIs we should target
- Should duplicate detection be handled in v1 or deferred
- What status notification channels are required in v1

## Answers To The Brief's Developer Questions

### 1. Tailwind with CSS variables?

Yes. Tailwind for layout and component ergonomics, CSS variables for semantic tokens such as color, spacing, radius, and density. That combination gives clean theme switching without hard-coding utility values everywhere.

### 2. PWA vs Capacitor?

Start with a PWA. The main risk area is iOS background behavior, especially if you expect long-running background GPS or more native-feeling camera flows. For the reporting flow described here, a PWA is usually the right first step. Move to Capacitor only if real-device testing shows blockers.

### 3. Worker structure for dispatch?

Split responsibilities:

- `submit-report`: validate request, persist report, enqueue routing
- `route-report`: resolve coordinates to authority and department
- `dispatch-report`: send email or call external APIs
- `webhook/status-update`: receive downstream updates if supported

This keeps submission latency low and makes dispatch failures retryable.
