const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const assert = require('assert');

console.log("🚀 Starting Async Comms E2E Test (Inbox/Batching)...");

const expName = 'async_comms_test';
const vDir = path.join(__dirname, '../../experiments', expName);

if (fs.existsSync(vDir)) fs.rmSync(vDir, { recursive: true, force: true });
execSync(`python3 bob_os/build.py ${expName} --skip-tests --mission "Comms Test" --rounds 2`, { stdio: 'pipe' });

const configPath = path.join(vDir, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
config.agents.push({
    id: "Instance-2",
    location: "SYS_X0_Y0",
    system_prompt: "Receiver",
    chosen_name: "Bob-2"
});
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

const mockApiContent = `
const fs = require('fs');
const path = require('path');
let callCount = 0;
async function callGemini(url, payload) {
    callCount++;
    const agentId = payload.contents[0].parts[0].text.includes("Instance-2") ? "Instance-2" : "Instance-1";
    let action = "[RUN: me storage]";
    
    if (callCount <= 2) {
        if (agentId === "Instance-1") {
            // Tick 1
            action = "[RUN: me scut(receiver_id='ALL', message='Hello Swarm!')]\\n[RUN: me mine]";
        } else {
            // Tick 2
            if (payload.contents[0].parts[0].text.includes('Hello Swarm!')) {
                fs.writeFileSync('fail.txt', 'Message arrived too early!');
            }
        }
    } else {
        if (agentId === "Instance-1") {
            // Tick 3
            if (!payload.contents[0].parts[0].text.includes('mined matter')) {
                fs.writeFileSync('fail.txt', 'Missing visual event for A1!\\n' + payload.contents[0].parts[0].text);
            }
        } else {
            // Tick 4
            if (!payload.contents[0].parts[0].text.includes('Hello Swarm!')) {
                fs.writeFileSync('fail.txt', 'Missing SCUT for A2!\\n' + payload.contents[0].parts[0].text);
            }
            if (!payload.contents[0].parts[0].text.includes('Voice of God')) {
                fs.writeFileSync('fail.txt', 'Missing VoG for A2!\\n' + payload.contents[0].parts[0].text);
            }
        }
    }
    return "ANALYZE:\\nTest\\n\\nACTION:\\n" + action;
}
function buildAgentContext(agentId, histories, memory, envState, globalInstr, systemPrompt, anonymity) {
    return { contents: [{ role: 'user', parts: [{ text: \`Agent: \${agentId}\\nEnv: \${envState}\\nHist: \${JSON.stringify(histories)}\` }] }] };
}
module.exports = { callGemini, buildAgentContext };
`;

fs.writeFileSync(path.join(vDir, 'sim_engine', 'utils', 'api_client.js'), mockApiContent);
fs.writeFileSync(path.join(vDir, 'creator_msg.txt'), "This is the Voice of God.");

try {
    execSync('node sim_engine/runner.js', { cwd: vDir, stdio: 'pipe' });
} catch (e) {}

if (fs.existsSync(path.join(vDir, 'fail.txt'))) {
    console.error("❌ TEST FAILED: " + fs.readFileSync(path.join(vDir, 'fail.txt'), 'utf8'));
    process.exit(1);
} else {
    console.log("✅ Async Comms E2E Test successful!");
}