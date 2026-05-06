import { strict as assert } from "node:assert"
import type { ApiHandler } from "@core/api"
import { describe, it } from "mocha"
import sinon from "sinon"
import { updateApiReqMsg } from "../utils"

function createApiStub(inputPrice: number, outputPrice: number): ApiHandler {
	return {
		getModel: () => ({
			id: "test-model",
			info: {
				contextWindow: 200_000,
				inputPrice,
				outputPrice,
			},
		}),
	} as ApiHandler
}

describe("updateApiReqMsg", () => {
	it("does not use Anthropic USD fallback when providerId is cline and totalCost is undefined", async () => {
		const updateClineMessage = sinon.spy(async (_index: number, _patch: { text: string }) => {})
		const messageStateHandler = {
			getClineMessages: () => [{ text: JSON.stringify({ request: "run" }) }],
			updateClineMessage,
		}

		await updateApiReqMsg({
			messageStateHandler: messageStateHandler as never,
			lastApiReqIndex: 0,
			inputTokens: 1_000_000,
			outputTokens: 500_000,
			cacheWriteTokens: 0,
			cacheReadTokens: 0,
			totalCost: undefined,
			api: createApiStub(21, 105),
			providerId: "cline",
		})

		const saved = JSON.parse(updateClineMessage.firstCall.args[1].text)
		assert.equal(saved.cost, 0)
	})

	it("preserves prior api_req cost for cline when totalCost is undefined", async () => {
		const prior = 0.0405
		const updateClineMessage = sinon.spy(async (_index: number, _patch: { text: string }) => {})
		const messageStateHandler = {
			getClineMessages: () => [{ text: JSON.stringify({ request: "run", cost: prior }) }],
			updateClineMessage,
		}

		await updateApiReqMsg({
			messageStateHandler: messageStateHandler as never,
			lastApiReqIndex: 0,
			inputTokens: 0,
			outputTokens: 0,
			cacheWriteTokens: 0,
			cacheReadTokens: 0,
			totalCost: undefined,
			api: createApiStub(21, 105),
			providerId: "cline",
		})

		const saved = JSON.parse(updateClineMessage.firstCall.args[1].text)
		assert.equal(saved.cost, prior)
	})

	it("uses Anthropic-style estimate when providerId is not cline and totalCost is undefined", async () => {
		const updateClineMessage = sinon.spy(async (_index: number, _patch: { text: string }) => {})
		const messageStateHandler = {
			getClineMessages: () => [{ text: JSON.stringify({ request: "run" }) }],
			updateClineMessage,
		}

		await updateApiReqMsg({
			messageStateHandler: messageStateHandler as never,
			lastApiReqIndex: 0,
			inputTokens: 1_000_000,
			outputTokens: 0,
			cacheWriteTokens: 0,
			cacheReadTokens: 0,
			totalCost: undefined,
			api: createApiStub(3, 15),
		})

		const saved = JSON.parse(updateClineMessage.firstCall.args[1].text)
		assert.equal(saved.cost, 3)
	})
})
