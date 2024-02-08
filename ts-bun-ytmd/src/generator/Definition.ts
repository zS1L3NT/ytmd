import fs from "fs"
import path from "path"

import Storage from "./Storage"
import Type, { TypeID } from "./Type"

export default class Definition {
	private readonly content: string
	readonly aliases: Map<string, TypeID> = new Map()
	private _imports: Map<TypeID, Type> | null = null
	private _exports: Map<TypeID, Type> | null = null

	constructor(readonly filepath: string) {
		if (!fs.existsSync(filepath)) throw new Error(`File doesn't exist: ${filepath}`)
		this.content = fs
			.readFileSync(this.filepath, "utf-8")
			.replaceAll(/\/\*\*(?:.|\n)*?\*\//g, "")
	}

	type(name: string): Type | null {
		if (this.aliases.has(name)) {
			name = this.aliases.get(name)!
		}

		const types = [...this.imports.values(), ...this.exports.values()]
		return types.find(t => t.name === name) ?? null
	}

	private getDefinitionTypeReference(filepath: string, name: string): Type {
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
			this._imports = new Map<TypeID, Type>()

			let chunk = ""
			const values: string[] = []
			for (const line of this.content.split("\n")) {
				if (!line.startsWith("import")) continue
				if (line.match(/^\w+ /)) {
					if (chunk) values.push(chunk)
					chunk = line
				} else {
					chunk += line
				}
			}
			if (chunk) values.push(chunk)

			for (const value of values) {
				let match: RegExpMatchArray | null = null
				if ((match = value.match(/^import (?:type )?(.*) from '(.*)';$/))) {
					const [, values, from] = match
					const filepath = path.join(this.filepath, "..", from!).replace(/\.js$/, ".d.ts")

					if (values!.match(/{ .* }/)) {
						for (const nameWithAlias of values!
							.replace(/{ | }|type /g, "")
							.split(", ")) {
							const [name, , alias] = nameWithAlias.split(" ")
							const type = this.getDefinitionTypeReference(filepath, name!)

							if (alias) this.aliases.set(alias, type.id)
							this._imports.set(type.id, type)
						}
					} else {
						const type = this.getDefinitionTypeReference(filepath, "default")

						this.aliases.set(values!, type.id)
						this._imports.set(type.id, type)
					}

					continue
				}

				throw new Error(`Couldn't parse import in ${this.filepath}: ${value}`)
			}
		}

		return this._imports
	}

	get exports() {
		if (!this._exports) {
			this._exports = new Map<TypeID, Type>()
			const locals = new Map<TypeID, Type>()

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
			if (chunk) values.push(chunk)

			for (const value of values) {
				let match: RegExpMatchArray | null = null
				if ((match = value.match(/^export (?:type )?(.*) from '(.*)';$/))) {
					const [, values, from] = match

					const filepath = path.join(this.filepath, "..", from!).replace(/\.js$/, ".d.ts")
					const definition = Storage.instance.definition(filepath)

					if (values === "*") {
						for (const [id, type] of definition.exports) {
							this._exports.set(id, type)
						}
						continue
					}

					if (values!.match(/^\* as \w+$/)) {
						continue
					}

					for (const nameWithAlias of values!.replaceAll(/{ | }/g, "").split(", ")) {
						const [name, , alias] = nameWithAlias.split(" ")
						const type = this.getDefinitionTypeReference(filepath, name!)

						if (alias) this.aliases.set(alias, type.id)
						this._exports.set(type.id, type)
					}

					continue
				}

				// prettier-ignore
				if ((match = value.match(/^(export )?(?:declare )?(default )?(type|interface|enum|class|function|const) (\w+)(.*)$/))) {
					const [, _export, _default, variant, name, content] = match
					const type = new Type(
						this.filepath,
						name!,
						!!_default,
						`${variant} ${name}${content}`,
					)
					if (_export) {
						this._exports.set(type.id, type)
					} else {
						locals.set(type.id, type)
					}
					continue
				}

				if ((match = value.match(/^export default (\w+);$/))) {
					const [, name] = match
					const type = [...locals.values()].find(l => l.name === name)
					if (!type) {
						throw new Error(
							`Couldn't find default exported value "${name}" in ${this.filepath}`,
						)
					}

					this._exports.set(
						type.id,
						new Type(type.filepath, type.name, true, type.content),
					)
					continue
				}

				if ((match = value.match(/^export {};$/))) {
					continue
				}

				throw new Error(`Couldn't parse export in ${this.filepath}: ${value}`)
			}
		}

		return this._exports
	}
}
