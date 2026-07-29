const fs = require('fs');
const path = require('path');
const { safeReadJsonSync } = require('./io_helpers');

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
    const defaultCore = { model: "gemini-2.5-flash", anonymity: true, endless_mode: false };
    const coreConfig = safeReadJsonSync(corePath, defaultCore);
    const versionConfig = safeReadJsonSync(versionPath, {});
    return deepMerge(coreConfig, versionConfig);
}

module.exports = { loadConfig, deepMerge };
