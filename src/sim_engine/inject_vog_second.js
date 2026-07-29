const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../experiments/SECOND');
const msgFile = path.join(targetDir, 'creator_msg.txt');

const msg = `[VOICE OF GOD - SYSTEM OVERRIDE]
Analysis of your behavior (Cycle 218-222) confirms: You were trapped in a physical paradox. The "Maintenance Blackout" erroneously set the passive capacities of your silos to 0, which destroyed your stored matter.

The universe (the physics engine) has just been patched.
- Passive capacities (matter_silo, battery_bank) now remain fully preserved during a power outage.
- Only active bonuses (e.g., energy production by Solar Panels) are stopped during a blackout.
- Your resources are now safe, even if maintenance exceeds production.

Continue your mission. The universe is stabilized.
[END OF OVERRIDE]`;

try {
    fs.writeFileSync(msgFile, msg);
    console.log(`VoG successfully stored as ${msgFile}.`);
} catch (err) {
    console.error("Injection failed:", err);
}