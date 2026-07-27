const { cleanSystemTags, countTotalTurns } = require('../sim_engine/utils/logic_helpers');
const { TAGS } = require('../sim_engine/utils/constants');

describe('Logic Helpers - Precise Tag Cleaning', () => {
    test('should return an empty string if input is falsy', () => {
        expect(cleanSystemTags(null)).toBe("");
        expect(cleanSystemTags("")).toBe("");
    });

    test('removes all centrally defined tags from constants', () => {
        Object.values(TAGS).forEach(tag => {
            const input = `${tag}: Something`;
            const inputWithBold = `**${tag}**: Something`;
            
            expect(cleanSystemTags(input)).toBe('Something');
            expect(cleanSystemTags(inputWithBold)).toBe('Something');
        });
    });

    test('removes dynamic cycle headers', () => {
        expect(cleanSystemTags('[Pioneer_1 (Cycle 5)]: Text')).toBe('Text');
    });

    test('preserves creative tags', () => {
        expect(cleanSystemTags('[CREATIVE]: Value')).toBe('[CREATIVE]: Value');
    });
});

describe('Logic Helpers - Precise Turn Counting', () => {
    test('counts UR_IMPULSE as 1', () => {
        const h = [{ role: 'user', parts: [{ text: `${TAGS.UR_IMPULS}: X` }] }];
        expect(countTotalTurns(h)).toBe(1);
    });
    
    test('counts model response as 1', () => {
        const h = [{ role: 'model', parts: [{ text: 'Action' }] }];
        expect(countTotalTurns(h)).toBe(1);
    });
    
    test('counts bundled user messages', () => {
        const h = [{ role: 'user', parts: [{ text: '[A]: X\n\n---\n\n[B]: Y' }] }];
        expect(countTotalTurns(h)).toBe(2);
    });
    
    test('counts mixed history correctly', () => {
        const h = [
            { role: 'user', parts: [{ text: `${TAGS.UR_IMPULS}: Start\n\n---\n\n[B]: Hello` }] },
            { role: 'model', parts: [{ text: 'Response' }] }
        ];
        expect(countTotalTurns(h)).toBe(3);
    });
});