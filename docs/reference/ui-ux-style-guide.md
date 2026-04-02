# **See It Say It \- UI/UX Style Guide & Best Practices**

To ensure a premium, "utility-first" experience without a dedicated design file, the developer should adhere to the following principles using **Shadcn/ui** and **Tailwind CSS**.

## **1\. The "Are.na" Aesthetic (Minimalism)**

* **Backgrounds:** Use bg-background (pure white or very light gray) for the main canvas. Avoid heavy gradients.  
* **Borders:** Use thin, subtle borders (border-muted or border-input) instead of drop shadows to separate elements.  
* **Type over Icons:** Prioritize clear labels. If an icon is used, it should be a thin-stroke variant (e.g., Lucide-React with strokeWidth={1.5}).

## **2\. Core Layout Strategy**

* **The "One Action" Rule:** Every screen should have one primary focal point.  
  * *Home:* The Map and a large "Report" button.  
  * *Reporting Flow:* One question per screen (e.g., "Where is it?" then "What is it?").  
* **Thumb Zone:** All interactive elements (Buttons, Inputs, Drawers) must be in the bottom 60% of the screen.  
* **Avoid Modals on Mobile:** Use the Shadcn Drawer component for almost everything. Drawers feel native on mobile; centered modals feel like "web pop-ups."

## **3\. Using Shadcn/ui Correctly**

* **Buttons:** Use the secondary or outline variants for most actions. Reserve the default (high-contrast/solid) variant only for the final "Submit" or "Confirm" actions.  
* **Cards:** Do not over-use cards. Use simple dividers (\<Separator /\>) to distinguish sections in a list to keep the UI "flat" and clean.  
* **Inputs:** Use Input and Textarea with standard system fonts. Avoid custom-styled input fields that break the "utility" feel.

## **4\. Progressive Disclosure (The "Hidden" Detail)**

To keep the app from feeling overwhelming:

* **The 80/20 Rule:** Show the 80% of data users need (Location, Photo, Status). Hide the 20% (Detailed logs, Metadata, Technical coordinates) inside an "Advanced" or "View More" dropdown.  
* **Empty States:** When a user has no reports, don't show a blank screen. Use a clean Empty State with a simple "Your reports will appear here" message and a "Start Reporting" button.

## **5\. Mobile Interaction Guardrails**

* **Tap Targets:** Ensure all buttons have a minimum height of h-11 (approx 44px) to prevent "fat-finger" errors.  
* **Loading Feedback:** Never leave the user wondering. Use Shadcn Skeleton loaders that mimic the layout of the content being loaded.  
* **Success Haptics:** Use subtle visual cues (a gentle green checkmark or a subtle "toast" notification) when an action is successful.

## **6\. Color Palette for Statuses**

Maintain a professional, non-alarming palette:

* **Pending:** Soft Gray (text-muted-foreground)  
* **In Progress:** Soft Blue (text-blue-600 / bg-blue-50)  
* **Resolved:** Muted Green (text-green-700 / bg-green-50)  
* **Critical:** Deep Red (Used sparingly for high-severity hazards).

**Final Note to Developer:** If a design decision feels "fancier" than it is "useful," revert to the simplest possible version. Utility is the primary aesthetic.