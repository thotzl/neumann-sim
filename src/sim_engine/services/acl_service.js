const fs = require('fs');
const path = require('path');

/**
 * Checks if an agent has cryptographic access permissions to read, write, or run a file
 * based on the current Access Control List (ACL) and keyrings inside the state.
 */
function checkAccess(filePath, action, agentId, state) {
    if (!state.security) state.security = { acl: {}, wallets: {} };
    const acl = state.security.acl[filePath];
    if (!acl) return { granted: true };

    const wallet = state.security.wallets[agentId] || {};
    const myKeys = Object.values(wallet);

    // Master Key overrides everything
    if (acl.write_key && myKeys.includes(acl.write_key)) return { granted: true };

    if (action === 'WRITE' || action === 'REPLACE' || action === 'DELETE') {
        if (acl.write_key) {
            return { granted: false, reason: `[DENIED: Cryptographic protection. You do not have a matching WRITE_KEY in your keyring. Contact the creator (${acl.owner}) via SCUT for access.]` };
        } else if (acl.read_key) {
            // If only READ_KEY is set, it also acts as a WRITE_KEY (Closed Circle)
            if (!myKeys.includes(acl.read_key)) {
                return { granted: false, reason: `[DENIED: Cryptographic protection. You do not have a matching KEY in your keyring. Contact the creator (${acl.owner}) via SCUT for access.]` };
            }
        }
    } else if (action === 'READ' || action === 'RUN') {
        if (acl.read_key && !myKeys.includes(acl.read_key)) {
            return { granted: false, reason: `[DENIED: Cryptographic protection. You do not have a matching READ_KEY in your keyring. Contact the creator (${acl.owner}) via SCUT for access.]` };
        }
    }
    return { granted: true };
}

module.exports = { checkAccess };
