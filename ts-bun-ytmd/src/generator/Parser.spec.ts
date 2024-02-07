// @ts-nocheck

import { describe, expect, it } from "bun:test"

import Parser from "./Parser"

describe("Finding pairs", () => {
	it("Throws errors when the first character isn't a pair symbol", () => {
		expect(Parser.pair(`abc`)).toBeNull()
	})

	it("Throws error when cannot find ending pair", () => {
		expect(() => Parser.pair(`"abc`)).toThrow(new Error(`Could not find a pair of "" in "abc`))
		expect(() => Parser.pair(`'abc`)).toThrow(new Error(`Could not find a pair of '' in 'abc`))
		expect(() => Parser.pair(`(abc`)).toThrow(new Error(`Could not find a pair of () in (abc`))
		expect(() => Parser.pair(`[abc`)).toThrow(new Error(`Could not find a pair of [] in [abc`))
		expect(() => Parser.pair(`{abc`)).toThrow(new Error(`Could not find a pair of {} in {abc`))
	})

	it("Can detect pairs as return correct data", () => {
		expect(Parser.pair(`"abc";`)).toBe(`"abc"`)
		expect(Parser.pair(`'abc';`)).toBe(`'abc'`)
		expect(Parser.pair(`(abc);`)).toBe(`(abc)`)
		expect(Parser.pair(`[abc];`)).toBe(`[abc]`)
		expect(Parser.pair(`{abc};`)).toBe(`{abc}`)
	})

	it("Doesn't treat string escapes the same way", () => {
		expect(Parser.pair(`"abc\\"def";`)).toBe(`"abc\\"def"`)
		expect(Parser.pair(`'abc\\'def';`)).toBe(`'abc\\'def'`)
	})

	it("Ignored other nested closing brackets", () => {
		expect(Parser.pair(`(abc(def)ghi)`)).toBe(`(abc(def)ghi)`)
		expect(Parser.pair(`[abc[def]ghi]`)).toBe(`[abc[def]ghi]`)
		expect(Parser.pair(`{abc{def}ghi}`)).toBe(`{abc{def}ghi}`)
	})
})
