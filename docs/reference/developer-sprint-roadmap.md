# **See It Say It \- Developer Sprint Roadmap**

This roadmap organizes the remaining technical tasks into four logical sprints. Each sprint is designed to deliver a functional "chunk" of the app for review.

## **Sprint 1: The "Zero-Bill" Foundation & Routing**

**Goal:** Replace placeholders with real-world UK data and a scalable map.

* **Task 1: Spatial Routing:** Ingest ONS LAD boundary data into Cloudflare R2 and implement point-in-polygon routing in the Worker.  
* **Task 2: Map Infrastructure:** Move off the demo style; wire up **MapLibre \+ Protomaps** (UK .pmtiles) for $0/mo tile serving.  
* **Task 3: Geocoding:** Wrap **Photon API** behind a provider interface for free address lookups.  
* **Task 4: Deployment:** Set up GitHub Actions for CI/CD and attach the production domain (app.seeitsayit.app).

## **Sprint 2: The "Premium Utility" UI Refactor**

**Goal:** Implement the Shadcn/ui system and the high-end "Are.na" aesthetic.

* **Task 1: Adaptive Shell:** Build the responsive frame (Bottom Dock for mobile, Sidebar/Split-pane for desktop).  
* **Task 2: The Drawer System:** Implement Vaul Drawers for mobile reporting and Dialog modals for desktop.  
* **Task 3: Modern Auth UI:** Replace the plain OTP form with the InputOTP component.  
* **Task 4: Preferences Engine:** Build the logic to persist Light/Dark/System and Comfy/Compact settings across the device.

## **Sprint 3: The "Zero-Friction" Journey**

**Goal:** Polish the onboarding and the core reporting loop.

* **Task 1: Onboarding Flow:** Build the 4-slide sequence (Permissions \-\> Preferences \-\> Privacy \-\> Action).  
* **Task 2: The Welcome State:** Create the "Empty State Hero" with the immediate "Report Your First Issue" CTA.  
* **Task 3: The Reporting Loop:** Refactor the flow to be camera-first, keeping the map visible in the background drawer.  
* **Task 4: Post-Submit UX:** Implement "Optimistic UI" (show success immediately) and the transition to the "My Reports" timeline.

## **Sprint 4: Operations & Sustainability**

**Goal:** "Close the loop" with authorities and enable community funding.

* **Task 1: Authority Dashboard:** Build role-based access (Admin/Moderator) and the ability to update statuses and upload "Resolution Stories."  
* **Task 2: Notification Lifecycle:** Set up **Resend** for status update emails and prep the push notification groundwork.  
* **Task 3: Sustainability:** Integrate **Stripe** for the support flow and add the "Supporter" badge state.  
* **Task 4: Safety & Moderation:** Implement **Cloudflare Turnstile** and basic rate-limiting to prevent spam.

## **Developer Check-in Questions**

To ensure Sprint 1 stays on track, you can ask the developer:

1. "How is the performance of the point-in-polygon lookup in the Cloudflare Worker?"  
2. "Are the Protomaps tiles loading smoothly from R2?"  
3. "Do we have the Geist Sans font integrated into the Tailwind config yet?"