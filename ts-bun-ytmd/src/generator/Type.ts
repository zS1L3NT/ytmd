import TypeReference from "./TypeReference"

export default class Type extends TypeReference {
	constructor(filepath: string, name: string, _default: boolean) {
		super(filepath, name, _default)
	}
}
