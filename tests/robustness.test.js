const fs = require('fs');
const path = require('path');

// Wir testen hier die Logik der Intervall-Berechnung (isIntervallEnd)
// Da runner.js ein monolithisches Skript ist, testen wir die Logik abstrakt

describe('Runner Logic - Epoch Triggering', () => {
    const distillationInterval = 5;

    test('sollte am Anfang von Zyklus 6 destillieren (nach Abschluss von 1-5)', () => {
        const r = 6;
        const currentTurnIndex = 0;
        const isIntervallEnd = (r > 1 && (r - 1) % distillationInterval === 0 && currentTurnIndex === 0);
        expect(isIntervallEnd).toBe(true);
    });

    test('sollte NICHT in Zyklus 1 destillieren', () => {
        const r = 1;
        const currentTurnIndex = 0;
        const isIntervallEnd = (r > 1 && (r - 1) % distillationInterval === 0 && currentTurnIndex === 0);
        expect(isIntervallEnd).toBe(false);
    });

    test('sollte NICHT mitten im Zyklus destillieren', () => {
        const r = 6;
        const currentTurnIndex = 1;
        const isIntervallEnd = (r > 1 && (r - 1) % distillationInterval === 0 && currentTurnIndex === 0);
        expect(isIntervallEnd).toBe(false);
    });
});

describe('Runner Logic - Memory Limit', () => {
    test('sollte max_turns korrekt berechnen', () => {
        const agentsCount = 3;
        const interval = 5;
        const maxTurns = agentsCount * interval * 2;
        expect(maxTurns).toBe(30);
    });
});
