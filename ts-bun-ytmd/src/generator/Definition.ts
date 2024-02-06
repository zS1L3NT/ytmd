import fs from "fs"
import path from "path"

import Storage from "./Storage"
import TypeReference, { TypeUID } from "./TypeReference"

export default class Definition {
	private readonly content: string
	readonly aliases: Map<string, TypeUID> = new Map()
	private _imports: Map<TypeUID, TypeReference> | null = null
	private _exports: Map<TypeUID, TypeReference> | null = null

	constructor(readonly filepath: string) {
		if (!fs.existsSync(filepath)) throw new Error(`File doesn't exist: ${filepath}`)
		this.content = fs.readFileSync(this.filepath, "utf-8")
	}

	private getDefinitionTypeReference(filepath: string, name: string): TypeReference {
		const definition = Storage.instance.definition(filepath)
		const exports = [...definition.exports.values()]

		if (name === "default") {
			const _export = exports.find(tr => tr._default)
			if (_export) return _export

			throw new Error(`Couldn't find default export in ${filepath}`)
		} else {
			const _export = exports.find(tr => tr.name === name)
			if (_export) return _export

			const alias = definition.aliases.get(name)
			if (alias) return definition.exports.get(alias)!

			throw new Error(`Couldn't find export "${name}" in ${filepath}`)
		}
	}

	get imports() {
		if (!this._imports) {
			this._imports = new Map<TypeUID, TypeReference>()

			const importRegex = /^import(?: type)? ((?:.|\n)*?) from ['"](.*)['"];$/gm
			for (const [, values, from] of this.content.matchAll(importRegex)) {
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
						this._imports.set(type.uid, type)
					}
				} else {
					const type = this.getDefinitionTypeReference(filepath, "default")

					this.aliases.set(values!, type.uid)
					this._imports.set(type.uid, type)
				}
			}
		}

		return this._imports
	}

	get exports() {
		if (!this._exports) {
			this._exports = new Map<TypeUID, TypeReference>()

			const exportFromRegex = /^export(?: type)? ((?:.|\n)*?) from ['"](.*)['"];$/gm
			for (const [, values, from] of this.content.matchAll(exportFromRegex)) {
				// Weird edge case for ./utils/FormatUtils.d.ts
				if (values!.includes("export ")) continue

				const filepath = path.join(this.filepath, "..", from!).replace(/\.js$/, ".d.ts")
				const definition = Storage.instance.definition(filepath)

				if (values === "*") {
					for (const [uid, type] of definition.exports) {
						this._exports.set(uid, type)
					}
					continue
				}

				if (values!.match(/\* as \w+/)) {
					console.log(`Skipping wildcard rename import: ${values}`)
					continue
				}

				for (const nameWithAlias of values!.replaceAll(/{ | }/g, "").split(", ")) {
					const [name, , alias] = nameWithAlias.split(" ")
					const type = this.getDefinitionTypeReference(filepath, name!)

					if (alias) this.aliases.set(alias, type.uid)
					this._exports.set(type.uid, type)
				}
			}

			for (const [, name] of this.content.matchAll(
				/^export(?: declare)? type (\w+)(?:<.*?>)? =/gm,
			)) {
				const type = new TypeReference(this.filepath, name!, false)
				this._exports.set(type.uid, type)
			}

			for (const [, name] of this.content.matchAll(
				/^export(?: declare)? interface (\w+)/gm,
			)) {
				const type = new TypeReference(this.filepath, name!, false)
				this._exports.set(type.uid, type)
			}

			for (const [, _default, name] of this.content.matchAll(
				/^export(?: declare)?( default)? class (\w+)/gm,
			)) {
				const type = new TypeReference(this.filepath, name!, !!_default)
				this._exports.set(type.uid, type)
			}

			const defaultMatch = this.content.match(/^export(?: default)? (\w+);$/m)
			if (defaultMatch) {
				const type = new TypeReference(this.filepath, defaultMatch[1]!, true)
				this._exports.set(type.uid, type)
			}
		}

		return this._exports
	}
}
