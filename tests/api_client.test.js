const { buildAgentContext, callGemini } = require('../sim_engine/utils/api_client');

global.fetch = jest.fn();

describe('API Client - Context & Communication', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('buildAgentContext', () => {
        test('should start with [BEGINNING OF EXISTENCE] if history is empty', () => {
            const ctx = buildAgentContext('A', [], "M", "E", "G", "I", false);
            expect(ctx.contents[0].parts[0].text).toContain("[BEGINNING OF EXISTENCE]");
        });

        test('should bundle foreign messages in a user-block', () => {
            const history = [{ agent: 'B', text: 'Hi' }, { agent: 'C', text: 'Ho' }];
            const ctx = buildAgentContext('A', history, "M", "E", "G", "I", false);
            expect(ctx.contents.length).toBe(1);
            expect(ctx.contents[0].role).toBe('user');
            expect(ctx.contents[0].parts[0].text).toContain('[B]');
            expect(ctx.contents[0].parts[0].text).toContain('[C]');
        });

        test('should save own messages as a model-block', () => {
            const history = [{ agent: 'A', text: 'My Action' }];
            const ctx = buildAgentContext('A', history, "M", "E", "G", "I", false);
            expect(ctx.contents[1].role).toBe('model');
        });

        test('should inject long-term memory', () => {
            const ctx = buildAgentContext('A', [], "OLD KNOWLEDGE", "E", "G", "I", false);
            expect(ctx.contents[0].parts[0].text).toContain("[MEMORY-EXTRACT]");
            expect(ctx.contents[0].parts[0].text).toContain("OLD KNOWLEDGE");
        });

        test('should inject form space', () => {
            const ctx = buildAgentContext('A', [], "M", "FILE-LIST", "G", "I", false);
            expect(ctx.system_instruction.parts[0].text).toContain("FILE-LIST");
        });
    });

    describe('callGemini', () => {
        test('should parse successful response', async () => {
            fetch.mockResolvedValueOnce({
                json: async () => ({ candidates: [{ content: { parts: [{ text: "OK" }] } }] })
            });
            const res = await callGemini('url', {});
            expect(res).toBe("OK");
        });

        test('should retry on first error', async () => {
            fetch
                .mockRejectedValueOnce(new Error("Timeout"))
                .mockResolvedValueOnce({
                    json: async () => ({ candidates: [{ content: { parts: [{ text: "Retry Success" }] } }] })
                });
            const res = await callGemini('url', {}, 2);
            expect(res).toBe("Retry Success");
            expect(fetch).toHaveBeenCalledTimes(2);
        }, 10000);

        test('should give up and throw after max retries', async () => {
            fetch.mockRejectedValue(new Error("Persistent Fail"));
            await expect(callGemini('url', {}, 2)).rejects.toThrow("Persistent Fail");
            expect(fetch).toHaveBeenCalledTimes(2);
        }, 10000);

        test('should throw API-specific error objects (data.error)', async () => {
            fetch.mockResolvedValue({
                json: async () => ({ error: { message: "Quota" } })
            });
            await expect(callGemini('url', {}, 1)).rejects.toThrow("Quota");
        });

        test('should catch empty candidates list', async () => {
            fetch.mockResolvedValueOnce({
                json: async () => ({ candidates: [] })
            });
            const res = await callGemini('url', {});
            expect(res).toBe("[ERROR: API_EMPTY_RESPONSE]");
        });
    });
});