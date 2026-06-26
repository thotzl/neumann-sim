const { getEnvState, processActions } = require('../.agents/skills/sim-agent-loop/scripts/utils/environment');
const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, 'temp_test_universe');

describe('Environment Manager (Integration-Tests mit Dateisystem)', () => {
    beforeEach(() => {
        if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
        if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
    });

    test('getEnvState sollte echte Dateien rekursiv finden', () => {
        fs.mkdirSync(path.join(testDir, 'subdir'));
        fs.writeFileSync(path.join(testDir, 'file1.txt'), 'hello');
        fs.writeFileSync(path.join(testDir, 'subdir/file2.txt'), 'world');

        const state = getEnvState(testDir);
        expect(state).toContain('file1.txt');
        expect(state).toContain('subdir/file2.txt');
    });

    test('getEnvState sollte "Leer." zurückgeben, wenn wirklich leer', () => {
        expect(getEnvState(testDir)).toBe("Leer.");
    });

    test('processActions sollte echte WRITE Operationen durchführen', () => {
        const text = "[WRITE: test.txt] Echt-Daten [END]";
        const feedback = processActions(text, testDir);
        
        expect(feedback).toContain("[ERFOLG: 'test.txt' manifestiert]");
        const content = fs.readFileSync(path.join(testDir, 'test.txt'), 'utf8');
        expect(content).toBe("Echt-Daten");
    });

    test('processActions sollte echte RUN Operationen durchführen (echo)', () => {
        const text = "[RUN: echo 'Hallo System']";
        const feedback = processActions(text, testDir);
        expect(feedback).toContain("Hallo System");
    });

    test('processActions sollte WRITE Fehler bei illegalen Pfaden fangen', () => {
        // Erzeuge einen Ordner mit dem Namen 'folder'
        fs.mkdirSync(path.join(testDir, 'folder'));
        // Versuche eine Datei mit demselben Namen zu schreiben (provoziert Fehler)
        const text = "[WRITE: folder] Sollte scheitern [END]";
        const feedback = processActions(text, testDir);
        expect(feedback).toContain("[FEHLER:");
    });

    test('processActions sollte echte RUN Fehler bei ungültigen Befehlen fangen', () => {
        const text = "[RUN: non_existing_command_12345]";
        const feedback = processActions(text, testDir);
        expect(feedback).toContain("[FEHLER-RESONANZ:");
    });

    test('processActions sollte chirurgische REPLACE Operationen durchführen', () => {
        fs.writeFileSync(path.join(testDir, 'source.txt'), 'Zeile 1\nZiel-Text\nZeile 3');
        const text = "[REPLACE: source.txt] Ziel-Text ||| Neuer-Inhalt [END]";
        const feedback = processActions(text, testDir);
        
        expect(feedback).toContain("[ERFOLG: 'source.txt' chirurgisch angepasst]");
        const content = fs.readFileSync(path.join(testDir, 'source.txt'), 'utf8');
        expect(content).toBe('Zeile 1\nNeuer-Inhalt\nZeile 3');
    });

    test('processActions REPLACE sollte Fehler bei Mehrdeutigkeit werfen', () => {
        fs.writeFileSync(path.join(testDir, 'multi.txt'), 'A\nA\nA');
        const text = "[REPLACE: multi.txt] A ||| B [END]";
        const feedback = processActions(text, testDir);
        
        expect(feedback).toContain("Suchstring ist mehrdeutig");
        const content = fs.readFileSync(path.join(testDir, 'multi.txt'), 'utf8');
        expect(content).toBe('A\nA\nA'); // Unverändert
    });

    test('processActions REPLACE sollte Fehler bei fehlendem Suchstring werfen', () => {
        fs.writeFileSync(path.join(testDir, 'missing.txt'), 'X Y Z');
        const text = "[REPLACE: missing.txt] NICHT_DA ||| B [END]";
        const feedback = processActions(text, testDir);
        
        expect(feedback).toContain("Suchstring nicht gefunden");
    });
});
