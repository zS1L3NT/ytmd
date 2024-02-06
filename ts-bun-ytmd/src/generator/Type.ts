import fs from "fs"

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

	get uid(): TypeID {
		return `<${this.filepath.replace(Storage.base, "./")} ${this._default ? "=>" : "->"} ${this.name}>`
	}
}
