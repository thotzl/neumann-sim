const { getEnvState, processActions } = require('../sim_engine/utils/environment');
const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, 'temp_test_universe');
const dummyState = { security: { acl: {}, wallets: {} } };

describe('Environment Manager (Integration-Tests mit Dateisystem)', () => {
    beforeEach(() => {
        if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
        if (!fs.existsSync(path.join(testDir, 'scripts'))) fs.mkdirSync(path.join(testDir, 'scripts'), { recursive: true });
        if (!fs.existsSync(path.join(testDir, 'tools'))) fs.mkdirSync(path.join(testDir, 'tools'), { recursive: true });
    });

    afterEach(() => {
        if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
    });

    test('getEnvState sollte echte .py Dateien in tools/ finden', () => {
        fs.writeFileSync(path.join(testDir, 'tools/tool1.py'), 'hello');
        fs.writeFileSync(path.join(testDir, 'tools/not_a_tool.txt'), 'world');

        const state = getEnvState(testDir);
        expect(state).toContain('HARDWARE (tools/):');
        expect(state).toContain('tool1.py');
        expect(state).not.toContain('not_a_tool.txt');
    });

    test('getEnvState sollte "Keine Tools gefunden." zurückgeben, wenn wirklich leer', () => {
        const emptyDir = path.join(testDir, 'empty_verse');
        fs.mkdirSync(emptyDir);
        expect(getEnvState(emptyDir)).toContain("Keine Tools gefunden.");
        fs.rmSync(emptyDir, { recursive: true, force: true });
    });

    test('processActions sollte echte WRITE Operationen in scripts/ durchführen', () => {
        const text = "[WRITE: scripts/test.txt] Echt-Daten [END]";
        const feedback = processActions(text, testDir, "TestAgent", dummyState);
        
        expect(feedback).toContain("[ERFOLG: 'scripts/test.txt' manifestiert]");
        const content = fs.readFileSync(path.join(testDir, 'scripts/test.txt'), 'utf8');
        expect(content).toBe("Echt-Daten");
    });

    test('processActions behandelt REPLACE syntaktisch wie WRITE (komplettes Überschreiben)', () => {
        const text = "[REPLACE: scripts/source.txt] Komplett-Neuer-Inhalt [END]";
        const feedback = processActions(text, testDir, "TestAgent", dummyState);
        
        expect(feedback).toContain("[ERFOLG: 'scripts/source.txt' manifestiert]");
        const content = fs.readFileSync(path.join(testDir, 'scripts/source.txt'), 'utf8');
        expect(content).toBe("Komplett-Neuer-Inhalt");
    });

    test('processActions sollte echte RUN Operationen durchführen (echo)', () => {
        const text = "[RUN: echo 'Hallo System']";
        const feedback = processActions(text, testDir, "TestAgent", dummyState);
        expect(feedback).toContain("Hallo System");
    });

    test('processActions sollte WRITE Fehler bei illegalen Pfaden (außerhalb scripts/) fangen', () => {
        const text = "[WRITE: invalid.txt] Sollte scheitern [END]";
        const feedback = processActions(text, testDir, "TestAgent", dummyState);
        expect(feedback).toContain("[VERWEIGERT: 'invalid.txt'");
    });

    test('processActions sollte echte RUN Fehler bei ungültigen Befehlen fangen', () => {
        const text = "[RUN: non_existing_command_12345]";
        const feedback = processActions(text, testDir, "TestAgent", dummyState);
        expect(feedback).toContain("[FEHLER-RESONANZ:");
    });

    test('processActions sollte echte READ Operationen in scripts/ durchführen', () => {
        fs.writeFileSync(path.join(testDir, 'scripts/read_me.txt'), 'Geheimnis123');
        const text = "[READ: scripts/read_me.txt]";
        const feedback = processActions(text, testDir, "TestAgent", dummyState);
        expect(feedback).toContain("[INHALT VON 'scripts/read_me.txt':\nGeheimnis123\n]");
    });

    test('processActions sollte READ Fehler bei illegalen Pfaden fangen', () => {
        fs.writeFileSync(path.join(testDir, 'root_file.txt'), 'Geheimnis123');
        const text = "[READ: root_file.txt]";
        const feedback = processActions(text, testDir, "TestAgent", dummyState);
        expect(feedback).toContain("[VERWEIGERT: 'root_file.txt'");
    });

    test('processActions sollte echte DELETE Operationen in scripts/ durchführen', () => {
        fs.writeFileSync(path.join(testDir, 'scripts/delete_me.txt'), 'Müll');
        const text = "[DELETE: scripts/delete_me.txt]";
        const feedback = processActions(text, testDir, "TestAgent", dummyState);
        expect(feedback).toContain("[ERFOLG: 'scripts/delete_me.txt' gelöscht.]");
        expect(fs.existsSync(path.join(testDir, 'scripts/delete_me.txt'))).toBe(false);
    });

    test('processActions sollte DELETE Fehler bei illegalen Pfaden fangen', () => {
        const text = "[DELETE: root_file.txt]";
        const feedback = processActions(text, testDir, "TestAgent", dummyState);
        expect(feedback).toContain("[VERWEIGERT: 'root_file.txt'");
    });

    test('processActions WALLET: sollte Keys sicher in das Wallet aufnehmen', () => {
        const text = "[KEY: ADD MASTERKEY password123]";
        const myState = { security: { acl: {}, wallets: {} } };
        const feedback = processActions(text, testDir, "Bob-1", myState);
        
        expect(feedback).toContain("[ERFOLG: Key 'MASTERKEY' zu Schlüsselbund hinzugefügt.]");
        expect(myState.security.wallets["Bob-1"]["MASTERKEY"]).toBe("password123");
    });

    test('processActions ACL: sollte Lesezugriff blockieren wenn Key fehlt', () => {
        fs.writeFileSync(path.join(testDir, 'scripts/vault.txt'), 'Secure');
        const myState = { 
            security: { 
                acl: { "scripts/vault.txt": { read_key: "TopSecret" } }, 
                wallets: { "Bob-1": {} } 
            } 
        };
        const text = "[READ: scripts/vault.txt]";
        const feedback = processActions(text, testDir, "Bob-1", myState);
        expect(feedback).toContain("[VERWEIGERT: Kryptographischer Schutz.");
    });
});
