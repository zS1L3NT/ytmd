import { Innertube } from "youtubei.js"

const directory = process.execPath.replace(/\/ytmd$/, "")
const iframefile = Bun.file(`${directory}/iframe.js`)
const playerfile = Bun.file(`${directory}/player.js`)

console.time("YouTube Music API: Initialization")
let init = true
let iframejs = (await iframefile.exists()) ? await iframefile.text() : ""
let playerjs = (await playerfile.exists()) ? await playerfile.text() : ""
const api = await Innertube.create({
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
console.timeEnd("YouTube Music API: Initialization")

console.time(`YouTube Music API: ${Bun.argv[2]}`)
console.log(JSON.stringify(await eval(Bun.argv[2] || "")))
console.timeEnd(`YouTube Music API: ${Bun.argv[2]}`)
