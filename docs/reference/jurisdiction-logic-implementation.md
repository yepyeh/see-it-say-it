# **Implementation Note: Jurisdiction Routing States**

To support the "Crowdsourced Strategy," the routing engine should return a structured status object. This allows the UI to react dynamically (e.g., opening a standard report vs. a contributor drawer).

## **1\. Resolved Routing States**

The src/lib/server/routing.ts should return one of the following states:

* **VERIFIED\_LAD**: Matches a known ONS boundary with a verified contact email in our DB.  
  * *Action:* Proceed to standard reporting flow.  
* **UNVERIFIED\_LAD**: Matches an ONS boundary, but we lack a specific department/contact email.  
  * *Action:* Trigger "Help us find the right department" UI.  
* **UNKNOWN\_ZONE**: No polygon match (outside UK or unmapped area).  
  * *Action:* Trigger full "Community Investigation" contributor drawer.  
* **PRIVATE\_LAND**: Matches a polygon marked as private/managed estate.  
  * *Action:* Prompt user for "Estate Management" contact info.

## **2\. D1 Schema Additions (suggested\_mappings)**

As the developer noted, we need to track user suggestions to build the "Learning Engine."

**Proposed Table: suggested\_mappings**

* id: UUID  
* report\_id: FK to reports  
* lat/lng: Point of interest  
* suggested\_authority\_name: String  
* suggested\_contact\_email: String  
* confidence\_score: Int (starts at 1, increments with upvotes)  
* is\_promoted: Boolean (set to true if Admin verifies)

## **3\. The "Department" Evolution**

As the developer transitions from "Which Council?" to "Which Department?", we will use the **Taxonomy Mapping** (Environment, Roads, Parks) to filter the destination within that Council.

* *Logic:* Council\_GSS \+ Category\_Group \= Target\_Email.  
* *Fallback:* If Target\_Email is null, the UI asks the user: "Do you know the specific team at \[Council Name\] that handles \[Category\]?"