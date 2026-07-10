const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Testet den Fix des O(N²) Vampir-Bugs.
 * Erwartung: Ein Skript darf nur 1x pro Runde laufen, egal wie viele Agenten existieren.
 */
async function testVampireFix() {
    const version = 'VAMP_TEST';
    const expDir = path.resolve(`experiments/${version}`);
    
    console.log("🚀 Teste Vampir-Bug Fix (O(N²) Redundanz-Check)...\n");

    if (fs.existsSync(expDir)) fs.rmSync(expDir, { recursive: true, force: true });

    // 1. Erstelle Experiment mit 2 Agenten
    execSync(`python3 bob_os/build.py ${version} --rounds 2 --mission 'Vampire Test' --skip-tests`, { stdio: 'ignore' });
    
    const configPath = path.join(expDir, 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Füge einen zweiten Agenten hinzu
    config.agents.push({
        id: "Bob-2",
        location: "Alpha_Centauri",
        initial_trigger: "System online.",
        system_prompt: "Klon."
    });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    // 2. Erstelle ein Automatisierungs-Skript für Bob-1, das Materie zählt
    const verseDir = path.join(expDir, '_verse');
    const scriptPath = path.join(verseDir, 'scripts', 'active', 'vampire_check.py');
    fs.mkdirSync(path.dirname(scriptPath), { recursive: true });
    
    // Dieses Skript nutzt die alte print-Syntax (Status Quo), 
    // wir prüfen ob der Runner es pro Runde öfter als 1x triggert.
    fs.writeFileSync(scriptPath, `
import sqlite3
import os
# Wir nutzen eine kleine Datei als Counter
count_file = "vampire_hits.txt"
if not os.path.exists(count_file): 
    count = 0
else:
    with open(count_file, "r") as f: count = int(f.read())

count += 1
with open(count_file, "w") as f: f.write(str(count))
print(f"[SDK DEBUG] Hit: {count}")
`);

    // 3. Setze ACL, damit Bob-1 das Skript besitzt
    const stateFile = path.join(expDir, 'state.json');
    const state = { 
        round: 0, 
        agents: [], 
        histories: {}, 
        security: { acl: { 'scripts/active/vampire_check.py': { owner: 'Bob-1' } } } 
    };
    fs.writeFileSync(stateFile, JSON.stringify(state));

    // 4. Starte Simulation für 1 Runde (mit 2 Agenten)
    // Bei O(N²) würde das Skript 2x laufen. Bei System-Runde nur 1x.
    try {
        execSync(`node run.js ${version}`, { stdio: 'ignore', timeout: 30000 });
    } catch (e) {}

    // 5. Validiere Counter
    const hits = parseInt(fs.readFileSync(path.join(expDir, 'vampire_hits.txt'), 'utf8'));
    console.log(`Ergebnis: Skript wurde ${hits} mal ausgeführt.`);

    if (hits === 1) {
        console.log("✅ ERFOLG: Vampir-Bug ist behoben (Skript lief nur 1x).");
    } else {
        console.error(`❌ FEHLER: Vampir-Bug aktiv! Skript lief ${hits} mal (erwartet: 1).`);
        process.exit(1);
    }

    // Cleanup
    fs.rmSync(expDir, { recursive: true, force: true });
}

testVampireFix();
