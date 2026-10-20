/**
 * Environment for Python child processes (TCK-139).
 * Agent-authored Python (RUN scripts, automations) and kernel tools never inherit the
 * engine's full process.env: only an allowlist passes, secrets are stripped on top.
 */

// Exact names a Python child may inherit (runtime basics + kernel variables)
const ALLOWED_NAMES = new Set([
    'PATH', 'HOME', 'USER', 'LANG', 'LANGUAGE', 'TZ', 'TERM', 'TMPDIR', 'TEMP', 'TMP',
    'VIRTUAL_ENV', 'PYTHONPATH', 'PYTHONDONTWRITEBYTECODE', 'PYTHONUNBUFFERED',
    'PYTHONIOENCODING', 'PYTHONUTF8', 'VERSE_DIR',
    // Windows: CPython needs these to start (native dev path only)
    'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATHEXT'
]);
// Prefixes for kernel/test variables (BOB_ID, BOB_ACL, BOB_CYCLE, BOB_STARDATE, TEST_DB_PATH, ...)
const ALLOWED_PREFIXES = ['BOB_', 'TEST_', 'LC_'];
// Always stripped, even if allowlisted or passed as extra
const SECRET_PATTERN = /(_API_KEY|_TOKEN|_KEY|SECRET|PASSWORD)$/i;
const SECRET_NAMES = new Set(['API_KEY', 'DEEP_INFRA_KEY', 'GITHUB_TOKEN', 'VOG_TOKEN']);

function isSecret(name) {
    return SECRET_NAMES.has(name.toUpperCase()) || SECRET_PATTERN.test(name);
}

function isAllowed(name) {
    const upper = name.toUpperCase();
    return ALLOWED_NAMES.has(upper) || ALLOWED_PREFIXES.some(p => upper.startsWith(p));
}

/**
 * Builds a child env from the allowlisted part of `source` (default process.env)
 * plus explicit `extra` variables (e.g. PYTHONPATH, BOB_ID). Secrets never pass.
 */
function childEnv(extra = {}, source = process.env) {
    const env = {};
    for (const [name, value] of Object.entries(source)) {
        if (value !== undefined && isAllowed(name) && !isSecret(name)) env[name] = value;
    }
    for (const [name, value] of Object.entries(extra)) {
        if (value !== undefined && value !== null && !isSecret(name)) env[name] = String(value);
    }
    return env;
}

module.exports = { childEnv, isSecret };
