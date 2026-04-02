# **See It Say It \- User Flow Map**

This document outlines the logical journeys for each user type to ensure a seamless, "zero-clutter" experience.

## **Flow 0: Zero-Friction Onboarding & First Entry (New User)**

*Primary Goal: Permission grant, personalization, and immediate action in \< 5 steps.*

1. **Slide 1: The Promise:** High-impact "Before & After" image. Text: "See an issue. Say it to the right people. Watch it get fixed."  
2. **Slide 2: The Tools (Permissions):** \* **Location:** "We use your GPS to find the correct council automatically." \-\> \[Enable Location\]  
   * **Camera:** "Take photos of issues to provide proof." \-\> \[Enable Camera\]  
   * **Notifications:** "Get alerted when your report is resolved." \-\> \[Enable Notifications\]  
3. **Slide 3: Your Style (Preferences):**  
   * **Appearance:** Selection between \[Light\], \[Dark\], or \[System\].  
   * **Density:** Selection between \[Comfy\] or \[Compact\].  
   * **Communication:** Toggle options for \[Email\] and \[Push Notifications\].  
4. **Slide 4: The Community:** "See It Say It is community-funded and privacy-first. No ads, no tracking." \-\> \[Start Reporting\]  
5. **The First Entry (Dashboard Welcome):** \* **Empty State Hero:** Instead of a blank list, the user sees a clean, centered "Welcome" card.  
   * **The Hook:** "Your neighborhood is waiting. Seen something that needs fixing?"  
   * **Primary CTA:** A large, high-contrast button: **\[ \+ Report Your First Issue \]**.  
   * **Secondary CTA:** A subtle link: "Explore the map to see what's nearby."

## **Flow 1: The "Witness & Report" (Citizen)**

*Primary Goal: Submit a high-quality report in under 30 seconds.*

1. **Entry:** User opens PWA (Home Screen) or taps the Welcome CTA.  
2. **Landing:** Map view showing nearby pins \+ Large "Report" FAB (Floating Action Button).  
3. **Step 1 (Media):** Tap "Report" \-\> System Camera opens immediately.  
4. **Step 2 (Location):** GPS auto-locates \-\> User sees pin on map \-\> Option to "Adjust Pin".  
5. **Step 3 (Details):** AI Suggests Category \-\> User confirms/edits \-\> Adds optional note.  
6. **Step 4 (Identity):** \* *If logged out:* Prompt for Email \-\> OTP (Resend) \-\> Verified.  
   * *If logged in:* Skip to Submit.  
7. **Completion:** Success Animation \-\> "Report Sent" \-\> **Sustainability Hook:** "See It Say It is community-funded. Support our hosting? \[Support Us\]"  
8. **Post-Action:** Redirect to "My Reports" timeline (now populated with their first entry).

## **Flow 2: The "Support Us" (Sustainability)**

*Primary Goal: Convert a satisfied user into a micro-supporter.*

1. **Trigger A:** Post-report success screen.  
2. **Trigger B:** Link in User Profile/Settings.  
3. **Landing:** Minimalist "Sustainability" Page (Are.na style).  
   * Clear text: "Why we ask for support" (Hosting, D1/R2, Data Privacy).  
   * Progress Bar: "Monthly Hosting Goal: £150 / £200".  
4. **Action:** Select Tier (£3 / £5 / Custom) \-\> Stripe Checkout.  
5. **Confirmation:** "Thank you" message \-\> User gets "Supporter" badge.

## **Flow 4: The "Impact Check" (Long-term Retention)**

*Primary Goal: Re-engage the user with positive reinforcement.*

1. **Trigger:** User opens app after a week.  
2. **Profile Tab:** Tap "Your Impact".  
3. **Visuals:** \* "Total Repairs sparked: 5"  
   * "Before & After" gallery of their resolved reports.  
4. **Retention:** "Share your impact" button.

## **UI Guardrails for Flows:**

* **No "Back" Buttons:** Use clear "Cancel" or breadcrumbs in the Header for the Reporting flow.  
* **The Drawer Rule:** All steps should happen in a **Vaul Drawer** (Bottom Sheet) to keep the Map context visible.  
* **Optimistic UI:** Show the success state immediately while the file uploads in the background.