import Definition from "./Definition"
import Type from "./Type"
import TypeReference, { TypeUID } from "./TypeReference"

export default class Storage {
	static instance: Storage
	static base: string

	private readonly definitions: Map<string, Definition> = new Map()
	private readonly types: Map<TypeUID, TypeReference | Type> = new Map()

	__dump() {
		console.log(this.types.keys())
	}

	definition(filepath: string) {
		console.log(filepath)

		if (!this.definitions.has(filepath)) {
			this.definitions.set(filepath, new Definition(filepath))
		}

		return this.definitions.get(filepath)!
	}

	type(uid: TypeUID) {
		if (this.types.has(uid)) {
			return this.types.get(uid)
		}

		throw new Error(`Type not found: ${uid}`)
	}
}
