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
			const locals = new Map<TypeUID, TypeReference>()

			let chunk = ""
			const values: string[] = []
			for (const line of this.content.split("\n")) {
				if (line.startsWith("import")) continue
				if (line.match(/^\w+ /)) {
					if (chunk) values.push(chunk)
					chunk = line
				} else {
					chunk += line
				}
			}
			values.push(chunk)

			for (const value of values) {
				let match: RegExpMatchArray | null = null
				if ((match = value.match(/^export (.*) from '(.*)';$/))) {
					const [, values, from] = match

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

				if ((match = value.match(/^(export )?(?:declare )?type (\w+)(.*)$/))) {
					const [, _export, name, content] = match
					const type = Type.parseType(this.filepath, name!, `type ${name}${content}`)
					if (_export) {
						this._exports.set(type.uid, type)
					} else {
						locals.set(type.uid, type)
					}
					continue
				}

				if ((match = value.match(/^(export )?(?:declare )?interface (\w+)(.*)$/))) {
					const [, _export, name, content] = match
					const type = Type.parseInterface(
						this.filepath,
						name!,
						`interface ${name}${content}`,
					)
					if (_export) {
						this._exports.set(type.uid, type)
					} else {
						locals.set(type.uid, type)
					}
					continue
				}

				if ((match = value.match(/^(export )?(?:declare )?enum (\w+)(.*)$/))) {
					const [, _export, name, content] = match
					const type = Type.parseEnum(this.filepath, name!, `enum ${name}${content}`)
					if (_export) {
						this._exports.set(type.uid, type)
					} else {
						locals.set(type.uid, type)
					}
					continue
				}

				if ((match = value.match(/^(export )?(?:declare )?(default )?class (\w+)(.*)$/))) {
					const [, _export, _default, name, content] = match
					const type = Type.parseClass(
						this.filepath,
						name!,
						`class ${name}${content}`,
						!!_default,
					)
					if (_export) {
						this._exports.set(type.uid, type)
					} else {
						locals.set(type.uid, type)
					}
					continue
				}

				if ((match = value.match(/^export default (\w+);$/))) {
					const [, name] = match

					console.log({ name, locals })
					continue
				}

				if (value.match(/^(export )?(declare )?function /)) {
					continue
				}

				throw new Error(`Couldn't parse value in ${this.filepath}: ${value}`)
			}
		}

		return this._exports
	}
}
