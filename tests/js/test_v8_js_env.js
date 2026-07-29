const environment = require('../../src/sim_engine/modules/environment');
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const universeDir = path.resolve(__dirname, 'test_verse_v8');
if (!fs.existsSync(universeDir)) fs.mkdirSync(universeDir, { recursive: true });

const state = { security: { acl: {}, wallets: {} } };
const agentId = 'Instance-1';

console.log("Testing V8 JS Environment Syntax Mapping...");

// Mock execSync to see what command is actually run
const { execSync } = require('child_process');
require.cache[require.resolve('child_process')].exports.execSync = (cmd) => {
    console.log(`  [MOCK EXEC]: ${cmd}`);
    return "OK";
};

// 1. Test: bob mine() -> python3 ../core/bin/bob.py mine()
let text = "[RUN: me mine()]";
let feedback = environment.processActions(text, universeDir, agentId, state);
// We check in the log (above) if the command was mapped correctly.
// Currently it would fail because startsWith("bob ") expects a space.

// 2. Test: bob scut(to=Instance-2, msg=Hello World)
text = "[RUN: me scut(to=Instance-2, msg=Hello World)]";
feedback = environment.processActions(text, universeDir, agentId, state);

// 3. Test: Multi-Command
text = "[RUN: me mine()] [RUN: me storage()]";
feedback = environment.processActions(text, universeDir, agentId, state);

console.log("JS V8 Syntax Test completed. Check log outputs above!");
