import Storage from "./Storage"
import TypeReference from "./TypeReference"

export default class Type extends TypeReference {
	static parseType(filepath: string, name: string, content: string): Type {
		const definition = Storage.instance.definition(filepath)
		return new Type(filepath, name, false)
	}

	static parseInterface(filepath: string, name: string, content: string): Type {
		return new Type(filepath, name, false)
	}

	static parseEnum(filepath: string, name: string, content: string): Type {
		return new Type(filepath, name, false)
	}

	static parseClass(filepath: string, name: string, content: string, _default: boolean): Type {
		return new Type(filepath, name, _default)
	}

	private constructor(filepath: string, name: string, _default: boolean) {
		super(filepath, name, _default)
	}
}
