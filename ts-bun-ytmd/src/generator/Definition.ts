import fs from "fs"
import path from "path"

import Storage from "./Storage"
import TypeReference, { TypeUID } from "./TypeReference"

export default class Definition {
	private readonly aliases: Map<string, TypeUID> = new Map()

	constructor(public readonly filepath: string) {
		if (!fs.existsSync(filepath)) throw new Error(`File doesn't exist: ${filepath}`)
	}

	private getDefinitionTypeReference(filepath: string, name: string): TypeReference {
		const definition = Storage.instance.definition(filepath)
		const exports = [...definition.getExports().values()]

		if (name === "default") {
			const _export = exports.find(tr => tr._default)
			if (_export) return _export
			throw new Error(`Couldn't find default export in ${filepath}`)
		} else {
			const _export = exports.find(tr => tr.name === name)
			if (_export) return _export
			throw new Error(`Couldn't find export "${name}" in ${filepath}`)
		}
	}

	getImports() {
		const imports: Map<TypeUID, TypeReference> = new Map()
		const content = fs.readFileSync(this.filepath, "utf-8")

		const importRegex = /^import(?: type)? ((?:.|\n)*?) from ['"](.*)['"];$/gm
		for (const [, values, from] of content.matchAll(importRegex)) {
			// Runs for every line that imports content from one file
			const filepath = path.join(this.filepath, "..", from!).replace(/\.js$/, ".d.ts")
			if (!from!.endsWith(".js")) {
				console.log(`Skipping library import: ${from}`)
				continue
			}

			if (values!.match(/{ .* }/)) {
				for (const nameWithAlias of values!.replace(/{ | }|type /g, "").split(", ")) {
					const [name, , alias] = nameWithAlias.split(" ")
					const type = this.getDefinitionTypeReference(filepath, name!)

					if (alias) this.aliases.set(alias, type.uid)
					imports.set(type.uid, type)
				}
			} else {
				const type = this.getDefinitionTypeReference(filepath, "default")

				this.aliases.set(values!, type.uid)
				imports.set(type.uid, type)
			}
		}

		return imports
	}

	getExports() {
		const exports: Map<TypeUID, TypeReference> = new Map()
		const content = fs.readFileSync(this.filepath, "utf-8")

		const exportFromRegex = /^export ((?:.|\n)*?) from ['"](.*)['"];$/gm
		for (const [, values, from] of content.matchAll(exportFromRegex)) {
			const filepath = path.join(this.filepath, "..", from!).replace(/\.js$/, ".d.ts")
			const definition = Storage.instance.definition(filepath)
			if (values === "*") {
				for (const [uid, type] of definition.getExports()) {
					exports.set(uid, type)
				}
				continue
			}

			for (const nameWithAlias of values!.replaceAll(/{ | }/g, "").split(", ")) {
				const [name, , alias] = nameWithAlias.split(" ")
				const type = this.getDefinitionTypeReference(filepath, name!)

				if (alias) this.aliases.set(alias, type.uid)
				exports.set(type.uid, type)
			}
		}

		for (const [, name] of content.matchAll(/^export(?: declare)? type (\w+) =/gm)) {
			const type = new TypeReference(this.filepath, name!, false)
			exports.set(type.uid, type)
		}

		for (const [, name] of content.matchAll(/^export(?: declare)? interface (\w+)/gm)) {
			const type = new TypeReference(this.filepath, name!, false)
			exports.set(type.uid, type)
		}

		for (const [, _default, name] of content.matchAll(
			/^export(?: declare)?( default)? class (\w+)/gm,
		)) {
			const type = new TypeReference(this.filepath, name!, !!_default)
			exports.set(type.uid, type)
		}

		const defaultMatch = content.match(/^export(?: default)? (\w+);$/m)
		if (defaultMatch) {
			const type = new TypeReference(this.filepath, defaultMatch[1]!, true)
			exports.set(type.uid, type)
		}

		return exports
	}
}
