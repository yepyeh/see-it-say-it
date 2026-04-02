# Component & Layout Summary

The latest component map tightens the UI direction around a Shadcn-style shell with clear mobile and desktop mode switches.

Working guidance:

- Mobile navigation should converge on a bottom dock or FAB-led flow.
- Desktop navigation should move toward a sidebar or top-left navigation shell.
- Reporting steps should use a drawer-on-mobile, dialog-on-desktop split rather than the current always-inline prototype layout.
- OTP should map to an `InputOTP` style interaction rather than a plain text field.
- Map and feed surfaces should evolve into a split-view list/map dashboard on desktop.
- Notifications should use toast placement that changes by device context.
- Surfaces should stay flat: small radius, light borders, reduced default shadows.
- Touch targets should stay at least `44px` on mobile.

Implementation consequence:

The current reporting flow is functionally ahead of the desired layout system, but the next UI pass should refactor it toward `Drawer` and `Dialog` patterns instead of adding more inline panels.
