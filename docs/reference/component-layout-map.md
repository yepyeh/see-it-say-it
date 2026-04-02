# **See It Say It \- UI/UX Component Map (Shadcn/ui)**

This document maps specific **Shadcn/ui** components to their functional areas, ensuring consistent UX and a clean, "Thumb-Zone" optimized layout that adapts seamlessly from Mobile PWA to Desktop Browser.

## **1\. Global Shell & Responsive Adaptation**

The app uses a "Mobile-First, Desktop-Aware" strategy.

* **Mobile Navigation:** Custom Dock at the bottom (Thumb-zone).  
* **Desktop Navigation:** Persistent Sidebar or NavigationMenu at the top-left.  
* **Theme Management:** DropdownMenu in the Profile section.  
* **Notifications:** Sonner (Toasts). On mobile: Bottom-center. On desktop: Top-right.

## **2\. Onboarding Flow (The Entry)**

* **Mobile:** Full-screen Carousel with swipe gestures.  
* **Desktop:** A centered Dialog or Card with a max-width of 450px to prevent "information sprawl."  
* **Preferences:** \* ToggleGroup for Appearance (Light/Dark/System).  
  * RadioGroup for Density (Comfy/Compact).  
  * Switch for Communication Toggles.

## **3\. The Reporting Pipeline (The Core)**

* **Mobile Trigger:** Centered Floating Action Button (FAB).  
* **Desktop Trigger:** "Report Issue" button in the Top Sidebar/Header.  
* **Step 1-3 Container:**  
  * **Mobile:** Drawer (Vaul) sliding up from the bottom (60-90% height).  
  * **Desktop:** Dialog (Modal) centered on screen.  
* **Image Capture:** AspectRatio container.  
  * *Desktop Note:* Support drag-and-drop file zones using Input type "file".  
* **Auth:** InputOTP for the 6-digit verification code.

## **4\. The Map & Split-View Interface**

* **Mobile:** Full-screen map. Search bar is a floating Input at the top.  
* **Desktop (The Dashboard Look):** \* **Left Pane (1/3):** A searchable ScrollArea list of nearby reports.  
  * **Right Pane (2/3):** The interactive Map.  
  * *Result:* Tapping a list item pans the map; tapping a map pin scrolls the list.  
* **Pins:** Custom SVG markers. When tapped:  
  * **Mobile:** Drawer slides up.  
  * **Desktop:** Popover or Side-panel expands.

## **5\. Sustainability & Impact Pages (The "Are.na" Look)**

* **Financials:** Table with border-none and text-xs.  
* **Donation Tiers:** ToggleGroup for selecting £3/£5/£10.  
* **Impact Stats:** Large, bold Geist Sans numbers.  
* **Resolution Story:** Accordion for "How it was fixed" details.

## **6\. Layout Hierarchy & Breakpoints**

1. **Mobile (\< 768px):** Bottom Dock, Bottom Drawers, Full-screen Map.  
2. **Desktop (\> 768px):** Sidebar/Top-Nav, Centered Modals, Split-pane Map/List view.

## **UX Guardrails for the Developer**

* **Responsive Modifiers:** Use Tailwind prefixes (sm:, md:, lg:) to switch components (e.g., Drawer on mobile vs Dialog on desktop).  
* **Radius:** Set global-radius to 0.3rem (sm) for a crisp, professional look.  
* **Shadows:** Disable default Shadcn shadows; use 1px borders (border-muted).  
* **Interactive Targets:** \* **Mobile:** h-11 (44px) for all touch targets.  
  * **Desktop:** h-9 or h-10 is acceptable for mouse precision.