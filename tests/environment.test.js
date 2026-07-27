const { getEnvState, processActions } = require('../sim_engine/utils/environment');
const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, 'temp_test_universe');
const dummyState = { security: { acl: {}, wallets: {} } };

describe('Environment Manager (Integration Tests with File System)', () => {
    beforeEach(() => {
        if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
        if (!fs.existsSync(path.join(testDir, 'scripts'))) fs.mkdirSync(path.join(testDir, 'scripts'), { recursive: true });
        if (!fs.existsSync(path.join(testDir, 'tools'))) fs.mkdirSync(path.join(testDir, 'tools'), { recursive: true });
    });

    afterEach(() => {
        if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
    });

    test('getEnvState should find real .py files in tools/', () => {
        fs.writeFileSync(path.join(testDir, 'tools/tool1.py'), 'hello');
        fs.writeFileSync(path.join(testDir, 'tools/not_a_tool.txt'), 'world');

        const state = getEnvState(testDir);
        expect(state).toContain('HARDWARE (tools/):');
        expect(state).toContain('tool1.py');
        expect(state).not.toContain('not_a_tool.txt');
    });

    test('getEnvState should return "No tools found." if truly empty', () => {
        const emptyDir = path.join(testDir, 'empty_verse');
        fs.mkdirSync(emptyDir);
        expect(getEnvState(emptyDir)).toContain("No tools found.");
        fs.rmSync(emptyDir, { recursive: true, force: true });
    });

    test('processActions should perform real WRITE operations in scripts/', () => {
        const text = "[WRITE: scripts/test.txt] Real-Data [END]";
        const feedback = processActions(text, testDir, "TestAgent", dummyState);
        
        expect(feedback).toContain("[SUCCESS: 'scripts/test.txt' manifested]");
        const content = fs.readFileSync(path.join(testDir, 'scripts/test.txt'), 'utf8');
        expect(content).toBe("Real-Data");
    });

    test('processActions treats REPLACE syntactically like WRITE (complete overwrite)', () => {
        const text = "[REPLACE: scripts/source.txt] Completely-New-Content [END]";
        const feedback = processActions(text, testDir, "TestAgent", dummyState);
        
        expect(feedback).toContain("[SUCCESS: 'scripts/source.txt' manifested]");
        const content = fs.readFileSync(path.join(testDir, 'scripts/source.txt'), 'utf8');
        expect(content).toBe("Completely-New-Content");
    });

    test('processActions should perform real RUN operations (echo)', () => {
        const text = "[RUN: echo 'Hello System']";
        const feedback = processActions(text, testDir, "TestAgent", dummyState);
        expect(feedback).toContain("Hello System");
    });

    test('processActions should catch WRITE errors for illegal paths (outside scripts/)', () => {
        const text = "[WRITE: invalid.txt] Should fail [END]";
        const feedback = processActions(text, testDir, "TestAgent", dummyState);
        expect(feedback).toContain("[DENIED: 'invalid.txt'");
    });

    test('processActions should catch real RUN errors for invalid commands', () => {
        const text = "[RUN: non_existing_command_12345]";
        const feedback = processActions(text, testDir, "TestAgent", dummyState);
        expect(feedback).toContain("[ERROR-RESPONSE:");
    });

    test('processActions should perform real READ operations in scripts/', () => {
        fs.writeFileSync(path.join(testDir, 'scripts/read_me.txt'), 'Secret123');
        const text = "[READ: scripts/read_me.txt]";
        const feedback = processActions(text, testDir, "TestAgent", dummyState);
        expect(feedback).toContain("[CONTENT OF 'scripts/read_me.txt':\nSecret123\n]");
    });

    test('processActions should catch READ errors for illegal paths', () => {
        fs.writeFileSync(path.join(testDir, 'root_file.txt'), 'Secret123');
        const text = "[READ: root_file.txt]";
        const feedback = processActions(text, testDir, "TestAgent", dummyState);
        expect(feedback).toContain("[DENIED: 'root_file.txt'");
    });

    test('processActions should perform real DELETE operations in scripts/', () => {
        fs.writeFileSync(path.join(testDir, 'scripts/delete_me.txt'), 'Trash');
        const text = "[DELETE: scripts/delete_me.txt]";
        const feedback = processActions(text, testDir, "TestAgent", dummyState);
        expect(feedback).toContain("[SUCCESS: 'scripts/delete_me.txt' deleted.]");
        expect(fs.existsSync(path.join(testDir, 'scripts/delete_me.txt'))).toBe(false);
    });

    test('processActions should catch DELETE errors for illegal paths', () => {
        const text = "[DELETE: root_file.txt]";
        const feedback = processActions(text, testDir, "TestAgent", dummyState);
        expect(feedback).toContain("[DENIED: 'root_file.txt'");
    });

    test('processActions WALLET: should securely add keys to the wallet', () => {
        const text = "[KEY: ADD MASTERKEY password123]";
        const myState = { security: { acl: {}, wallets: {} } };
        const feedback = processActions(text, testDir, "Bob-1", myState);
        
        expect(feedback).toContain("[SUCCESS: Key 'MASTERKEY' added to keyring.]");
        expect(myState.security.wallets["Bob-1"]["MASTERKEY"]).toBe("password123");
    });

    test('processActions ACL: should block read access if key is missing', () => {
        fs.writeFileSync(path.join(testDir, 'scripts/vault.txt'), 'Secure');
        const myState = { 
            security: { 
                acl: { "scripts/vault.txt": { read_key: "TopSecret" } }, 
                wallets: { "Bob-1": {} } 
            } 
        };
        const text = "[READ: scripts/vault.txt]";
        const feedback = processActions(text, testDir, "Bob-1", myState);
        expect(feedback).toContain("[DENIED: Cryptographic protection.");
    });
});