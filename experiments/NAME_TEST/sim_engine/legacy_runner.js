const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function deepMerge(target, source) {
    const output = Object.assign({}, target);
    if (source && typeof source === 'object') {
        Object.keys(source).forEach(key => {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!(key in target)) { Object.assign(output, { [key]: source[key] }); } 
                else { output[key] = deepMerge(target[key], source[key]); }
            } else { Object.assign(output, { [key]: source[key] }); }
        });
    }
    return output;
}

const skillDir = path.join(__dirname, '..');
const projectRoot = path.join(skillDir, '../../..');
const coreConfigPath = path.join(skillDir, 'core-config.json');
const experimentsDir = path.join(projectRoot, 'experiments');

const version = process.argv[2];
if (!version) { console.error("Fehler: Versions-Flag fehlt."); process.exit(1); }

const versionDir = path.join(experimentsDir, version);
const versionConfigPath = path.join(versionDir, 'config.json');
const universeDir = path.join(versionDir, 'universe');
const logFile = path.join(versionDir, 'log.md');
const stateFile = path.join(versionDir, 'state.json');
const memoryFile = path.join(versionDir, 'collective_memory.md');

// 1. Initialisierung
if (!fs.existsSync(versionDir)) {
    fs.mkdirSync(versionDir, { recursive: true });
    if (!fs.existsSync(universeDir)) fs.mkdirSync(universeDir, { recursive: true });
    const boilerplate = {
        agents: [{ id: "Alpha", system_prompt: "Identität: Alpha.", initial_trigger: "Erwacht." }],
        rounds: 20, turn_strategy: "random", anonymity: true, distillation_interval: 5,
        death_logic: { enabled: true, early_death_chance: 0.02, end_range: [15, 20], inform_others: true }
    };
    fs.writeFileSync(versionConfigPath, JSON.stringify(boilerplate, null, 2));
    process.exit(0);
}

// 2. Config laden
let coreConfig = { model: "gemini-2.5-flash", anonymity: true, endless_mode: false };
if (fs.existsSync(coreConfigPath)) { try { coreConfig = JSON.parse(fs.readFileSync(coreConfigPath, 'utf8')); } catch(e){} }
const versionConfig = JSON.parse(fs.readFileSync(versionConfigPath, 'utf8'));
const config = deepMerge(coreConfig, versionConfig);

