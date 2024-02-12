import Definition from "./Definition"

export default class Parser {
	constructor(
		private readonly definition: Definition,
		readonly generic?: string,
	) {}

	/**
	 * General function to parse a string into an expression
	 *
	 * @param content Content to parse
	 * @returns The parsed expression and characters in {@link content} used to parse it
	 */
	parse(content: string): {
		expression: Expression
		count: number
	} {
		const { values, delimeter, count } = this.split(content)

		/**
		 * If the split content is actually delimeter separated, then we return a union or intersection
		 *
		 * @example
		 * A<T> | B | C
		 */
		if (delimeter) {
			const expressions = values.map(v => this.parse(v).expression)
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

		/**
		 * If the split content is more than one keyword
		 *
		 * @example
		 * typeof fetch
		 */
		if (values.length !== 1) {
			console.log("UNKNOWN KEYWORDS", { keywords: values })
			return { expression: { type: "unknown" }, count }
		}

		/**
		 * If the expression is an array of itself, parse the array item
		 *
		 * @example
		 * string[]
		 */
		const value = values[0]!
		if (value.endsWith("[]")) {
			return {
				expression: {
					type: "array",
					value: this.parse(value.slice(0, -2)).expression,
				},
				count,
			}
		}

		/**
		 * If the expression is a pair
		 *   parse as a string literal if '' or ""
		 *   parse as an expression if ()
		 *   parse as an object if {}
		 *   unknown if [] or <>
		 *
		 * @example
		 * "hello"
		 * ("hello")
		 * { hello: "world" }
		 */
		const pair = this.pair(value)
		if (pair) {
			let expression: Expression
			if (pair[0] === `'` || pair[0] === `"`) {
				expression = { type: "literal", value: pair.slice(1, -1) }
			} else if (pair[0] === `(`) {
				expression = this.parse(pair.slice(1, -1)).expression
			} else if (pair[0] === `{`) {
				expression = this.parseObject(pair).expression
			} else if (pair[0] === `[` || pair[0] === `<`) {
				console.log("UNKNOWN PAIR", { pair })
				expression = { type: "unknown" }
			} else {
				throw new Error(`Invalid pair: ${pair}`)
			}

			return { expression, count }
		}

		/**
		 * If the expression is a primitive, return the primitive
		 */
		if (["Date", "string", "number", "boolean", "null", "undefined", "any"].includes(value)) {
			return {
				expression: { type: "primitive", kind: value as PrimitiveExpression["kind"] },
				count,
			}
		}

		/**
		 * If the expression is downright a generic, return the generic reference
		 */
		if (value === this.generic) {
			return { expression: { type: "generic" }, count }
		}

		/**
		 * If the expression is more than just a word with a possible generic, then return unknown
		 */
		const match = value.match(/^(\w+)(?:<(.*)>)?$/)
		if (!match) {
			console.log("UNKNOWN EXPRESSION", { expression: value })
			return { expression: { type: "unknown" }, count }
		}

		/**
		 * If the name of the expression is a defined type, return the type reference
		 */
		const [, name, generic] = match
		const type = this.definition.type(name!)
		if (type) {
			if (generic) {
				return {
					expression: {
						type: "type",
						reference: type,
						generic: this.parse(generic).expression,
					},
					count,
				}
			} else {
				return {
					expression: {
						type: "type",
						reference: type,
					},
					count,
				}
			}
		}

		/**
		 * Lastly, switch between primitive library types
		 */
		switch (name) {
			case "Partial":
				return {
					expression: {
						type: "object",
						properties: Object.fromEntries(
							Object.entries(this.parseObject(generic!).expression.properties).map(
								([k, v]) => [k.endsWith("?") ? k + "?" : k, v],
							),
						),
					},
					count,
				}
			case "Record":
				return {
					expression: {
						type: "object",
						properties: {},
						dynamic: this.parse(generic!.split(",")[1]!).expression,
					},
					count,
				}
			case "Promise":
				return {
					expression: {
						type: "promise",
						value: this.parse(generic!).expression,
					},
					count,
				}
		}

		/**
		 * If really all fails, return unknown type
		 */
		console.log("UNKNOWN TYPE", { type: name, generic })
		return {
			expression: { type: "unknown" },
			count,
		}
	}

	/**
	 * Specialised function to parse a class's content into an object or unknown expression
	 *
	 * @param content Content to parse
	 * @returns The parsed class as an object or unknown expression
	 */
	parseClass(content: string, _extends?: string): ObjectExpression | UnknownExpression {
		console.log({ content, _extends })

		return { type: "unknown" }
	}

	/**
	 * Specialised function to parse a string into a JSON object
	 *
	 * @param content Content to parse
	 * @returns The parsed object expression and characters in {@link content} used to parse it
	 */
	private parseObject(content: string): {
		expression: ObjectExpression
		count: number
	} {
		let curr = content
		const expression: ObjectExpression = {
			type: "object",
			properties: {},
		}

		if (curr[0] !== "{") throw new Error(`Invalid object: ${content}`)
		curr = curr.slice(1)

		while (curr.length) {
			const char = curr[0]!
			let pair: string | null = null

			if (char === " ") {
				curr = curr.slice(1)
				continue
			}

			if (char === "}") {
				curr = curr.slice(1)
				break
			}

			// Property
			let match: RegExpMatchArray | null = null
			if ((match = curr.match(/^(\w+\??): /))) {
				curr = curr.slice(match[0].length)
				const { expression: _expression, count } = this.parse(curr)

				expression.properties[match[1]!] = _expression
				curr = curr.slice(count)
				continue
			}

			// Dynamic property
			match = curr.match(/^\[.*?\]: /)
			pair = this.pair(curr)
			if (match && pair?.[0] === "[") {
				curr = curr.slice(pair.length + ": ".length)
				const { expression: _expression, count } = this.parse(curr)

				expression.dynamic = _expression
				curr = curr.slice(count)
				continue
			}

			// Function property
			match = curr.match(/^(\w+\??)/)
			pair = this.pair(curr.slice(match?.[0]?.length))
			if (
				match &&
				pair?.[0] === "(" &&
				curr.slice(match![0]!.length + pair.length).match(/^: /)
			) {
				curr = curr.slice(match![0]!.length + pair.length + ": ".length)
				curr = curr.slice(this.parse(curr).count)
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
	 * General function for handling all the splitting of an expression into | and & if any
	 *
	 * @param content Content to split
	 * @returns Values split, delimeter used and characters used
	 * @returns The parsed values, delimeter used to split and characters in {@link content} used to split
	 */
	private split(content: string): {
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

			if (char === "|" || char === "&") {
				if (delimeter === null) {
					delimeter = char
				} else if (char !== delimeter) {
					throw new Error(`Cannot use both | and & in the same expression: ${content}`)
				}

				curr = curr.slice(1)
				continue
			}

			let pair = this.pair(curr)
			if (pair) {
				let value = ""
				let nextchar: string | undefined = ""
				do {
					value += pair
					nextchar = curr[pair.length]
					curr = curr.slice(pair.length)
					pair = this.pair(curr)
				} while (pair && nextchar && !" ;|&".includes(nextchar))
				values.push(value)
				continue
			}

			let match: RegExpMatchArray | null = null
			if ((match = curr.match(/^(\w+)/))) {
				const value = match[1]!
				curr = curr.slice(value.length)

				const pair = this.pair(curr)
				const nextchar = curr[pair?.length ?? 0]
				if (!nextchar || nextchar === " " || nextchar === ";") {
					values.push(value + (pair ?? ""))
					curr = curr.slice(pair?.length ?? 0)
					continue
				} else {
					throw new Error(`Invalid content: ${content}`)
				}
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
	 * General function for finding pairs of characters like `'`, `"`, `(`, `[`, `{`, `<` in a string
	 *
	 * @param content Content to find pairs in
	 * @returns The first pair of characters found
	 */
	private pair(content: string): string | null {
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
