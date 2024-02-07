export default class Parser {
	static parse(content: string): {
		expression: Expression
		count: number
	} {
		const { values, delimeter, count } = Parser.split(content)

		if (delimeter) {
			const expressions = values.map(v => Parser.parse(v).expression)
			if (delimeter === "|") {
				return {
					expression: {
						type: "union",
						values: expressions,
					},
					count,
				}
			} else if (delimeter === "&") {
				return {
					expression: {
						type: "intersection",
						values: expressions,
					},
					count,
				}
			}
		}

		if (values.length !== 1) {
			return {
				expression: {
					type: "unknown",
				},
				count,
			}
		}

		const value = values[0]!

		const pair = Parser.pair(value)
		if (pair) {
			if (pair[0] === `'` || pair[0] === `"`) {
				return {
					expression: {
						type: "literal",
						value: pair.slice(1, -1),
					},
					count,
				}
			}

			if (pair[0] === `(`) {
				return {
					expression: Parser.parse(pair.slice(1, -1)).expression,
					count,
				}
			}

			if (pair[0] === `{`) {
				return {
					expression: Parser.parseObject(pair).expression,
					count,
				}
			}

			if (pair[0] === `[` || pair[0] === `<`) {
				return {
					expression: {
						type: "unknown",
					},
					count,
				}
			}

			throw new Error(`Invalid pair: ${pair}`)
		}

		console.log("READTYPE", { value })

		return {
			expression: {
				type: "unknown",
			},
			count,
		}
	}

	private static parseObject(content: string): {
		expression: ObjectExpression
		count: number
	} {
		let curr = content
		const expression: ObjectExpression = {
			type: "object",
			value: {},
		}

		if (curr[0] !== "{") throw new Error(`Invalid object: ${content}`)
		curr = curr.slice(1)

		while (curr.length) {
			const char = curr[0]!

			if (char === " ") {
				curr = curr.slice(1)
				continue
			}

			if (char === "}") {
				curr = curr.slice(1)
				break
			}

			let match: RegExpMatchArray | null = null
			if ((match = curr.match(/^(\w+\??): /))) {
				const [full, key] = match
				const { expression: _expression, count } = Parser.parse(curr.slice(full.length))

				expression.value[key!] = _expression
				curr = curr.slice(full.length + count)
				continue
			}

			throw new Error(`Invalid object property: ${curr}`)
		}

		return {
			expression,
			count: content.length - curr.length,
		}
	}

	/**
	 * Handles all the splitting of an expression into | and & if used
	 *
	 * @param content Content to split
	 * @returns Values split, delimeter used and characters used
	 */
	private static split(content: string): {
		values: string[]
		delimeter: "|" | "&" | null
		count: number
	} {
		let curr = content
		let delimeter: "|" | "&" | null = null
		const values: string[] = []

		while (curr.length) {
			const char = curr[0]!

			if (char === " ") {
				curr = curr.slice(1)
				continue
			}

			if (char === ";") {
				curr = curr.slice(1)
				break
			}

			const pair = Parser.pair(curr)
			if (pair) {
				values.push(pair)
				curr = curr.slice(pair.length)
				continue
			}

			let match: RegExpMatchArray | null = null
			if ((match = curr.match(/^(\w+)/))) {
				const value = match[1]!
				const pair = Parser.pair(curr.slice(value!.length))
				const length = value.length + (pair?.length ?? 0)

				const nextchar = curr[length]
				if (!nextchar || nextchar === " " || nextchar === ";") {
					values.push(value + (pair ?? ""))
					curr = curr.slice(length)
					continue
				} else {
					throw new Error(`Invalid content: ${content}`)
				}
			}

			if (char === "|" || char === "&") {
				if (delimeter === null) {
					delimeter = char
				} else if (char !== delimeter) {
					throw new Error(`Cannot use both | and & in the same expression: ${content}`)
				}

				curr = curr.slice(1)
				continue
			}

			console.log({ content })
			throw new Error(`Invalid content: ${content}`)
		}

		return {
			values,
			delimeter,
			count: content.length - curr.length,
		}
	}

	/**
	 * Find pairs of characters like ', ", (, [, {, < in a string
	 *
	 * @param content Content to find pairs in
	 * @returns
	 */
	private static pair(content: string): string | null {
		const pairs = {
			'"': '"',
			"'": "'",
			"(": ")",
			"[": "]",
			"{": "}",
			"<": ">",
		} as const

		const start = content[0]! as keyof typeof pairs
		if (!(start in pairs)) return null

		const end = pairs[start]

		if (start === `"` || start === `'`) {
			for (let index = 1; index < content.length; index++) {
				if (content[index] === end && content[index - 1] !== "\\") {
					return content.slice(0, index + 1)
				}
			}
		} else {
			let nests = 1
			for (let index = 1; index < content.length; index++) {
				if (content[index] === start) {
					nests++
				}

				if (content[index] === end) {
					if (nests === 1) {
						return content.slice(0, index + 1)
					} else {
						nests--
					}
				}
			}
		}

		throw new Error(`Could not find a pair of ${start}${end} in ${content}`)
	}
}
