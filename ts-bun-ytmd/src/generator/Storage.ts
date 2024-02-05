import Definition from "./Definition"

export default class Storage {
	static instance: Storage
	static base: string

	private readonly definitions: Map<string, Definition> = new Map()

	definition(filepath: string) {
		if (!this.definitions.has(filepath)) {
			this.definitions.set(filepath, new Definition(filepath))
		}

		return this.definitions.get(filepath)!
	}
}
