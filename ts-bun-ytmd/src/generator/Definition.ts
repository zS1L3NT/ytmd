import fs from "fs"
import path from "path"

import Storage from "./Storage"
import Type from "./Type"
import TypeReference, { TypeUID } from "./TypeReference"

export default class Definition {
	private readonly content: string
	readonly aliases: Map<string, TypeUID> = new Map()
	private _imports: Map<TypeUID, TypeReference> | null = null
	private _exports: Map<TypeUID, TypeReference | Type> | null = null

	constructor(readonly filepath: string) {
		if (!fs.existsSync(filepath)) throw new Error(`File doesn't exist: ${filepath}`)
		this.content = fs
			.readFileSync(this.filepath, "utf-8")
			.replaceAll(/\/\*\*(?:.|\n)*?\*\//g, "")
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
			this._exports = new Map<TypeUID, TypeReference | Type>()

			const lines = this.content
				.split(/\nexport /)
				.slice(1)
				.map(l => l.replaceAll("\n", "").replaceAll("    ", ""))
			for (const line of lines) {
				const exportFromRegex = /^(.*) from '(.*)';$/
				if (line.match(exportFromRegex)) {
					const [, values, from] = line.match(exportFromRegex)!

					const filepath = path.join(this.filepath, "..", from!).replace(/\.js$/, ".d.ts")
					const definition = Storage.instance.definition(filepath)

					if (values === "*") {
						for (const [uid, type] of definition.exports) {
							this._exports.set(uid, type)
						}
						continue
					}

					if (values!.match(/^\* as \w+$/)) {
						console.log(`Skipping wildcard rename import: ${values}`)
						continue
					}

					for (const nameWithAlias of values!.replaceAll(/{ | }/g, "").split(", ")) {
						const [name, , alias] = nameWithAlias.split(" ")
						const type = this.getDefinitionTypeReference(filepath, name!)

						if (alias) this.aliases.set(alias, type.uid)
						this._exports.set(type.uid, type)
					}

					continue
				}

				const exportTypeRegex = /^(?:declare )?type (\w+)(?:<.*?>)? =(.*);$/
				if (line.match(exportTypeRegex)) {
					const [, name, content] = line.match(exportTypeRegex)!
					const type = Type.parseType(this.filepath, name!, content!)
					this._exports.set(type.uid, type)
					continue
				}

				const exportInterfaceRegex = /^(?:declare )?interface (\w+)(.*)$/
				if (line.match(exportInterfaceRegex)) {
					const [, name, content] = line.match(exportInterfaceRegex)!
					const type = Type.parseInterface(this.filepath, name!, content!)
					this._exports.set(type.uid, type)
					continue
				}

				const exportEnumRegex = /^(?:declare )?enum (\w+)(.*)$/
				if (line.match(exportEnumRegex)) {
					const [, name, content] = line.match(exportEnumRegex)!
					const type = Type.parseEnum(this.filepath, name!, content!)
					this._exports.set(type.uid, type)
					continue
				}

				const exportInlineClassRegex = /^(?:declare )?(default )?class (\w+)(.*)$/
				if (line.match(exportInlineClassRegex)) {
					const [, _default, name, content] = line.match(exportInlineClassRegex)!
					const type = Type.parseClass(this.filepath, name!, content!, !!_default)
					this._exports.set(type.uid, type)
					continue
				}

				const exportOnlyClassRegex = /^default (\w+);$/
				if (line.match(exportOnlyClassRegex)) {
					const [, name] = line.match(exportOnlyClassRegex)!
					const content = this.content
						.split(/\n(declare|export) /)
						.slice(1)
						.map(l => l.replaceAll("\n", "").replaceAll("    ", ""))
						.map(l => l.match(/^class (\w+)(.*)$/))
						.find(m => m && m[1] === name)![2]
					const type = Type.parseClass(this.filepath, name!, content!, true)
					this._exports.set(type.uid, type)
					continue
				}

				throw new Error(`Couldn't parse export: ${line}`)
			}
		}

		return this._exports
	}
}
