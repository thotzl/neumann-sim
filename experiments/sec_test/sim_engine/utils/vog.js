const fs = require('fs');
const path = require('path');

function processVoG(vDir, state) {
    const creatorMsgFile = path.join(vDir, 'creator_msg.txt');
    if (fs.existsSync(creatorMsgFile)) {
        try {
            const msg = fs.readFileSync(creatorMsgFile, 'utf8');
            state.agents.forEach(a => {
                if (a.alive && state.histories[a.id]) {
                    state.histories[a.id].push({ agent: "System", text: `[SYSTEM BROADCAST (Voice of God)]\n${msg.trim()}` });
                }
            });
            console.log(`[VoG] Nachricht an alle aktiven Agenten gesendet.`);
            fs.unlinkSync(creatorMsgFile);
        } catch (e) { 
            console.error("[VoG] Fehler beim Lesen/Löschen der Nachricht:", e); 
        }
    }
}

module.exports = { processVoG };
