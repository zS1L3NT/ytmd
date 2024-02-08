import path from "path"

import Storage from "./generator/Storage"

const storage = new Storage()
Storage.instance = storage
Storage.base = path.join(import.meta.dir, "../youtubei.js/dist/src/")

const files = [
	"Innertube.d.ts",
	"core/Session.d.ts",
	"types/PlatformShim.d.ts",
	"parser/index.d.ts",
]
for (const file of files) {
	const definition = storage.definition(path.join(Storage.base, file))
	for (const [, type] of definition.exports) {
		console.log(`${"-".repeat(50)}START${"-".repeat(50)}`)
		console.log("FINAL", JSON.stringify(type.parse(definition), null, 2))
		console.log(`${"-".repeat(50)} END ${"-".repeat(50)}`)
	}
}
