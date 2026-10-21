---
id: TCK-133
title: "Frontend: Passenger Cabin Layout & Schematics Visualization Mockup"
epic_phase: "Logistics and Swarm Mobility"
status: "closed"
priority: "high"
created: 2026-08-07
completed: 2026-08-10
dependencies: ["TCK-126"]
---

## Description
This ticket represents the successfully completed sub-feature of TCK-126: implementing the frontend layout, modal components, and mockup filter logic for rendering passengers onboard a vessel.

The HUD modal dynamically displays a passenger count and lists disembodied passenger Bobs by filtering agents whose `active_ship_id` matches the inspected vessel but who are not the primary pilot.

## Verification (Code SSoT)
- **File:** `hud/src/monitor/components/VesselSchematicModal.tsx`
  - Contains the layout rendering and filters passenger lists from the state logs using a mockup detection mechanism.
- **Verification Command:** `npm test` runs cleanly and demonstrates all visual rendering code is fully integrated and error-free.
