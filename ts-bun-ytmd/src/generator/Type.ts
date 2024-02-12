import fs from "fs"

import Definition from "./Definition"
import Parser from "./Parser"
import Storage from "./Storage"

export type TypeID = `<${string} ${"=>" | "->"} ${string}>`

export default class Type {
	constructor(
		readonly filepath: string,
		readonly name: string,
		readonly _default: boolean,
		readonly content: string,
	) {
		if (!fs.existsSync(filepath)) throw new Error(`File doesn't exist: ${filepath}`)
	}

	get id(): TypeID {
		return `<${this.filepath.replace(Storage.base, "./")} ${this._default ? "=>" : "->"} ${this.name}>`
	}

	parse(definition: Definition) {
		switch (this.content.split(" ")[0]) {
			case "type":
				return this.parseType(definition)
			case "interface":
				return this.parseInterface(definition)
			case "class":
				return this.parseClass(definition)
			case "enum":
				console.log("Skipping enum", { name: this.name })
				return { type: "unknown" }
			default:
				throw new Error(`Invalid content: ${this.content}`)
		}
	}

	private parseType(definition: Definition) {
		const [full, generic] = this.content.match(/^type \w+(?:<(.*?)>)? = /)!

		if (generic && generic.length > 1) {
			throw new Error(`Complex generic: ${generic}`)
		}

		return new Parser(definition, generic).parse(this.content.slice(full.length)).expression
	}

	private parseInterface(definition: Definition) {
		const [full, generic] = this.content.match(/^interface \w+(?:<(.*?)>)? /)!

		if (generic && generic.length > 1) {
			throw new Error(`Complex generic: ${generic}`)
		}

		return new Parser(definition, generic).parse(this.content.slice(full.length)).expression
	}

	private parseClass(definition: Definition) {
		const [full, generic, _extends] = this.content.match(
			/^class \w+(?:<(.*?)>)?(?: extends (\w+(?:<.*?>)?))? /,
		)!

		return new Parser(definition, generic).parseClass(this.content.slice(full.length), _extends)
	}
}
