# **Technical Implementation & Vendor Selection (Zero-Cost Focus)**

This guide addresses the specific technical requirements for the "See It Say It" developer to move from MVP to a production-ready system while maintaining a $0/mo operating cost.

## **1\. Authority & Jurisdiction Data (UK)**

To avoid per-query API costs from providers like Mapit, we will move to a self-hosted spatial lookup.

* **Free Strategy:** Download the **ONS Local Authority Districts (UK) GeoJSON** from the [ONS Open Geography Portal](https://geoportal.statistics.gov.uk/).  
* **Implementation:** \* Store the GeoJSON file (approx 5-10MB) in **Cloudflare R2** (Free Tier: 10GB storage).  
  * Use a lightweight JavaScript library like boolean-point-in-polygon within a **Cloudflare Worker** to determine the council locally.  
* **Routing Logic:** Create a static JSON mapping file that links Council Names to their public "Report an Issue" email addresses.

## **2\. Email Provider (OTP & Notifications)**

* **Free Choice: Resend**  
  * **Free Tier:** 3,000 emails per month, 100 emails per day.  
  * **Strategy:** This is more than enough for a Phase 1 launch. If the daily limit is hit, the developer can implement a "queue" in the D1 database to send deferred notifications the next day.  
* **Alternative:** **SendGrid** also offers a permanent free tier of 100 emails/day if Resend's limit is reached.

## **3\. Map & Geocoding Provider**

Map tiles are usually the most expensive part of a project. Here is how to get them for free:

* **Map Engine:** **MapLibre GL JS** (Free/Open Source).  
* **Tile Provider:** **Protomaps**.  
  * **The Zero-Cost Trick:** Instead of a subscription service, the developer can generate a .pmtiles file of the UK (from OpenStreetMap data) and host it on **Cloudflare R2**.  
  * **Result:** You pay $0 for map tiles regardless of how many people view the map.  
* **Geocoding (Address Search):** **Photon (by Komoot)**.  
  * **API:** https://photon.komoot.io/api/  
  * **Cost:** Completely free, no API key required, based on OpenStreetMap data.

## **4\. Branding & UI "Tightening"**

* **Font:** **Geist Sans** via Google Fonts (Free/Open Source).  
* **Icons:** **Lucide-React** (Free/Open Source).  
* **Infrastructure:** **Cloudflare Pages \+ D1 \+ R2**.  
  * Cloudflare has the most generous "Free Forever" tier for compute and databases in the industry.

## **5\. Summary for Developer (The "Zero-Bill" Stack)**

* **Data:** Self-host ONS GeoJSON on R2 \+ point-in-polygon lookup.  
* **Email:** **Resend** (Free Tier).  
* **Map:** **MapLibre** \+ **Protomaps** (Self-hosted on R2) for $0 tile costs.  
* **Search:** **Photon API** for free address geocoding.  
* **UI:** **Geist Sans** \+ **Lucide** icons (1.5px weight).