const environment = require('../../sim_engine/utils/environment');
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const universeDir = path.resolve(__dirname, 'test_verse_v8');
if (!fs.existsSync(universeDir)) fs.mkdirSync(universeDir, { recursive: true });

const state = { security: { acl: {}, wallets: {} } };
const agentId = 'Bob-1';

console.log("Teste V8 JS Environment Syntax Mapping...");

// Mock execSync to see what command is actually run
const { execSync } = require('child_process');
require.cache[require.resolve('child_process')].exports.execSync = (cmd) => {
    console.log(`  [MOCK EXEC]: ${cmd}`);
    return "OK";
};

// 1. Test: bob mine() -> python3 ../core/bin/bob.py mine()
let text = "[RUN: bob mine()]";
let feedback = environment.processActions(text, universeDir, agentId, state);
// Wir prüfen im Log (oben), ob der Befehl korrekt gemappt wurde.
// Aktuell würde er fehlschlagen, da startsWith("bob ") ein Space erwartet.

// 2. Test: bob scut(to=Bob-2, msg=Hello World)
text = "[RUN: bob scut(to=Bob-2, msg=Hello World)]";
feedback = environment.processActions(text, universeDir, agentId, state);

// 3. Test: Multi-Command
text = "[RUN: bob mine()] [RUN: bob storage()]";
feedback = environment.processActions(text, universeDir, agentId, state);

console.log("JS V8 Syntax Test abgeschlossen. Prüfe Log-Ausgaben oben!");
