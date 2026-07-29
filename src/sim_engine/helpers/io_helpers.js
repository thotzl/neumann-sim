const fs = require('fs');

/**
 * Safely reads a JSON file synchronously and parses it.
 * If the file doesn't exist, is corrupt, or fails to parse, 
 * it returns the provided fallback instead of crashing.
 * 
 * @param {string} filePath - Path to the JSON file.
 * @param {*} fallback - Fallback value to return on failure (default: null).
 * @returns {*} Parsed object or fallback value.
 */
function safeReadJsonSync(filePath, fallback = null) {
    try {
        if (!fs.existsSync(filePath)) {
            return fallback;
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`[IO ERROR] Failed to read/parse JSON at: ${filePath}. Error: ${error.message}`);
        return fallback;
    }
}

module.exports = {
    safeReadJsonSync
};