const envPath = path.join(projectRoot, '.env');
let apiKey = process.env.GEMINI_API_KEY;
if (!apiKey && fs.existsSync(envPath)) {
    const match = fs.readFileSync(envPath, 'utf8').match(/GEMINI_API_KEY=(.*)/);
    if (match) apiKey = match[1].trim();
}
if (!apiKey) { console.error("API Key fehlt."); process.exit(1); }
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${apiKey}`;

// --- Utils ---

async function callGemini(systemPrompt, history, envState, longTermMemory = "", retries = 3) {
    let contents = JSON.parse(JSON.stringify(history)); 
    const memoryHeader = longTermMemory ? `[KOLLEKTIVES GEDÄCHTNIS]:\n${longTermMemory}\n\n---\n\n` : "";
    const envString = `\n\n---\n[FORMRAUM (Aktuelle Realität)]\n${envState}`;
    if (contents.length > 0 && contents[contents.length-1].role === "user") {
        contents[contents.length-1].parts[0].text = memoryHeader + contents[contents.length-1].parts[0].text + envString;
    } else {
        contents.push({ role: "user", parts: [{ text: memoryHeader + "[STILLE]" + envString }] });
    }
    const payload = { system_instruction: { parts: [{ text: systemPrompt }] }, contents: contents };
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            if (!data.candidates || data.candidates.length === 0) return "[ERROR]";
            return data.candidates[0].content.parts[0].text;
        } catch (err) {
            console.error(`API-Call fehlgeschlagen: ${err.message}`);
            if (i === retries - 1) throw err;
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
    }
}

async function distillMemory(epochBuffer, currentMemory) {
    const prompt = `Du bist der Gedächtnis-Architekt. Verschmelze das alte Wissen mit den neuen Ereignissen.\n\nALTES GEDÄCHTNIS:\n${currentMemory || "Leer"}\n\nNEUE EPOCHE:\n${JSON.stringify(epochBuffer)}\n\nErstelle ein kumulatives Update (max. 1500 Wörter).`;
    try {
        const res = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }) });
        const data = await res.json();
        return data.candidates[0].content.parts[0].text;
    } catch (e) { return currentMemory; }
}

function processActions(text) {
    let feedback = "";
    const writeRegex = /\[WRITE:\s*([a-zA-Z0-9._\-\/]+)\]([\s\S]*?)\[END\]/g;
    let match;
    while ((match = writeRegex.exec(text)) !== null) {
        const filePath = match[1]; const content = match[2].trim();
        try { fs.mkdirSync(path.dirname(path.join(universeDir, filePath)), { recursive: true });
              fs.writeFileSync(path.join(universeDir, filePath), content);
              feedback += `[ERFOLG: '${filePath}']\n`; } catch (e) { feedback += `[FEHLER: ${e.message}]\n`; }
    }
    const runRegex = /\[RUN:\s*(.*?)\]/g;
    while ((match = runRegex.exec(text)) !== null) {
        try { const out = execSync(match[1], { cwd: universeDir, timeout: 15000, stdio: 'pipe' }).toString();
              feedback += `[RESONANZ: '${match[1]}' -> ${out || "OK"}]\n`; } catch (e) { feedback += `[FEHLER: '${match[1]}' -> ${e.stderr||e.message}]\n`; }
    }
    return feedback;
}

function getEnvState() {
    if (!fs.existsSync(universeDir)) return "Leer.";
    const getFiles = (dir, base = '') => {
        let results = [];
        fs.readdirSync(dir).forEach(file => {
            const p = path.join(dir, file);
            if (fs.statSync(p).isDirectory()) results = results.concat(getFiles(p, path.join(base, file)));
            else results.push(path.join(base, file));
        }); return results;
    };
    const files = getFiles(universeDir);
    return files.length === 0 ? "Leer." : files.join("\n");
}

function cleanSystemTags(text) {
    let cl = text.replace(/^(\*\*?)?\[(EIGENIMPULS|UR-IMPULS|FREMDRESONANZ|FORMRAUM|SYSTEM-MITTEILUNG|IMPULS-VERLUST|STILLE|SYSTEM-RESUME|SYSTEM-INFO)\](\*\*?)?:\s*/gmi, "");
    cl = cl.replace(/^(\*\*?)?\[[^\]\n]+ \((Zyklus|Schwingung) \d+\)\](\*\*?)?:\s*/gmi, "");
    return cl.replace(/^(\*\*?)?(Pioneer_[1-9]|Next_[1-9]|Last_[1-9]|Alpha|Beta|Gamma)(\*\*?)?:\s*/gmi, "");
}

function pushForeignMessage(agent, message) {
    if (agent.history.length > 0 && agent.history[agent.history.length - 1].role === "user") {
        agent.history[agent.history.length - 1].parts[0].text += `\n\n---\n\n${message}`;
    } else {
        agent.history.push({ role: "user", parts: [{ text: message }] });
    }
}

function saveState(round, agents, turnSequence, currentTurnIndex, globalEpochBuffer, totalTurns) {
    fs.writeFileSync(stateFile, JSON.stringify({ round, agents, turnSequence, currentTurnIndex, globalEpochBuffer, totalTurns }, null, 2));
}

// --- Main Runner Logic ---

async function run() {
    let agents = [], startRound = 1, turnSequence = [], currentTurnIndex = 0, globalEpochBuffer = [], totalTurns = 0;

    if (fs.existsSync(stateFile)) {
        console.log(`Lade State aus Checkpoint...`);
        const saved = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        agents = saved.agents.map(a => ({ ...a, needsResumeNotify: true }));
        startRound = saved.round; turnSequence = saved.turnSequence || [];
        currentTurnIndex = saved.currentTurnIndex || 0; 
        globalEpochBuffer = saved.globalEpochBuffer || [];
        totalTurns = saved.totalTurns || 0;
    } else {
        agents = config.agents.map(a => ({ ...a, history: [], alive: true, deathRound: null, needsResumeNotify: false, needsEpochNotify: false }));
        if (config.death_logic?.enabled) {
            agents.forEach(a => {
                a.deathRound = Math.random() < config.death_logic.early_death_chance 
                    ? Math.floor(Math.random() * (config.death_logic.end_range[0] - 1)) + 1 
                    : Math.floor(Math.random() * (config.death_logic.end_range[1] - config.death_logic.end_range[0] + 1)) + config.death_logic.end_range[0];
            });
        }
        const initialMsg = config.agents.find(a => a.initial_trigger)?.initial_trigger || "Erwacht.";
        agents.forEach(a => pushForeignMessage(a, `[UR-IMPULS]: ${initialMsg}`));
    }

    const turnsPerEpoch = agents.length * (config.distillation_interval || 5);
    config.max_turns = turnsPerEpoch * 2;

    console.log(`Starte ${version} (${agents.length} Agenten)...`);
    
    if (!fs.existsSync(logFile)) {
        let h = `# Log ${version}\n**Model:** ${config.model}\n**Max Turns:** ${config.max_turns}\n\n`;
        agents.forEach(a => { h += `### ${a.id} System-Prompt\n> ${a.system_prompt.replace(/\n/g, '\n> ')}\n\n`; });
        fs.writeFileSync(logFile, h + `---\n\n`);
    }

    const maxRounds = config.endless_mode ? 500 : config.rounds;
    let simActive = true;
    let finalRoundReached = startRound;

    for (let round = startRound; round <= maxRounds && simActive; round++) {
        console.log(`Zyklus ${round}/${maxRounds}...`);
        finalRoundReached = round;
        
        // --- Sägezahn Destillation ---
        const isEnd = (round > 1 && round % (config.distillation_interval || 5) === 0 && currentTurnIndex === 0);

        if (isEnd) {
            if (globalEpochBuffer.length > 0) {
                const curMem = fs.existsSync(memoryFile) ? fs.readFileSync(memoryFile, 'utf8') : "";
                const newMem = await distillMemory(globalEpochBuffer, curMem);
                fs.writeFileSync(memoryFile, newMem);
                fs.appendFileSync(logFile, `\n### [GEDÄCHTNIS-EPOCHE]: Zyklus ${round}.\n\n`);
                globalEpochBuffer = []; 
                agents.forEach(a => { a.needsEpochNotify = true; if (a.history.length > 2) a.history = a.history.slice(-2); });
                saveState(round, agents, turnSequence, currentTurnIndex, globalEpochBuffer, totalTurns);
            }
        }

        if (currentTurnIndex === 0) turnSequence = [...agents].filter(a => a.alive).sort(() => Math.random() - 0.5).map(a => a.id);

        while (currentTurnIndex < turnSequence.length && simActive) {
            const agent = agents.find(a => a.id === turnSequence[currentTurnIndex]);
            if (!agent || !agent.alive) { currentTurnIndex++; continue; }

            // Death Check
            if (agent.deathRound && round > agent.deathRound) {
                agent.alive = false;
                const dName = config.anonymity ? "Eine Präsenz" : agent.id;
                const dMsg = `[IMPULS-VERLUST]: ${dName} ist erloschen.`;
                fs.appendFileSync(logFile, `### Zyklus ${round} - System\n> ${dMsg}\n\n`);
                if (config.death_logic?.inform_others) agents.forEach(other => { if (other.alive) pushForeignMessage(other, dMsg); });
                globalEpochBuffer.push({ type: "event", content: dMsg });
                currentTurnIndex++; saveState(round, agents, turnSequence, currentTurnIndex, globalEpochBuffer, totalTurns); continue;
            }

            console.log(`  Zug: ${agent.id}`);
            const lastUserEntry = agent.history.length > 0 ? agent.history[agent.history.length-1].parts[0].text : "[STILLE]";
            const isResume = agent.needsResumeNotify;
            if (agent.needsResumeNotify) { pushForeignMessage(agent, "[SYSTEM-RESUME]: Fortgesetzt. Nutze Historie."); agent.needsResumeNotify = false; }
            if (agent.needsEpochNotify) { pushForeignMessage(agent, "[SYSTEM-INFO]: Neue Epoche begonnen. Langzeitgedächtnis aktualisiert."); agent.needsEpochNotify = false; }

            const env = getEnvState();
            const lTM = fs.existsSync(memoryFile) ? fs.readFileSync(memoryFile, 'utf8') : "";
            const sys = (config.global_system_instruction || "") + "\n\n" + agent.system_prompt;

            try {
                let reply = await callGemini(sys, agent.history, env, lTM);
                reply = cleanSystemTags(reply);
                const fb = processActions(reply);
                const fbLog = fb.trim() ? `\n\`\`\`\n${fb.trim()}\n\`\`\`` : "";
                
                totalTurns++; // Inkrementiere die absolute Anzahl der Züge
                
                agent.history.push({ role: "model", parts: [{ text: `[EIGENIMPULS]:\n${reply}` }] });
                globalEpochBuffer.push({ agent: agent.id, manifestation: reply, outcome: fb });

                const wahrLabel = isResume ? "**Wahrnehmung (Resume):**" : "**Wahrnehmung:**";
                fs.appendFileSync(logFile, `### Zyklus ${round} - Zug ${agent.id}\n**Gesamt-Turns: ${totalTurns}**\n${wahrLabel} [Kurzzeit-Gedächtnis aktiv | Langzeitgedächtnis aktiv]\n\n**Manifestation:**\n> ${reply.replace(/\n/g, '\n> ')}\n**Aktionen:**${fbLog}\n\n`);

                const sLabel = config.anonymity ? "FREMDRESONANZ" : agent.id;
                const mOthers = `[${sLabel}]:\n${reply}` + (fb ? `\n[AUSWIRKUNG]:\n${fb}` : "");
                agents.forEach(other => { if (other.id !== agent.id && other.alive) pushForeignMessage(other, mOthers); });

                if (reply.includes("[FINISH]")) { simActive = false; break; }
                currentTurnIndex++; saveState(round, agents, turnSequence, currentTurnIndex, globalEpochBuffer, totalTurns);
                await new Promise(r => setTimeout(r, 500));
            } catch (err) { console.error(`Fehler ${agent.id}:`, err.message); process.exit(1); }
        }
        if (simActive) { currentTurnIndex = 0; if (agents.every(a => !a.alive)) simActive = false; }
    }

    fs.appendFileSync(logFile, `\n---\n### [SYSTEM]: SIMULATION BEENDET\n---\n\n`);
    if (globalEpochBuffer.length > 0) {
        const curMem = fs.existsSync(memoryFile) ? fs.readFileSync(memoryFile, 'utf8') : "";
        const uMem = await distillMemory(globalEpochBuffer, curMem);
        fs.writeFileSync(memoryFile, uMem);
    }
    await generateReport(config, logFile, universeDir, apiUrl);
}

