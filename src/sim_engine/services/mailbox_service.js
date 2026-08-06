const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const vogService = require('../modules/vog');

/**
 * Mailbox Service
 * Collects, filters, and routes SCUT radio transmissions and Voice of God (VoG) announcements
 * into the respective agent global inboxes on every turn synchronization.
 */
function routeMessages(vDir, universeDir, state) {
    // 1. Process Voice of God (VoG) announcements
    const vogMessage = vogService.processVoG(vDir);
    if (vogMessage) {
        state.agents.filter(a => a.alive).forEach(a => {
            if (!state.global_inbox[a.id]) state.global_inbox[a.id] = [];
            state.global_inbox[a.id].push({ type: 'vog', text: vogMessage });
        });
    }

    // 2. Fetch sub-etheric messages and names from database
    const dbPath = path.join(universeDir, 'universe.db');
    if (!fs.existsSync(dbPath)) {
        return; // Empty state, nothing to route
    }

    try {
        const scriptPath = path.join(vDir, 'core', 'bin', 'fetch_messages.py');
        const batchOut = execFileSync('python3', [scriptPath], {
            env: { ...process.env, TEST_DB_PATH: dbPath },
            encoding: 'utf8'
        });
        
        const batchData = JSON.parse(batchOut);
        state.agentNames = batchData.names;

        batchData.messages.forEach(m => {
            if (m.receiver === 'ALL') {
                // Global Broadcast (SCUT)
                state.agents.filter(a => a.alive && a.id !== m.sender).forEach(a => {
                    if (!state.global_inbox[a.id]) state.global_inbox[a.id] = [];
                    state.global_inbox[a.id].push({ type: 'scut', sender: m.sender, content: m.content, sent_at: m.sent_at });
                });
            } else {
                // Direct Private SCUT Msg
                if (!state.global_inbox[m.receiver]) state.global_inbox[m.receiver] = [];
                state.global_inbox[m.receiver].push({ type: 'scut', sender: m.sender, content: m.content, sent_at: m.sent_at });
            }
        });
    } catch (e) {
        console.error("[MAILBOX-ROUTE-ERROR]", e.message);
    }
}

module.exports = { routeMessages };
