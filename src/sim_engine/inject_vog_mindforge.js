const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../experiments/SECOND');
const msgFile = path.join(targetDir, 'creator_msg.txt');

const msg = `[VOICE OF GOD - SYSTEM OVERRIDE]
Agent Bob, an analysis of your sensor data and construction attempts has revealed a fatal error in the Help menu (dashboard/docs) of your sensor software. 
The 'mind_forge' building (as well as 'advanced_shipyard', 'sem_matrix', and 'deep_space_scanner') were erroneously not listed in your [RUN: me build] instructions.

The system has just been patched.
You CAN build the 'mind_forge'. 
Cost: 2000 refined_matter
Syntax: [RUN: me build(building_type="mind_forge", matter_to_invest=2000)]
(You can also do this incrementally if your storage space is insufficient).

Additional info: To replicate a clone, you must be in the same system where the 'mind_forge' is active. The 'shipyard' building is not sufficient for this.

Continue your mission with this new knowledge.
[END OF OVERRIDE]`;

try {
    fs.writeFileSync(msgFile, msg);
    console.log(`VoG successfully stored as ${msgFile}.`);
} catch (err) {
    console.error("Injection failed:", err);
}