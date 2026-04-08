# See It Say It Technical Launch Checklist

Updated: 2026-04-08

This document is the repo-level reference for production readiness. It mirrors the hidden internal launch checklist in the app and should be used to decide when the project is ready to move onto `app.seeitsayit.app`.

## Launch blockers

These should be complete before the production domain migration.

- Stripe revenue loop
  - Complete one real or test transaction.
  - Confirm webhook reconciliation updates supporter state within seconds.
  - Verify failed or cancelled payment handling.
- Authority workflow QA
  - Run the full path without manual database intervention:
    - access request
    - admin approval
    - triage
    - status change
    - resolution story
    - revoke or downgrade where relevant
- Production-domain dry run
  - Update `APP_BASE_URL` in a controlled pass.
  - Verify auth redirects, email links, public pages, report pages, authority pages, zone pages, and Stripe webhook behavior.
- Host-sensitive config audit
  - Confirm Stripe webhook secret, VAPID config, base URL, and any redirect or callback assumptions are correct for the production host.
- D1 backup confirmation
  - Verify Cloudflare backup posture before public data starts accumulating.
- Basic performance hygiene
  - Reduce the current large-chunk risk enough that field use on weak networks is acceptable.
  - Ensure report-only users are not paying for authority-shell code they never use.

## Fallback acceptable for launch

These areas can ship with explicit guardrails and honest product language.

- Native iPhone banner push can remain unresolved at launch if:
  - in-app notifications work
  - email or digest fallback exists
  - the product does not over-promise native push delivery
- The report flow can launch on the current stable functional baseline while the approved redesign remains in progress.
- Recurring support management can launch with a temporary manual support path if supporter state and Stripe reconciliation are working, but Stripe customer portal support should follow soon after.
- Deeper department-level routing can continue post-launch as long as authority-level routing and unclaimed-area participation states remain honest and visible.

## Can slip post-launch

- Public verification layer for confirmations and “I saw this too” civic signal
- Authority dialogue and clarifying questions on the report timeline
- Before and after proof as a stronger formal standard on resolution stories
- Predictive civic insights, recurrence analysis, and maintenance-planning signals
- Connector-ready integrations beyond the current structured routing and dispatch model
- Profile polish, stronger attribution surfaces, and expanded zone metrics or rankings

## Recommended execution order

1. Stripe verification
2. Authority workflow QA
3. Performance hygiene pass
4. Production-domain dry run
5. Push final decision
6. Production-domain migration
