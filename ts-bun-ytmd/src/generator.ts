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
		console.log("FINAL", type.parse(definition))
		console.log(`${"-".repeat(50)} END ${"-".repeat(50)}`)
	}
}

// const definition = storage.definition(path.join(Storage.base, "Innertube.d.ts"))
// console.log({
// 	type: definition.type("VideoInfo").parse(definition),
// })
