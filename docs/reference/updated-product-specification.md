# **See It Say It \- Product Specification & Roadmap**

## **1\. Vision & Purpose**

"See It Say It" is a high-utility PWA designed to empower citizens to report local infrastructure, environmental, and safety issues. The platform automates the bridge between public witnessing and local authority action.

## **2\. Technical Core**

* **Architecture:** Astro (SSR) \+ Cloudflare Pages/Workers.  
* **Database:** Cloudflare D1 (SQL).  
* **Storage:** Cloudflare R2 (Media assets).  
* **Deployment:** GitHub CI/CD to Cloudflare.  
* **Platform Strategy:** PWA (Progressive Web App) first.  
  * *Requirement:* Must include a Service Worker for offline queuing of reports in low-signal areas.  
  * *Requirement:* Manifest must support "Add to Home Screen" with native-like splash screens.

## **3\. Design System & UI Foundations**

The UI must be built on **CSS Variables** to support dynamic user-controlled themes.

### **A. Theme Modes (Color)**

* **Light:** High contrast, clean white/gray surfaces.  
* **Dark:** Deep grays/blacks for night reporting.  
* **Medium-Dark:** Softer contrast for low-light but readable conditions.

### **B. Density Modes (Layout)**

* **Compact:** Tight margins, smaller icons, maximum data density for power users.  
* **Comfy:** Large tap targets (min 44x44px), generous whitespace, optimized for one-handed use while walking.

## **4\. Primary UI Library: Shadcn/ui**

To ensure a high-performance, "app-like" mobile interface, we are using **Shadcn/ui** (built on Tailwind CSS and Radix UI).

* **Mobile Overlays:** Use the Drawer component (Vaul) for all reporting steps to ensure a bottom-up slide-in experience.  
* **Auth Experience:** Utilize the InputOTP component for a seamless 6-digit verification flow.  
* **Loading States:** Implement Skeleton primitives to prevent layout shift during data fetching.

## **5\. The Reporting Pipeline (Step-by-Step Flow)**

### **Step 1: Capture (Visual)**

* User opens camera or uploads from gallery.  
* **Tech Spec:** Client-side compression before upload to R2 to save bandwidth.

### **Step 2: Geolocation (Where)**

* Automatic GPS grab on page load.  
* Interactive Map (Leaflet/MapLibre) allowing user to "Fine-tune" the pin.  
* **Reverse Geocoding:** Convert coordinates to a readable nearest address/landmark.

### **Step 3: Categorization & Detail (What & Why)**

* **Categories:** Infrastructure, Environmental, Safety, Cultural Heritage.  
* **Severity:** 1-5 scale (Visualized with colors/emojis).  
* **Notes:** Markdown-supported text field.

### **Step 4: Routing & Dispatch (Automation)**

* **Logic:** System queries a Jurisdictions GeoJSON table in D1.  
* **Action:** Match Coordinates \-\> Identify Council \-\> Retrieve Contact API/Email.

## **6\. User Features**

* **Auth:** Passwordless OTP (Email) or SSO (Google/Apple).  
* **My Reports:** A personal dashboard showing "Status" updates.  
* **Public Map:** A community view showing nearby pins to prevent duplicate reporting.

## **7\. Security & Privacy**

* **PII Protection:** Option for automated face/license plate blurring in uploads.  
* **Rate Limiting:** IP-based limits via Cloudflare WAF to prevent spam.

## **8\. Authority Portal & Data Access**

* **The Authority Dashboard:** Authenticated access for verified .gov or official partner emails.  
* **Jurisdiction View:** Councils only see reports within their GeoJSON boundary.  
* **Data Export:** CSV/JSON Export and REST API for ingestion into legacy GIS systems.

## **9\. Mobile-First UX (The "App" Experience)**

### **A. Thumb-Zone Optimization**

* **Bottom Navigation:** Primary actions (Report, Map, Profile) in a bottom-docked bar.  
* **The "Big Button":** The "Report Now" action as a central Floating Action Button (FAB).

### **B. Interaction & Gestures**

* **No Hover States:** Interfaces must not rely on "hover" to show information.  
* **Pull-to-Refresh:** Implement for the Map and "My Reports" feed.

## **10\. Real-World Reliability Features**

### **A. Duplicate Management (Anti-Spam)**

* **Proximity Check:** Check for existing reports within a 50-meter radius.  
* **Crowdsourced Verification:** Allow users to "Upvote" or "Confirm" an existing report.

### **B. Social Sharing & Viral Loop**

* **Deep Linking:** Every report must have a unique URL with OpenGraph meta tags for rich social previews.

## **11\. Lifecycle Communications (Push & Email Only)**

To maintain engagement without high per-message costs, the system uses a dual-channel strategy (Web Push API \+ Transactional Email via Resend/Postmark).

## **12\. Sustainability & "Support Us" Flow (Are.na Inspired)**

As the project grows, hosting, licensing, and data protection costs will increase. We will implement a transparent model to ensure long-term viability.

### **A. The Sustainability Page**

* **Radical Transparency:** Use the Are.na aesthetic (minimalist, typography-heavy) to break down operational costs (Database, Storage, Auth, Map Tile usage).  
* **Open Financials:** (Optional) A section showing the platform's current monthly burn rate vs. community contributions.

### **B. Contribution Tiers & Perks**

* **Citizen Supporter:** A micro-subscription (e.g., £3/mo) to cover infrastructure costs.  
* **Supporter Status:** A subtle badge/icon appears on the user's profile and public report pins to recognize their contribution.  
* **Zero Paywalls:** Reporting must always remain free; support is for the *existence* of the platform, not for feature access.

### **C. Implementation Details**

* **Provider:** Stripe Checkout for simple, secure one-time or recurring payments.  
* **Placement:** A "Support this Project" link in the footer/profile and a "Success" message after a report is submitted suggesting a small donation.

## **13\. Phase 1 Success Metrics (MVP)**

1. User can log in via OTP in under 15 seconds.  
2. A report can be submitted with 0% failure in low-signal.  
3. The system correctly identifies a Council boundary and presents a "Support Us" prompt upon completion.