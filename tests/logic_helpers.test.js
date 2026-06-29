const { cleanSystemTags, countTotalTurns } = require('../sim_engine/utils/logic_helpers');
const { TAGS } = require('../sim_engine/utils/constants');

describe('Logic Helpers - Precise Tag Cleaning', () => {
    test('sollte leeren String zurückgeben, wenn Input falsy ist', () => {
        expect(cleanSystemTags(null)).toBe("");
        expect(cleanSystemTags("")).toBe("");
    });

    test('entfernt alle zentral definierten Tags aus Konstanten', () => {
        Object.values(TAGS).forEach(tag => {
            const input = `${tag}: Irgendwas`;
            const inputWithBold = `**${tag}**: Irgendwas`;
            
            expect(cleanSystemTags(input)).toBe('Irgendwas');
            expect(cleanSystemTags(inputWithBold)).toBe('Irgendwas');
        });
    });

    test('entfernt dynamische Zyklus-Header', () => {
        expect(cleanSystemTags('[Pioneer_1 (Zyklus 5)]: Text')).toBe('Text');
    });

    test('behält kreative Tags bei', () => {
        expect(cleanSystemTags('[KREATIV]: Wert')).toBe('[KREATIV]: Wert');
    });
});

describe('Logic Helpers - Precise Turn Counting', () => {
    test('zählt UR-IMPULS als 1', () => {
        const h = [{ role: 'user', parts: [{ text: `${TAGS.UR_IMPULS}: X` }] }];
        expect(countTotalTurns(h)).toBe(1);
    });
    
    test('zählt model-Response als 1', () => {
        const h = [{ role: 'model', parts: [{ text: 'Tat' }] }];
        expect(countTotalTurns(h)).toBe(1);
    });
    
    test('zählt gebündelte user-Nachrichten', () => {
        const h = [{ role: 'user', parts: [{ text: '[A]: X\n\n---\n\n[B]: Y' }] }];
        expect(countTotalTurns(h)).toBe(2);
    });
    
    test('zählt gemischte Historie korrekt', () => {
        const h = [
            { role: 'user', parts: [{ text: `${TAGS.UR_IMPULS}: Start\n\n---\n\n[B]: Hallo` }] },
            { role: 'model', parts: [{ text: 'Antwort' }] }
        ];
        expect(countTotalTurns(h)).toBe(3);
    });
});
