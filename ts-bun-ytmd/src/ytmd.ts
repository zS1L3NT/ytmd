import { Innertube } from "youtubei.js"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"

const args = await yargs(hideBin(Bun.argv)).argv
const directory = process.execPath.replace(/\/ytmd$/, "")
const iframefile = Bun.file(`${directory}/iframe.js`)
const playerfile = Bun.file(`${directory}/player.js`)

console.time("YouTube Music API Initialization")
let init = true
let iframejs = (await iframefile.exists()) ? await iframefile.text() : ""
let playerjs = (await playerfile.exists()) ? await playerfile.text() : ""
const api = await Innertube.create({
	cookie: "cookie" in args ? (args.cookie as string) : undefined,
	fetch: async (url, options) => {
		if (!init) return fetch(url, options)
		if (!(url instanceof URL)) throw new Error("URL must be an instance of the URL class")
		if (url.pathname == "/iframe_api") {
			if (!iframejs) {
				iframejs = await fetch(url).then(res => res.text())
				await Bun.write(iframefile, iframejs)
			}
			return new Response(iframejs)
		} else if (url.pathname.startsWith("/s/player/")) {
			if (!playerjs) {
				playerjs = await fetch(url, options).then(res => res.text())
				await Bun.write(playerfile, playerjs)
			}
			return new Response(playerjs)
		} else {
			throw new Error(`Unknown URL path: ${url.pathname}`)
		}
	},
})
init = false
console.timeEnd("YouTube Music API Initialization")

console.time(`YouTube Music API Call`)
console.log(JSON.stringify(await eval(args._[0] as string)))
console.timeEnd(`YouTube Music API Call`)
