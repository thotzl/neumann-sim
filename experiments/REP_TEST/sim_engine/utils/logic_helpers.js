const { TAGS } = require('./constants');

/**
 * Zentrale Hilfsfunktionen für die Simulations-Logik.
 */

function cleanSystemTags(text) {
    if (!text) return "";
    let cl = text;
    
    // Entferne alle zentral definierten Tags
    Object.values(TAGS).forEach(tag => {
        // Regex muss Sonderzeichen im Tag maskieren
        const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`^(\\*\\*?)?${escapedTag}(\\*\\*?)?:\\s*`, 'gmi');
        cl = cl.replace(regex, "");
    });

    // Entferne Identitäts-Header (Pioneer_1 (Zyklus X):)
    const idTagRegex = /^(\*\*?)?\[[^\]\n]+ \((Zyklus|Schwingung) \d+\)\](\*\*?)?:\s*/gmi;
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
            // Zähle fremde Manifestationen, aber vermeide Doppelzählung des UR-IMPULS
            const matches = text.match(/^(\*\*?)?\[(?!UR-IMPULS)[^\]\n]+\](\*\*?)?:\s*/gm);
            if (matches) turns += matches.length;
            
            if (text.includes(TAGS.UR_IMPULS)) turns++;
        }
    });
    return turns;
}

module.exports = { cleanSystemTags, countTotalTurns };
