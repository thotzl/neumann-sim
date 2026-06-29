const fs = require('fs');
const path = require('path');

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

function loadConfig(corePath, versionPath) {
    let coreConfig = { model: "gemini-2.5-flash", anonymity: true, endless_mode: false };
    if (fs.existsSync(corePath)) {
        try { coreConfig = JSON.parse(fs.readFileSync(corePath, 'utf8')); } catch (e) { console.error("Warnung: core-config.json ungültig."); }
    }
    const versionConfig = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
    return deepMerge(coreConfig, versionConfig);
}

module.exports = { loadConfig, deepMerge };
