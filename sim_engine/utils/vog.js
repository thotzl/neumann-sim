const fs = require('fs');
const path = require('path');

function processVoG(vDir) {
    const creatorMsgFile = path.join(vDir, 'creator_msg.txt');
    if (fs.existsSync(creatorMsgFile)) {
        try {
            const msg = fs.readFileSync(creatorMsgFile, 'utf8');
            console.log(`[VoG] Message received: Will be injected into the next turn.`);
            fs.unlinkSync(creatorMsgFile);
            return `[SYSTEM BROADCAST (Voice of God)]\n${msg.trim()}`;
        } catch (e) { 
            console.error("[VoG] Error reading/deleting message:", e); 
        }
    }
    return null;
}

module.exports = { processVoG };
