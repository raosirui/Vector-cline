import "should";
import { openRouterDefaultModelInfo } from "@shared/api";
import sinon from "sinon";
import { OpenRouterHandler } from "../openrouter";
describe("OpenRouterHandler", () => {
    afterEach(() => {
        sinon.restore();
    });
    const createAsyncIterable = (data = []) => ({
        [Symbol.asyncIterator]: async function* () {
            yield* data;
        },
    });
    it("should handle usage-only chunks when delta is missing", async () => {
        const handler = new OpenRouterHandler({
            openRouterApiKey: "test-api-key",
        });
        const fakeClient = {
            chat: {
                completions: {
                    create: sinon.stub().resolves(createAsyncIterable([
                        {
                            choices: [{}],
                            usage: {
                                prompt_tokens: 13,
                                completion_tokens: 5,
                            },
                        },
                    ])),
                },
            },
        };
        sinon.stub(handler, "ensureClient").returns(fakeClient);
        sinon.stub(handler, "getModel").returns({
            id: "openai/gpt-4o-mini",
            info: openRouterDefaultModelInfo,
        });
        const chunks = [];
        for await (const chunk of handler.createMessage("system", [{ role: "user", content: "hi" }])) {
            chunks.push(chunk);
        }
        chunks.should.deepEqual([
            {
                type: "usage",
                cacheWriteTokens: 0,
                cacheReadTokens: 0,
                inputTokens: 13,
                outputTokens: 5,
                totalCost: 0,
            },
        ]);
    });
});
//# sourceMappingURL=openrouter.test.js.map