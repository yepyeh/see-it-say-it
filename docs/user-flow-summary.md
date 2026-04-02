# User Flow Summary

The latest flow map sharpens the sequencing for onboarding, reporting, support, and retention.

Working guidance:

- First entry should be a low-friction onboarding flow with permissions, preferences, and a strong first-report CTA.
- Reporting should begin from the map context, open camera first, and keep steps inside a bottom-sheet style flow.
- Authentication should happen late in the flow, only when needed to complete submission.
- Success should feel immediate, with optimistic UI even if upload or dispatch continues in the background.
- Post-report completion should route into `My Reports`, not leave the user at a dead-end success message.
- Support should be framed as a lightweight post-success contribution flow.
- Longer-term retention should use an impact view that shows repairs, resolution stories, and shareable outcomes.

Implementation consequence:

The app now has the underlying auth and submission pipeline for this flow, but the next product pass should reorder the reporting UI toward `camera -> location -> details -> OTP -> success -> my reports`, with the map remaining visible throughout.
