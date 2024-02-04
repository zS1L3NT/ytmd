import Type from "./Type"
import TypeReference, { TypeUID } from "./TypeReference"

export default class Storage {
	private readonly types: Map<TypeUID, TypeReference | Type> = new Map()

	__dump() {
		console.log(this.types.keys())
	}

	get(uid: TypeUID) {
		return this.types.get(uid)
	}

	register(type: TypeReference | Type) {
		this.types.set(type.uid, type)
	}
}
