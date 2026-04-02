# **See It Say It — Data Taxonomy Mapping**

This document translates the legacy WordPress categories, statuses, and severities into a streamlined, hierarchical format for the new Astro/D1 implementation.

## **1\. Report Categories (The "What")**

To prevent choice paralysis while maintaining high data granularity, we use a **Tiered Taxonomy**. This supports a "Drill-down" UI in the reporting drawer and robust filtering on the Map/Dashboard.

### **Tier 1: Primary Groupings (Filtering Level)**

These are the broad buckets used for high-level map filters and initial user selection.

| Primary Group | Icon Suggestion | Intent |
| :---- | :---- | :---- |
| **Roads & Transport** | Car | Anything on the carriage-way or pavement. |
| **Environment & Waste** | Trash-2 | Sanitation, cleanliness, and pollution issues. |
| **Parks & Open Spaces** | Tree-pine | Public green spaces and recreational areas. |
| **Public Safety** | Shield-alert | Hazards to life, limb, or property. |
| **Utilities & Assets** | Zap | Street-level infrastructure (water, power, comms). |
| **Cultural Heritage** | Landmark | Historical sites, monuments, and public art. |

### **Tier 2: Sub-Categories (Routing Level)**

These map directly to the legacy WordPress categories and determine which council department receives the report.

* **Roads & Transport:**  
  * Potholes / Road Surface Damage  
  * Street Lighting (Outage/Damaged)  
  * Traffic Signals & Signs  
  * Cycle Lanes & Pedestrian Crossings  
  * Abandoned Vehicles  
* **Environment & Waste:**  
  * Fly-Tipping (Illegal Dumping)  
  * Litter & Overflowing Bins  
  * Graffiti & Vandalism  
  * Dog Fouling  
  * Air / Noise Pollution  
* **Parks & Open Spaces:**  
  * Damaged Trees / Overgrown Vegetation  
  * Playground Equipment Damage  
  * Broken Benches / Fences  
  * Public Toilets  
* **Public Safety:**  
  * Dangerous Buildings / Structures  
  * Trip Hazards (Uneven Pavement)  
  * Exposed Wires / Electrical Hazards  
  * Syringes / Drug Paraphernalia  
* **Utilities & Assets:**  
  * Water Leaks / Burst Pipes  
  * Blocked Drains / Flooding  
  * Damaged Utility Cabinets  
* **Cultural Heritage:**  
  * Statues & Monuments  
  * Historical Building Damage  
  * Public Art Maintenance

## **2\. Report Statuses (The "Lifecycle")**

| New System State | Intent | Automated Action |
| :---- | :---- | :---- |
| PENDING | Newly submitted. | Sent to Council; User gets "Report Received" Email. |
| RECEIVED | Acknowledged by Authority. | Council opens the link; User sees "Under Review." |
| SCHEDULED | Action is planned. | Council sets a fix date; User notified of schedule. |
| RESOLVED | Work is complete. | Final "After" photo uploaded; User sees "Resolution Story." |
| ARCHIVED | Hidden from public map. | Preserved in user history/internal records. |

## **3\. Report Severities (The "Urgency")**

* **Informational (Level 1):** Non-urgent observations or general inquiries.  
* **Low (Level 2):** Cosmetic issues with no immediate risk (e.g., minor graffiti).  
* **Medium (Level 3):** Standard repairs affecting utility (e.g., a standard pothole).  
* **High (Level 4):** Significant issues affecting safety (e.g., broken streetlight on dark bend).  
* **Emergency (Level 5):** Immediate risk to life/property (e.g., exposed live wires). *UI Note: Trigger a "Call 999" prompt for Level 5\.*

## **🛠️ Developer Implementation Task**

1. **Schema Design:** Store category\_id (Tier 2\) and group\_id (Tier 1\) in the reports table for efficient filtering.  
2. **UI Logic:** Implement a "Two-Tap" selection in the Drawer. Tap Group \-\> Show filtered Sub-categories.  
3. **Filter Logic:** The Map UI should allow users to toggle entire Tier 1 groups (e.g., "Hide all Waste reports").