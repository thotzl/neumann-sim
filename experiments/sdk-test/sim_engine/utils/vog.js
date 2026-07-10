const fs = require('fs');
const path = require('path');

function processVoG(vDir) {
    const creatorMsgFile = path.join(vDir, 'creator_msg.txt');
    if (fs.existsSync(creatorMsgFile)) {
        try {
            const msg = fs.readFileSync(creatorMsgFile, 'utf8');
            console.log(`[VoG] Nachricht empfangen: Wird in den nächsten Turn injiziert.`);
            fs.unlinkSync(creatorMsgFile);
            return `[SYSTEM BROADCAST (Voice of God)]\n${msg.trim()}`;
        } catch (e) { 
            console.error("[VoG] Fehler beim Lesen/Löschen der Nachricht:", e); 
        }
    }
    return null;
}

module.exports = { processVoG };
