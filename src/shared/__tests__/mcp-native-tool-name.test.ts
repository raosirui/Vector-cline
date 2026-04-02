import { describe, it } from "mocha"
import "should"
import { buildMcpNativeToolOpenApiSegment, MCP_NATIVE_TOOL_SERVER_KEY_LENGTH, parseMcpNativeCompositeToolName } from "../mcp"

describe("MCP native OpenAI-style tool names", () => {
	describe("buildMcpNativeToolOpenApiSegment", () => {
		it("passes through valid ASCII tool names", () => {
			const r = buildMcpNativeToolOpenApiSegment("read_file")
			r.apiSegment.should.equal("read_file")
			;(r.realNameForAlias === undefined).should.be.true()
		})

		it("surrogates names with dots and maps via alias", () => {
			const r = buildMcpNativeToolOpenApiSegment("foo.bar/tool")
			r.apiSegment.should.match(/^[a-zA-Z0-9_-]+$/)
			r.realNameForAlias!.should.equal("foo.bar/tool")
		})

		it("surrogates unicode tool names", () => {
			const r = buildMcpNativeToolOpenApiSegment("工具")
			r.apiSegment.should.match(/^[a-zA-Z0-9_-]+$/)
			r.realNameForAlias!.should.equal("工具")
		})
	})

	describe("parseMcpNativeCompositeToolName", () => {
		it("parses fixed-width server key and segment", () => {
			const uid = "c".repeat(MCP_NATIVE_TOOL_SERVER_KEY_LENGTH)
			const composite = `${uid}0mcp0read_file`
			const p = parseMcpNativeCompositeToolName(composite)!
			p.serverKey.should.equal(uid)
			p.toolName.should.equal("read_file")
		})

		it("preserves tool segment containing the delimiter substring", () => {
			const uid = "c".repeat(MCP_NATIVE_TOOL_SERVER_KEY_LENGTH)
			const composite = `${uid}0mcp0x0mcp0y`
			const p = parseMcpNativeCompositeToolName(composite)!
			p.toolName.should.equal("x0mcp0y")
		})
	})
})
