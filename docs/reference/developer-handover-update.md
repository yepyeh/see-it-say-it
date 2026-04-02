# **See It Say It — Technical Handover & Sprint Specification**

**Project Goal:** To build a "Premium Utility" PWA for UK civic reporting that remains $0/mo to operate and follows a minimalist, transparency-first aesthetic (Are.na/Geist-inspired).

## **1\. Core Technical Stack & "Zero-Bill" Mandate**

To maintain a $0/mo operating cost while scaling, the developer must implement the following:

* **Hosting & Database:** Cloudflare Pages \+ D1 (SQL) \+ R2 (Storage).  
* **Map Infrastructure:** **MapLibre GL JS** using **Protomaps** (.pmtiles).  
  * *Action:* Serve the UK pmtiles directly from Cloudflare R2 to bypass Mapbox/Google API costs.  
* **Geocoding:** **Photon API** (OSM-based) for free address lookups.  
* **Email:** **Resend** (Free tier) for OTP and status notifications.  
* **Auth:** Passwordless email OTP using Shadcn/ui InputOTP.

## **2\. UI/UX System (Shadcn/ui \+ Tailwind)**

The app must feel "Native" on mobile but "Professional" in a browser.

### **The "Are.na" Aesthetic**

* **Typography:** **Geist Sans** (via Google Fonts).  
* **Hierarchy:** Use 1px borders (border-muted) and Separator components instead of heavy shadows.  
* **Iconography:** **Lucide-React** (set stroke-width to 1.5 for a refined look).

### **Responsive Strategy**

* **Mobile (\< 768px):** \* Bottom Dock for navigation.  
  * Drawer (Vaul) for all reporting steps and detail views.  
* **Desktop (\> 768px):** \* Sidebar navigation.  
  * Dialog (Modal) for reporting.  
  * **Split-Pane View:** 1/3 searchable list on left, 2/3 Map on right.

## **3\. High-Priority Logic Refactor**

### **Spatial Routing (The "LAD" Implementation)**

* **Data:** Ingest ONS Local Authority District (UK) GeoJSON into R2.  
* **Logic:** Implement point-in-polygon within the Cloudflare Worker to match GPS coordinates to the correct council GSS code locally.  
* **Routing:** Map GSS codes to a static contact directory for automated email dispatch.

### **Onboarding & Reporting Flow**

* **Step 1:** Onboarding (Permissions \-\> Style Preferences \-\> Privacy Promise).  
* **Step 2:** Dashboard Welcome (Empty State Hero with "Report Your First Issue" CTA).  
* **Step 3:** Camera-First Reporting (Keep Map visible in background via Drawer).  
* **Step 4:** Move Auth/Identity to the *end* of the first report to reduce bounce rate.

## **4\. Feature Roadmap (Sprints)**

### **Sprint 1: Routing & Map (The Foundation)**

* Ingest ONS boundary data.  
* Wire up Protomaps \+ MapLibre.  
* Set up GitHub Actions CI/CD to production domain.

### **Sprint 2: UI & Preferences (The Polish)**

* Implement adaptive Drawer/Dialog system.  
* Build "Comfy" vs "Compact" density toggle.  
* Persist Light/Dark/System themes.

### **Sprint 3: Operations & Sustainability (The Loop)**

* Build Authority Dashboard (Role-based access).  
* Implement Stripe "Support Us" flow.  
* Add "Resolution Story" requirement (After photo \+ Fix note).

## **5\. Transparency & Open Finances**

The developer should maintain a /public/data/costs.json file. This data will be used to render a "Live Transparency" table in the app, showing supporters exactly how their contributions cover infrastructure.

**KPIs to Track:**

* Average Report-to-Resolution time.  
* Community Impact (Total kg of waste cleared / number of repairs).  
* Infrastructure cost per 1,000 users.

**Authorized by:** \[Project Lead\]

**Lead Developer:** \[Developer Name\]

**Status:** In-Development (Phase 1 Baseline)