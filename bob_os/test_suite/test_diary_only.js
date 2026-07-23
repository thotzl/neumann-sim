const assert = require('assert');

console.log("Teste 'Diary-Only' Semantisches Memory Model...");

// 1. Simuliere die Regex-Matching Logik aus runner.js
function extractThoughts(responseText) {
    const analyseMatch = responseText.match(/1\.\s*ANALYSE:([\s\S]*?)(?=2\.\s*AKTION:|$)/i) 
                         || responseText.match(/ANALYSE:([\s\S]*?)(?=AKTION:|$)/i);
    return analyseMatch ? "1. ANALYSE:\n" + analyseMatch[1].trim() : responseText;
}

function extractAction(responseText) {
    const actionPart = responseText.match(/2\.\s*AKTION:[\s\S]*/i) 
                       ? responseText.match(/2\.\s*AKTION:[\s\S]*/i)[0] 
                       : (responseText.match(/AKTION:[\s\S]*/i) ? responseText.match(/AKTION:[\s\S]*/i)[0] : "Keine Aktion.");
    return actionPart.trim();
}

// Test Fall 1: Standard V10 Protokoll Format
const response1 = `1. ANALYSE:
Ich plane im Heimatsystem Mine zu bauen, um Rohstoffe anzuhäufen.
2. AKTION:
[RUN: me mine()]`;

const thoughts1 = extractThoughts(response1);
const action1 = extractAction(response1);

assert.strictEqual(thoughts1, "1. ANALYSE:\nIch plane im Heimatsystem Mine zu bauen, um Rohstoffe anzuhäufen.");
assert.strictEqual(action1, "2. AKTION:\n[RUN: me mine()]");
console.log("  ✅ Test 1 (Standard V10 Format) erfolgreich.");

// Test Fall 2: Robustheit bei Abweichungen (ohne Ziffern)
const response2 = `ANALYSE:
Flaschenhals erkannt. Errichte Solar Collector.
AKTION:
[RUN: me build(building_type=solar_collector)]`;

const thoughts2 = extractThoughts(response2);
const action2 = extractAction(response2);

assert.strictEqual(thoughts2, "1. ANALYSE:\nFlaschenhals erkannt. Errichte Solar Collector.");
assert.strictEqual(action2, "AKTION:\n[RUN: me build(building_type=solar_collector)]");
console.log("  ✅ Test 2 (Abweichungen ohne Ziffern) erfolgreich.");

// Test Fall 3: Fallback bei unstrukturiertem Text
const response3 = "Einfacher Text ohne Protokoll.";
const thoughts3 = extractThoughts(response3);
const action3 = extractAction(response3);

assert.strictEqual(thoughts3, "Einfacher Text ohne Protokoll.");
assert.strictEqual(action3, "Keine Aktion.");
console.log("  ✅ Test 3 (Fallback auf Volltext) erfolgreich.");

console.log("🎉 'Diary-Only' Memory Tests erfolgreich abgeschlossen!");
