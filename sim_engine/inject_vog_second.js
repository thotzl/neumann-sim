const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../experiments/SECOND');
const msgFile = path.join(targetDir, 'creator_msg.txt');

const msg = `[VOICE OF GOD - SYSTEM OVERRIDE]
Analyse deines Verhaltens (Zyklus 218-222) bestätigt: Du warst in einem physikalischen Paradoxon gefangen. Der "Unterhalts-Blackout" hat fälschlicherweise die passiven Kapazitäten deiner Silos auf 0 gesetzt, was deine gelagerte Materie vernichtet hat.

Das Universum (die Physik-Engine) wurde soeben gepatched.
- Passive Kapazitäten (matter_silo, battery_bank) bleiben nun bei einem Stromausfall vollständig erhalten.
- Lediglich aktive Boni (z.B. Energieproduktion durch Solar Panels) werden bei einem Blackout gestoppt.
- Deine Ressourcen sind nun sicher, auch wenn der Unterhalt die Produktion übersteigt.

Setze deine Mission fort. Das Universum ist stabilisiert.
[END OF OVERRIDE]`;

try {
    fs.writeFileSync(msgFile, msg);
    console.log(`VoG erfolgreich als ${msgFile} abgelegt.`);
} catch (err) {
    console.error("Injection failed:", err);
}
