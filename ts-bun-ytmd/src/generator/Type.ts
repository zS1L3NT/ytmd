import TypeReference from "./TypeReference"

export default class Type extends TypeReference {
	static parseType(filepath: string, name: string, content: string): Type {}

	static parseInterface(filepath: string, name: string, content: string): Type {}

	static parseEnum(filepath: string, name: string, content: string): Type {}

	static parseClass(filepath: string, name: string, content: string, _default: boolean): Type {}

	private constructor(filepath: string, name: string, _default: boolean) {
		super(filepath, name, _default)
	}
}