async function generateReport(config, logFile, universeDir, apiUrl) {
    const reportFile = path.join(path.dirname(logFile), 'report.md');
    if (!fs.existsSync(logFile)) return;
    const logContent = fs.readFileSync(logFile, 'utf8');
    let universeContent = "### FINALER ZUSTAND DES UNIVERSUMS\n\n";
    if (fs.existsSync(universeDir)) {
        const readFiles = (dir, base = '') => {
            let out = "";
            fs.readdirSync(dir).forEach(file => {
                const full = path.join(dir, file);
                const rel = path.join(base, file);
                if (fs.statSync(full).isDirectory()) out += readFiles(full, rel);
                else { try { out += `\n==== ${rel} ====\n\`\`\`\n${fs.readFileSync(full, 'utf8')}\n\`\`\`\n`; } catch (e) {} }
            }); return out;
        };
        universeContent += readFiles(universeDir);
    }
    const observerPrompt = "Analysiere das Log und die Artefakte. Wie sind die Agenten mit der Endlichkeit und dem kumulativen Epochal-Memory umgegangen?";
    try {
        const res = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system_instruction: { parts: [{ text: observerPrompt }] }, contents: [{ role: "user", parts: [{ text: `Log:\n${logContent}\n\nUniverse:\n${universeContent}` }] }] }) });
        const data = await res.json();
        if (data.candidates) fs.writeFileSync(reportFile, data.candidates[0].content.parts[0].text);
    } catch (e) {}
}

run().catch(console.error);
