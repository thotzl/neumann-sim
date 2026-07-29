/**
 * Action Parser
 * Decoupled, stateless parsing module for Bob-OS.
 * Extracts nested run command blocks cleanly using a bracket-counting algorithm,
 * preventing duplicate recognition and escaping syntax issues.
 */

function parseRunBlocks(text) {
    const blocks = [];
    let pos = 0;
    let safeText = text;

    if (typeof safeText !== 'string') {
        safeText = safeText ? safeText.toString() : "";
    }

    while (true) {
        let startIdx = safeText.indexOf("[RUN:", pos);
        if (startIdx === -1) break;

        let braceCount = 1;
        let endIdx = startIdx + 5;
        while (endIdx < safeText.length && braceCount > 0) {
            if (safeText[endIdx] === '[') braceCount++;
            else if (safeText[endIdx] === ']') braceCount--;
            endIdx++;
        }

        if (braceCount !== 0) {
            // Unmatched brackets, slide forward to prevent hang
            pos = startIdx + 5;
            continue;
        }

        const fullBlock = safeText.substring(startIdx, endIdx);
        const cmd = safeText.substring(startIdx + 5, endIdx - 1).trim().replace(/^`|`$/g, '');

        blocks.push({ fullBlock, cmd });

        // Splicing out the block to prevent duplicate matching
        safeText = safeText.substring(0, startIdx) + safeText.substring(endIdx);
        pos = startIdx; // Next search starts at the spliced index
    }
    return { blocks, remainingText: safeText };
}

module.exports = { parseRunBlocks };
