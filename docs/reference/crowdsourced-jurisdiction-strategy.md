# **Strategy: Dynamic Jurisdiction & Crowdsourced Intelligence**

This document outlines the fallback logic for when the automated ONS/GIS lookup fails or returns an "Unknown Authority" result, turning a technical failure into a community-led "Investigation."

## **1\. The "Community Investigation" UX**

When a user reports in an area where our database lacks a mapping (e.g., a new development, private land, or an international location), we trigger the **Contributor Flow** instead of a standard submission.

1. **The System Search:** GPS checks the D1 authorities table. No result found for that coordinate polygon.  
2. **The Bridge:** A drawer appears: *"We couldn't find the official authority for this spot yet. Our amazing users help us map the gaps—can you point us in the right direction?"*  
3. **The Contributor Options:**  
   * **Proximity Suggestions:** "Is it one of these nearby councils?" (Show a list of verified authorities within 10-20 miles).  
   * **Manual Entry:** "Do you know who manages this area? (e.g., 'National Trust', 'Private Landowner', 'Port of London Authority')".  
   * **Contact Scouting:** "Do you have a contact email for their maintenance team?" (User provides the destination).  
   * **The "Scout" Action:** "I don't know, but I'll share this with someone who might." (Triggers a unique "Help Needed" share link with OpenGraph metadata).

## **2\. The Learning Engine (Self-Correction)**

The system uses a **Weighted Probability** model to "learn" from user inputs over time, reducing future manual effort.

* **Step A (Submission):** User A reports an issue and manually enters "Greenwich Estate Management" with an email maintenance@greenwich.com.  
* **Step B (Initial Routing):** The report is tagged as UNVERIFIED\_AUTHORITY. It is sent to that email with a "Community-sourced" disclaimer asking the recipient to confirm they are the correct contact.  
* **Step C (Crowdsourced Validation):**  
  * If User B and User C in the same area confirm the same mapping, the system increases the "Confidence Score" for that authority/coordinate link.  
  * Other users can "Upvote" the jurisdiction choice: "Is this the right authority for this spot? \[Yes\] \[No\]".  
* **Step D (Verification):** Once an authority recipient clicks the unique link in the email and takes an action (e.g., updates status to 'RECEIVED'), the system marks that mapping as **Verified** for that coordinate polygon.

## **3\. Global "Generic" Fallbacks (The Bulletin Model)**

For regions without structured digital systems, the platform defaults to a social/bulletin model:

* **The Public Bulletin:** The report is pinned to the map with a **"Needs a Lead"** status. It becomes a task for the community to solve.  
* **The "Tagging" System:** Users can tag known organizations in the comments.  
* **The "Forward" Tracker:** Users can forward the report to any email address. The system tracks if that email address opens the report or responds, helping to identify "Shadow Authorities" who are actually doing the work.

## **🛠️ Developer Implementation Task (Sprint 1 Update)**

1. **D1 Schema Update:**  
   * authorities table: Add is\_verified (boolean), confidence\_score (int), and boundary\_geojson (optional).  
   * suggested\_mappings table: Store lat, long, suggested\_name, suggested\_email, and contributor\_user\_id.  
2. **Worker Logic:**  
   * If point-in-polygon fails, return a 404\_JURISDICTION code to the frontend.  
   * UI catches this and opens the **Contributor Drawer** (Shadcn/ui Drawer).  
3. **Intelligence Loop (Phase 2):**  
   * Implement a background job that uses **Gemini** to scrape user comments or manual entries for "Authority Names" and "Emails" to suggest new mappings to the project Admin for approval.

## **4\. Why This Works for Investors & Community**

* **Human-in-the-loop:** It turns users from passive reporters into "Civic Curators," increasing app "stickiness."  
* **Global Scaling:** We don't need a map of every council in the world to launch; the first few hundred users in a new region "teach" the app the local structure.  
* **Data Moat:** Over time, "See It Say It" becomes the only global database that knows who *actually* handles issues on unmapped, private, or complex land.