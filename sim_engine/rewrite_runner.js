const fs = require('fs');

let lines = fs.readFileSync('sim_engine/runner.js', 'utf8').split('\n');
let out = [];
let skip = false;

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // State Inject
    if (line.includes('security: { acl: {}, wallets: {} }')) {
        out.push('            security: { acl: {}, wallets: {} },');
        out.push('            global_inbox: {}');
        continue;
    }
    if (line.includes('state.agents.forEach(a => { state.histories[a.id] = []; });')) {
        out.push('        state.agents.forEach(a => { state.histories[a.id] = []; state.global_inbox[a.id] = []; });');
        continue;
    }
    if (line.includes('if (!state.security) state.security = { acl: {}, wallets: {} };')) {
        out.push('        if (!state.security) state.security = { acl: {}, wallets: {} };');
        out.push('        if (!state.global_inbox) { state.global_inbox = {}; state.agents.forEach(a => state.global_inbox[a.id] = []); }');
        continue;
    }

    // Batching logic insert
    if (line.includes('stateManager.saveState(stateFile, state);') && lines[i-1].includes('bootstrapper.syncPopulation')) {
        out.push(line);
        out.push(`            state.agents.forEach(a => { if(!state.global_inbox[a.id]) state.global_inbox[a.id] = []; });
            const vogMessage = vogService.processVoG(vDir);
            if (vogMessage) {
                state.agents.filter(a => a.alive).forEach(a => state.global_inbox[a.id].push({ type: 'vog', text: vogMessage }));
            }
            try {
                const dbScript = \`
import sqlite3, json, os
conn = sqlite3.connect(os.environ['TEST_DB_PATH'])
conn.row_factory = sqlite3.Row
c = conn.cursor()
c.execute("SELECT sender, receiver, content FROM messages")
msgs = [dict(r) for r in c.fetchall()]
c.execute("DELETE FROM messages")
c.execute("SELECT location, actor_id, description FROM visual_events")
vis = [dict(r) for r in c.fetchall()]
c.execute("DELETE FROM visual_events")
conn.commit()
conn.close()
print(json.dumps({"messages": msgs, "visual_events": vis}))\`;
                const batchOut = require('child_process').execFileSync('python3', ['-c', dbScript], { env: { ...process.env, TEST_DB_PATH: path.join(universeDir, 'universe.db') }, encoding: 'utf8' });
                const batchData = JSON.parse(batchOut);
                batchData.messages.forEach(m => {
                    if (m.receiver === 'ALL') {
                        state.agents.filter(a => a.alive && a.id !== m.sender).forEach(a => state.global_inbox[a.id].push({ type: 'scut', sender: m.sender, content: m.content }));
                    } else {
                        if (state.global_inbox[m.receiver]) state.global_inbox[m.receiver].push({ type: 'scut', sender: m.sender, content: m.content });
                    }
                });
                batchData.visual_events.forEach(v => {
                    state.agents.filter(a => a.alive && a.location === v.location).forEach(a => state.global_inbox[a.id].push({ type: 'visual', description: v.description }));
                });
            } catch(e) { console.error("[BATCH-ERROR]", e.message); }`);
        continue;
    }

    // Delete VoG
    if (line.includes('const vogMessage = vogService.processVoG(vDir);')) { continue; }
    if (line.includes('if (vogMessage) {')) {
        skip = true;
        continue;
    }
    if (skip && line.includes('==================================================')) {
        out.push(line);
        skip = false;
        out.pop();
        continue;
    }

    // Delete Auto-Radio
    if (line.includes('let radioOutput = "";')) {
        skip = true;
        continue;
    }
    if (skip && line.includes('console.error(`[RADIO-ERROR] bei Agent ${agent.id}:`, e.message);')) {
        skip = false;
        continue;
    }
    if (skip && line.trim() === '}') {
        skip = false;
        continue;
    }
    if (line.includes('if (radioOutput) {')) {
        skip = true;
        continue;
    }
    
    // Inject Inbox Logic
    if (line.includes('let promptText = "";')) {
        out.push(line);
        out.push(`        const myInbox = state.global_inbox[agent.id] || [];
        let inboxText = "";
        if (myInbox.length > 0) {
            inboxText += "\\n[POSTEINGANG (Ereignisse des letzten Zyklus)]:\\n";
            myInbox.forEach(item => {
                if (item.type === 'vog') inboxText += \`[VOICE OF GOD]: \${item.text}\\n\`;
                if (item.type === 'scut') inboxText += \`[SCUT] Von \${item.sender}: \${item.content}\\n\`;
                if (item.type === 'visual') inboxText += \`[OBSERVER] \${item.description}\\n\`;
            });
            state.global_inbox[agent.id] = [];
        }
        if (inboxText) { promptText += inboxText; }`);
        continue;
    }

    if (line.includes('let preTurnEvents = "";')) {
        out.push(`        let preTurnEvents = inboxText ? inboxText.trim() : "";`);
        skip = true;
        continue;
    }
    if (skip && line.includes('if (radioOutput) preTurnEvents += `[SCUT EMPFANGEN]:\\n${radioOutput.replace(')) {
        skip = false;
        continue;
    }

    out.push(line);
}

fs.writeFileSync('sim_engine/runner.js', out.join('\n'));
console.log("Runner safely rewritten.");
