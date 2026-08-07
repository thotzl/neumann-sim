const assert = require('assert');

console.log("Testing 'Diary-Only' Semantic Memory Model...");

// 1. Simulate the Regex-Matching Logic from runner.js (English)
function extractThoughts(responseText) {
    const logbookMatch = responseText.match(/1\.\s*LOGBOOK[\s:]*([\s\S]*?)(?=2\.\s*ACTION|$)/i) 
                         || responseText.match(/LOGBOOK[\s:]*([\s\S]*?)(?=ACTION|$)/i);
    return logbookMatch ? "1. LOGBOOK:\n" + logbookMatch[1].trim() : responseText;
}

function extractAction(responseText) {
    const actionPart = responseText.match(/2\.\s*ACTION:[\s\S]*/i) 
                       ? responseText.match(/2\.\s*ACTION:[\s\S]*/i)[0] 
                       : (responseText.match(/ACTION:[\s\S]*/i) ? responseText.match(/ACTION:[\s\S]*/i)[0] : "No action.");
    return actionPart.trim();
}

// Test Case 1: Standard V10 Protocol Format
const response1 = `1. LOGBOOK:
I plan to build a mine in the home system to accumulate raw resources.
2. ACTION:
[RUN: me mine()]`;

const thoughts1 = extractThoughts(response1);
const action1 = extractAction(response1);

assert.strictEqual(thoughts1, "1. LOGBOOK:\nI plan to build a mine in the home system to accumulate raw resources.");
assert.strictEqual(action1, "2. ACTION:\n[RUN: me mine()]");
console.log("  ✅ Test 1 (Standard Format) successful.");

// Test Case 2: Robustness with deviations (without digits)
const response2 = `LOGBOOK:
Bottleneck identified. Erecting solar collector.
ACTION:
[RUN: me build(building_type=solar_collector)]`;

const thoughts2 = extractThoughts(response2);
const action2 = extractAction(response2);

assert.strictEqual(thoughts2, "1. LOGBOOK:\nBottleneck identified. Erecting solar collector.");
assert.strictEqual(action2, "ACTION:\n[RUN: me build(building_type=solar_collector)]");
console.log("  ✅ Test 2 (Deviations without digits) successful.");

// Test Case 3: Fallback for unstructured text
const response3 = "Simple text without protocol.";
const thoughts3 = extractThoughts(response3);
const action3 = extractAction(response3);

assert.strictEqual(thoughts3, "Simple text without protocol.");
assert.strictEqual(action3, "No action.");
console.log("  ✅ Test 3 (Fallback to full text) successful.");

console.log("🎉 'Diary-Only' Memory Tests successfully completed!");