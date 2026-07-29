const fs = require('fs');
const path = require('path');

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

/**
 * Safely writes an object to a JSON file synchronously.
 * Creates parent directories automatically if they do not exist.
 * 
 * @param {string} filePath - Target file path.
 * @param {*} data - Javascript object to serialize and save.
 * @param {number} indent - Number of spaces to indent the JSON output.
 * @returns {boolean} True if successfully written, false on failure.
 */
function safeWriteJsonSync(filePath, data, indent = 2) {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, indent), 'utf8');
        return true;
    } catch (error) {
        console.error(`[IO ERROR] Failed to write JSON to: ${filePath}. Error: ${error.message}`);
        return false;
    }
}

module.exports = {
    safeReadJsonSync,
    safeWriteJsonSync
};
