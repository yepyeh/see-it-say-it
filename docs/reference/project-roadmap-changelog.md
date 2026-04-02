# **See It Say It — Project Roadmap & Changelog**

This document tracks our progress from initial concept to a production-ready civic utility. We prioritize transparency, privacy, and community-driven development.

## **🗺️ Product Roadmap**

### **🟢 Phase 1: The Foundation (Current Sprint)**

*Focus: Reliable reporting and zero-cost infrastructure.*

* \[x\] **Passwordless Auth:** Secure OTP email system via Resend.  
* \[x\] **Offline Queue:** Service Worker implementation for low-signal reporting.  
* \[x\] **Media Engine:** R2-backed image uploads with client-side compression.  
* \[ \] **Spatial Routing:** Real UK Council boundary matching via ONS GeoJSON.  
* \[ \] **Protomaps Integration:** Self-hosted vector tiles for $0/mo map scaling.

### **🟡 Phase 2: Intelligence & Closing the Loop (Q3 2024\)**

*Focus: Accountability and automation.*

* \[ \] **Resolution Stories:** Mandatory "After" photos and fix-notes from authorities.  
* \[ \] **AI-Assisted Privacy:** Automated blurring of faces/license plates via Workers AI.  
* \[ \] **Smart Categorization:** Image recognition to suggest report types.  
* \[ \] **Sustainability Engine:** Stripe-backed community funding and "Supporter" badges.

### **🔵 Phase 3: Community & Scale (2025)**

*Focus: Network effects and deep integration.*

* \[ \] **Neighborhood Alerts:** Push notifications for issues in your "Watched Zones."  
* \[ \] **Impact Dashboard:** Personal and community-wide "Repairs Sparked" metrics.  
* \[ \] **Authority API:** Direct ingestion for legacy Council GIS/CRM systems.

## **🪵 Changelog**

### **\[0.2.0\] — 2024-04-02 (In Progress)**

**Added**

* Implementation of **Geist Sans** font for improved legibility.  
* Added **Shadcn/ui Drawer** system for mobile-first reporting.  
* Integrated **Cloudflare D1** migration scripts for production database parity.

**Changed**

* Refactored Auth flow to move email verification *after* report capture to reduce friction.  
* Updated Map engine to **MapLibre GL JS** for better performance.

### **\[0.1.0\] — 2024-03-15**

**Initial Alpha Release**

* Core PWA manifest and Service Worker baseline.  
* Basic "Report" button with camera access.  
* Anonymous reporting enabled for testing.  
* Initial Cloudflare R2 bucket configuration.

## **📈 Vital Signs (For Investors)**

* **Stack:** Astro, Tailwind, Shadcn/ui, Cloudflare (D1, R2, Workers).  
* **Current Operating Cost:** £0.00/mo (Projected to remain at zero until \>5k MAU).  
* **Deployment Integrity:** Automated CI/CD via GitHub Actions.