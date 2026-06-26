const { buildAgentContext, callGemini } = require('../.agents/skills/sim-agent-loop/scripts/utils/api_client');

global.fetch = jest.fn();

describe('API Client - Context & Communication', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('buildAgentContext', () => {
        test('sollte mit [BEGINN DER EXISTENZ] starten, wenn Historie leer ist', () => {
            const ctx = buildAgentContext('A', [], "M", "E", "G", "I", false);
            expect(ctx.contents[0].parts[0].text).toContain("[BEGINN DER EXISTENZ]");
        });

        test('sollte fremde Nachrichten in einem user-Block bündeln', () => {
            const history = [{ agent: 'B', text: 'Hi' }, { agent: 'C', text: 'Ho' }];
            const ctx = buildAgentContext('A', history, "M", "E", "G", "I", false);
            expect(ctx.contents.length).toBe(1);
            expect(ctx.contents[0].role).toBe('user');
            expect(ctx.contents[0].parts[0].text).toContain('[B]');
            expect(ctx.contents[0].parts[0].text).toContain('[C]');
        });

        test('sollte eigene Nachrichten als model-Block speichern', () => {
            const history = [{ agent: 'A', text: 'Meine Tat' }];
            const ctx = buildAgentContext('A', history, "M", "E", "G", "I", false);
            expect(ctx.contents[1].role).toBe('model');
        });

        test('sollte Langzeitgedächtnis injizieren', () => {
            const ctx = buildAgentContext('A', [], "ALTES WISSEN", "E", "G", "I", false);
            expect(ctx.contents[0].parts[0].text).toContain("[KOLLEKTIVES GEDÄCHTNIS]");
            expect(ctx.contents[0].parts[0].text).toContain("ALTES WISSEN");
        });

        test('sollte Formraum injizieren', () => {
            const ctx = buildAgentContext('A', [], "M", "DATEI-LISTE", "G", "I", false);
            expect(ctx.contents[0].parts[0].text).toContain("[FORMRAUM]");
            expect(ctx.contents[0].parts[0].text).toContain("DATEI-LISTE");
        });
    });

    describe('callGemini', () => {
        test('sollte erfolgreiche Response parsen', async () => {
            fetch.mockResolvedValueOnce({
                json: async () => ({ candidates: [{ content: { parts: [{ text: "OK" }] } }] })
            });
            const res = await callGemini('url', {});
            expect(res).toBe("OK");
        });

        test('sollte bei 1. Fehler einen Retry machen', async () => {
            fetch
                .mockRejectedValueOnce(new Error("Timeout"))
                .mockResolvedValueOnce({
                    json: async () => ({ candidates: [{ content: { parts: [{ text: "Retry Success" }] } }] })
                });
            const res = await callGemini('url', {}, 2);
            expect(res).toBe("Retry Success");
            expect(fetch).toHaveBeenCalledTimes(2);
        }, 10000);

        test('sollte nach max Retries aufgeben und werfen', async () => {
            fetch.mockRejectedValue(new Error("Persistent Fail"));
            await expect(callGemini('url', {}, 2)).rejects.toThrow("Persistent Fail");
            expect(fetch).toHaveBeenCalledTimes(2);
        }, 10000);

        test('sollte API-spezifische Fehlerobjekte (data.error) werfen', async () => {
            fetch.mockResolvedValue({
                json: async () => ({ error: { message: "Quota" } })
            });
            await expect(callGemini('url', {}, 1)).rejects.toThrow("Quota");
        });

        test('sollte leere Kandidaten-Liste abfangen', async () => {
            fetch.mockResolvedValueOnce({
                json: async () => ({ candidates: [] })
            });
            const res = await callGemini('url', {});
            expect(res).toBe("[ERROR: API_EMPTY_RESPONSE]");
        });
    });
});
