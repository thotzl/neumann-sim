const { TAGS } = require('./constants');

/**
 * Central utility functions for the simulation logic.
 */

function cleanSystemTags(text) {
    if (!text) return "";
    let cl = text;
    
    // Remove all centrally defined tags
    Object.values(TAGS).forEach(tag => {
        // Regex must escape special characters in the tag
        const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`^(\\*\\*?)?${escapedTag}(\\*\\*?)?:\\s*`, 'gmi');
        cl = cl.replace(regex, "");
    });

    // Remove identity header (Pioneer_1 (Cycle X):)
    const idTagRegex = /^(\*\*?)?\[[^\]\n]+ \((Cycle|Oscillation) \d+\)\](\*\*?)?:\s*/gmi;
    cl = cl.replace(idTagRegex, "");

    return cl;
}

function countTotalTurns(history) {
    let turns = 0;
    history.forEach(item => {
        const text = item.parts ? item.parts[0].text : (item.text || "");
        if (item.role === "model") {
            turns++;
        } else {
            // Count external manifestations, but avoid double-counting UR-IMPULS
            const matches = text.match(/^(\*\*?)?\[(?!UR-IMPULS)[^\]\n]+\](\*\*?)?:\s*/gm);
            if (matches) turns += matches.length;
            
            if (text.includes(TAGS.UR_IMPULS)) turns++;
        }
    });
    return turns;
}

module.exports = { cleanSystemTags, countTotalTurns };
