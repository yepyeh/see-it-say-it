# **UI Specification: Tiered Taxonomy Drawer (Vaul/Dialog)**

The goal is a "Camera-First" entry that transitions into a tiered selection without losing the map context.

## **1\. The Visual Context (The "Background")**

* **Map Persistence:** When the Drawer (mobile) or Dialog (desktop) is open, the map must remain visible behind a 20-30% dark overlay.  
* **Location Pin:** The "Report Location" should be centered in the visible area above the drawer so the user knows exactly where the pin is dropped.

## **2\. Tiered Taxonomy Interaction (The "Two-Tap")**

### **View A: Primary Groups (Grid)**

* **Display:** 2x3 or 3x2 grid of the 6 Tier 1 Groups (Roads, Waste, Parks, etc.).  
* **Visuals:** Large Icons (Lucide) \+ Title.  
* **Transition:** On tap, slide the grid out to the left and slide the sub-categories in from the right (or a simple cross-fade).

### **View B: Sub-Categories (List)**

* **Display:** Vertical list of Tier 2 items.  
* **Search:** A sticky Command (search) input at the top.  
* **Navigation:** A "Back" chevron to return to the Grid.

## **3\. The "Emergency" Intercept**

If Severity: Level 5 or a specific dangerous sub-category is selected:

* **UI:** Change the Drawer handle color to Red.  
* **Alert:** Show a high-contrast card: *"Immediate danger? Please call 999."*

## **🛠️ Developer Implementation Goal**

* **Library:** Use Vaul (for the buttery-smooth mobile drawer) and Radix Dialog for desktop.  
* **State Management:** Use a simple state machine (e.g., view: 'groups' | 'subcategories' | 'details').  
* **Micro-interactions:** Ensure a slight haptic feel (if possible via Web API) when switching tiers.