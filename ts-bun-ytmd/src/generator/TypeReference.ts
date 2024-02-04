import fs from "fs"
import path from "path"

export type TypeUID = `<${string} ${"=>" | "->"} ${string}>`

export default class TypeReference {
	private static base = path.join(import.meta.dir, "../../youtubei.js/dist/src/")

	constructor(
		public readonly filepath: string,
		public readonly name: string,
		public readonly _default: boolean,
	) {
		if (!fs.existsSync(filepath)) throw new Error(`File doesn't exist: ${filepath}`)
	}

	get uid(): TypeUID {
		return `<${this.filepath.replace(TypeReference.base, "./")} ${this._default ? "=>" : "->"} ${this.name}>`
	}
}
