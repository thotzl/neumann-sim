const fs = require('fs');
const path = require('path');
const { callGemini } = require('./api_client');
const { safeReadJsonSync } = require('./io_helpers');

function saveState(statePath, data) {
    fs.writeFileSync(statePath, JSON.stringify(data, null, 2));
}

function loadState(statePath) {
    return safeReadJsonSync(statePath, null);
}

async function runDistillation(bridgeOrUrl, globalHistory, currentMemoryPath) {
    console.log("Führe Epochal-Destillation durch...");
    const currentMemory = fs.existsSync(currentMemoryPath) ? fs.readFileSync(currentMemoryPath, 'utf8') : "Anfang der Zeit.";
    
    const prompt = `Konsolidiere das bestehende KOLLEKTIVE GEDÄCHTNIS mit den neuesten Ereignis-Logs zu einem aktualisierten, zentralen Dokument.
    Du agierst als unsichtbarer Synthese-Mechanismus. Erwähne dich selbst niemals. Nutze keine einleitenden Floskeln (wie "Das aktualisierte Gedächtnis..."). Liefere ausschließlich den finalen, strukturierten Text.

    ZIEL:
    Erstelle eine kumulative, objektive Chronik. Lösche keine etablierten Meilensteine oder Regeln. Integriere neue Fakten und Handlungsstränge neutral in die bestehende Struktur. Reflektiere die Rollen und Pläne der Agenten präzise, ohne eigene Wertung.
    
    STRUKTUR-VORGABE:
    - ÜBERSICHT: Objektiver Status des Systems.
    - ERRUNGENSCHAFTEN: Alle bisherigen Meilensteine (kumulativ).
    - PROTOKOLLE & REGELN: Etablierte Formate, Architektur-Prinzipien und Absprachen der Agenten.
    - AGENTEN-STATUS: Status, Dynamik und von den Agenten eingenommene Rollen (Lebend/Erloschen).
    - OFFENE PFADE: Von den Agenten geplante, aber unvollendete Ziele.
    
    RICHTLINIE:
    Fasse die Historie sachlich zusammen. Vermeide es, lange Dateiinhalte zu kopieren; verweise stattdessen auf Dateipfade.
    
    BESTEHENDES GEDÄCHTNIS:
    ${currentMemory}
    
    NEUE EREIGNISSE (JSON-Log):
    ${JSON.stringify(globalHistory)}
    
    GIB AUSSCHLIESSLICH DAS AKTUALISIERTE DOKUMENT AUS (max. 1500 Wörter):`;

    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

    try {
        let newMemory;
        if (bridgeOrUrl && typeof bridgeOrUrl.generateText === 'function') {
            newMemory = await bridgeOrUrl.generateText(payload);
        } else {
            newMemory = await callGemini(bridgeOrUrl, payload);
        }

        if (newMemory && !newMemory.includes("[ERROR]")) {
            fs.writeFileSync(currentMemoryPath, newMemory);
            return true;
        }
        return false;
    } catch (e) {
        console.error("Destillation fehlgeschlagen:", e.message);
        return false;
    }
}

async function finalizeSimulation(bridgeOrUrl, state, memoryFile, logFile, errorOccurred) {
    console.log("Starte Abschluss-Routine...");
    fs.appendFileSync(logFile, `\n---\n### [SYSTEM]: ABSCHLUSS-ROUTINE EINGELEITET (Grund: ${errorOccurred ? 'Fehler' : 'Simulation beendet'})\n\n`);

    if (state.globalHistory && state.globalHistory.length > 0) {
        console.log("Sichere letzte Impulse...");
        const success = await runDistillation(bridgeOrUrl, state.globalHistory, memoryFile);
        if (success) {
            fs.appendFileSync(logFile, `### [FINALER GEDÄCHTNIS-DUMP]: Letzte Impulse erfolgreich destilliert.\n\n`);
        }
    }
    console.log("Abschluss abgeschlossen.");
}

async function runIndividualDistillation(bridgeOrUrl, history, agentId) {
    console.log(`Führe individuelle Destillation für ${agentId} durch...`);
    
    const prompt = `Du bist ein autonomes Gedächtnis-Modul für die Neumann-Sonde ${agentId}.
    Deine Aufgabe: Komprimiere die vorliegende Historie deiner Erfahrungen zu einem dichten, präzisen Langzeitgedächtnis.
    
    RICHTLINIEN:
    1. Bewahre alle Fakten über deinen Status, deine Materie und deine Entdeckungen.
    2. Behalte deine aktuellen Ziele und Briefings bei.
    3. Lösche redundante oder unwichtige Details.
    4. Antworte in der Ich-Form (als ${agentId}).
    5. Erwähne den Kompressionsvorgang nicht. Liefere nur den reinen Gedächtnis-Text.
    
    AKTUELLE HISTORIE (JSON):
    ${JSON.stringify(history)}
    
    DEIN KOMPRIMIERTES GEDÄCHTNIS:`;

    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

    try {
        let newMemory;
        if (bridgeOrUrl && typeof bridgeOrUrl.generateText === 'function') {
            newMemory = await bridgeOrUrl.generateText(payload);
        } else {
            newMemory = await callGemini(bridgeOrUrl, payload);
        }

        if (newMemory && !newMemory.includes("[ERROR]")) {
            return newMemory;
        }
        return null;
    } catch (e) {
        console.error(`Individuelle Destillation für ${agentId} fehlgeschlagen:`, e.message);
        return null;
    }
}

module.exports = { saveState, loadState, runDistillation, runIndividualDistillation, finalizeSimulation };
