const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Tests the fix for the O(N²) Vampire bug.
 * Expectation: A script should only run once per round, regardless of how many agents exist.
 */
async function testVampireFix() {
    const version = 'VAMP_TEST';
    const expDir = path.resolve(`experiments/${version}`);
    
    console.log("🚀 Testing Vampire Bug Fix (O(N²) Redundancy Check)...\n");

    if (fs.existsSync(expDir)) fs.rmSync(expDir, { recursive: true, force: true });

    // 1. Create experiment with 2 agents
    execSync(`python3 scripts/build.py ${version} --rounds 2 --mission 'Vampire Test' --skip-tests`, { stdio: 'ignore' });
    
    const configPath = path.join(expDir, 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Add a second agent
    config.agents.push({
        id: "Instance-2",
        location: "Alpha_Centauri",
        initial_trigger: "System online.",
        system_prompt: "Clone."
    });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    // 2. Create an automation script for Instance-1 that counts matter
    const verseDir = path.join(expDir, '_verse');
    const scriptPath = path.join(verseDir, 'scripts', 'active', 'vampire_check.py');
    fs.mkdirSync(path.dirname(scriptPath), { recursive: true });
    
    // This script uses the old print syntax (status quo),
    // we check if the runner triggers it more than once per round.
    fs.writeFileSync(scriptPath, `
import sqlite3
import os
# We use a small file as a counter
count_file = "vampire_hits.txt"
if not os.path.exists(count_file): 
    count = 0
else:
    with open(count_file, "r") as f: count = int(f.read())

count += 1
with open(count_file, "w") as f: f.write(str(count))
print(f"[SDK DEBUG] Hit: {count}")
`);

    // 3. Set ACL so that Instance-1 owns the script
    const stateFile = path.join(expDir, 'state.json');
    const state = { 
        round: 0, 
        agents: [], 
        histories: {}, 
        security: { acl: { 'scripts/active/vampire_check.py': { owner: 'Instance-1' } } } 
    };
    fs.writeFileSync(stateFile, JSON.stringify(state));

    // 4. Start simulation for 1 round (with 2 agents)
    // With O(N²) the script would run 2 times. In a system round, only once.
    try {
        execSync(`node scripts/run.js ${version}`, { stdio: 'ignore', timeout: 30000 });
    } catch (e) {}

    // 5. Validate counter
    const hits = parseInt(fs.readFileSync(path.join(expDir, 'vampire_hits.txt'), 'utf8'));
    console.log(`Result: Script was executed ${hits} times.`);

    if (hits === 1) {
        console.log("✅ SUCCESS: Vampire bug is fixed (script ran only 1 time).");
    } else {
        console.error(`❌ ERROR: Vampire bug active! Script ran ${hits} times (expected: 1).`);
        process.exit(1);
    }

    // Cleanup
    fs.rmSync(expDir, { recursive: true, force: true });
}

testVampireFix();