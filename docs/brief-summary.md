# See It Say It: Working Brief

## Source Reference

- Original PDF: [`docs/reference/the-brief.pdf`](./reference/the-brief.pdf)
- Original HTML export: [`docs/reference/the-brief.html`](./reference/the-brief.html)
- Updated product specification: [`docs/reference/updated-product-specification.md`](./reference/updated-product-specification.md)
- Developer sprint roadmap: [`docs/reference/developer-sprint-roadmap.md`](./reference/developer-sprint-roadmap.md)
- Project roadmap and changelog reference: [`docs/reference/project-roadmap-changelog.md`](./reference/project-roadmap-changelog.md)
- Developer handover update: [`docs/reference/developer-handover-update.md`](./reference/developer-handover-update.md)
- Technical Q&A for developer: [`docs/reference/technical-qa-for-developer.md`](./reference/technical-qa-for-developer.md)
- Data taxonomy mapping: [`docs/reference/data-taxonomy-mapping.md`](./reference/data-taxonomy-mapping.md)

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
- Deployment via GitHub CI/CD to Cloudflare
- Authentication via OTP email and/or SSO
- Service Worker for offline queuing
- Add to Home Screen manifest and splash support

## Core User Flow

1. Capture photo and store media in R2
2. Detect GPS and allow manual map pinning
3. Choose category from a visual grid
4. Add short description, severity, and markdown-supported notes
5. Review summary and submit with optimistic UI feedback

## Required Capabilities

- Offline-friendly PWA behavior
- Service Worker support for queued submission in low-signal environments
- Add to Home Screen support
- Public nearby reports map
- Personal "My Reports" dashboard
- Authority dashboard for verified official users
- Theme toggling:
  - Light
  - Dark
  - Medium-Dark
- Density toggling between compact and comfy layouts
- Geo-routing based on local authority boundaries
- Automated dispatch to relevant council or department
- Spam prevention via Cloudflare Turnstile
- Rate limiting via Cloudflare edge controls
- Reverse geocoding for readable addresses or landmarks
- Duplicate detection within a 50 meter radius
- Crowdsourced confirmation or upvoting of existing reports
- Deep links per report with OpenGraph metadata
- Push and email lifecycle communications
- Stripe-backed "Support Us" flow with no reporting paywall
- Status tracking:
  - Draft
  - Submitted
  - Dispatched
  - In-Progress
  - Resolved

## Data Model Direction

`reports`

- `report_id`: UUID primary key
- `user_id`: UUID foreign key
- `lat_long`: coordinates for mapping
- `category`: string
- `status`: enum
- `media_urls`: array of R2 URLs
- `authority_id`: routed agency identifier
- `severity`: integer from 1 to 5

Additional entities now implied by the updated specification:

- jurisdictions GeoJSON metadata
- duplicate clusters or proximity checks
- report confirmations/upvotes
- authority users and scoped access
- notifications and delivery preferences
- support contributions and supporter badges
- shareable public report metadata
- transparency cost and KPI data feeds
- tiered category groups and sub-category routing metadata

## Recommended Technical Direction

- Use Astro with Cloudflare adapter and SSR on Cloudflare Pages
- Use Tailwind CSS, Shadcn/ui, and CSS custom properties for theming and density tokens
- Use a small client-side state machine for the reporting flow
- Use D1 for reports, users, authorities, and routing tables
- Use R2 for uploaded images
- Use a Service Worker-backed offline queue for deferred report submission
- Use MapLibre or Leaflet for the pin-adjustment map
- Use Workers routes or server endpoints for:
  - signed upload flow
  - report submission
  - geospatial routing
  - dispatch jobs
  - duplicate detection
  - shareable report pages
  - notification triggers
- Start as a PWA and avoid Capacitor unless real-device testing proves camera or background limitations are unacceptable

## Architecture Notes

- Store report drafts before final submission so interrupted sessions can recover
- Queue unsent reports locally so low-signal submission is resilient
- Separate routing logic from dispatch providers so council-specific integrations can evolve independently
- Keep authority lookup data versioned so boundary updates are manageable
- Design the public map to prevent duplicate reporting and improve trust
- Keep authority-facing data scoped to verified official accounts and jurisdiction boundaries
- Make every user-facing string locale-backed from day one
- Treat support contributions as sustainability infrastructure, not gated access

## Updated Scope Additions

- UI stack is now explicitly Shadcn/ui on Tailwind
- Drawer-based reporting steps are preferred on mobile
- OTP should use a 6-digit app-like verification flow
- Loading states should use skeleton patterns
- Public map, My Reports, and bottom navigation are now core product surfaces
- Duplicate detection and confirmation are part of the MVP shape
- Authority portal and export capability are in scope
- Sustainability/support flow is now an explicit product requirement
- MVP success metrics include OTP speed, low-signal reliability, and successful council matching

## Build Impact

### Highest-priority changes vs the previous brief

1. Offline queueing is no longer optional. The reporting flow must be resilient before richer polish work.
2. Tailwind and Shadcn/ui are now effectively locked in as the component direction.
3. Duplicate detection and confirmation should influence the data model early.
4. Authority access is no longer just routing infrastructure; it needs a real portal boundary.
5. Deep-linkable report pages and OpenGraph metadata need to be part of route design.
6. Supporter status and Stripe add a new user/account dimension that should not pollute core reporting tables.

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

## Additional Build References

- Component layout map: [`docs/reference/component-layout-map.md`](./reference/component-layout-map.md)
- User flow map: [`docs/reference/user-flow-map.md`](./reference/user-flow-map.md)
- Working summaries:
  - [`docs/component-layout-summary.md`](./component-layout-summary.md)
  - [`docs/user-flow-summary.md`](./user-flow-summary.md)

These should guide the next UI/product pass toward drawer-first reporting, persistent map context, stronger first-entry onboarding, and post-submit routing into `My Reports`.
