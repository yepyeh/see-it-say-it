# **Developer Q\&A: Data Taxonomy & UI Implementation**

This document anticipates technical queries regarding the migration from the legacy WordPress structure to the new Astro/D1 implementation.

### **Q1: How do we handle the "Legacy Data" migration?**

**Answer:** We are not doing a direct SQL import of the \~80 categories. Instead, use the **Tiered Taxonomy** in data\_taxonomy\_mapping.md.

* **Task:** Create a static categories.ts configuration file that maps the new IDs to the Tier 1 (Group) and Tier 2 (Sub-category) structure.  
* **Mapping:** Refer to the screenshots for "Accent Colors" and "Icons"—these should be stored as metadata in your config file to drive the UI.

### **Q2: What is the expected UI behavior for the "Two-Tap" selection?**

**Answer:** Since we are using Shadcn/ui Drawers on mobile:

1. **Initial View:** Show a grid of the 6 **Tier 1 Groups** (with icons).  
2. **On Tap:** Smoothly transition the drawer content (or slide to a second "page") showing the list of **Tier 2 Sub-categories** belonging to that group.  
3. **Power User Feature:** Include a small Command (search) input at the top of the drawer so users can type "pothole" to bypass the categories entirely.

### **Q3: How should we handle "Emergency" (Level 5\) severities?**

**Answer:** This requires a "UI Intercept."

* **Logic:** If a user selects a sub-category known for danger (e.g., "Exposed Wires") OR manually selects "Emergency" severity, the drawer should display a high-visibility warning: *"If this is an immediate risk to life, please call 999 instead of reporting here."*  
* **Routing:** These reports should be flagged in the D1 database with an is\_emergency: true boolean to prioritize them in the Council dispatch queue.

### **Q4: How do "Departments" map to "Jurisdictions"?**

**Answer:** \* The **ONS LAD Data** tells us *which* Council.

* The **Sub-category** tells us *which* Department.  
* **Implementation:** In your reports.ts logic, once a council is identified (e.g., "Camden"), look up the email alias associated with the sub-category's parent group (e.g., environment@camden.gov.uk).

### **Q5: Do we need to persist "Density" and "Theme" in the DB?**

**Answer:** \* **Preference Persistence:** Store "Density" (Comfy/Compact) and "Theme" (Light/Dark) in localStorage initially for the PWA experience.

* **Sync:** If the user is logged in (via OTP), sync these preferences to the users table in D1 so their experience is consistent across desktop and mobile.

### **Technical Constraints Reminder:**

* **Icons:** Use lucide-react. Ensure stroke-width={1.5}.  
* **Colors:** Use the hex codes from the legacy "Accent Color" fields in the screenshots for category badges to maintain visual continuity.  
* **Performance:** Ensure the categories.ts object is tree-shaken so only the necessary data is sent to the client-side drawer.