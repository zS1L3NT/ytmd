import fs from "fs"

import Storage from "./Storage"

export type TypeUID = `<${string} ${"=>" | "->"} ${string}>`

export default class TypeReference {
	constructor(
		public readonly filepath: string,
		public readonly name: string,
		public readonly _default: boolean,
	) {
		if (!fs.existsSync(filepath)) throw new Error(`File doesn't exist: ${filepath}`)
	}

	get uid(): TypeUID {
		return `<${this.filepath.replace(Storage.base, "./")} ${this._default ? "=>" : "->"} ${this.name}>`
	}
}
