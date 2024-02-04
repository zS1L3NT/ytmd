import path from "path"

import Definition from "./generator/Definition"
import Storage from "./generator/Storage"

const storage = new Storage()

const definition = new Definition(
	path.join(import.meta.dir, "../youtubei.js/dist/src/Innertube.d.ts"),
)

for (const _import of definition.getImports().values()) {
	storage.register(_import)
}

storage.__dump()

// for (const type of ["InnertubeConfig", "InnerTubeClient", "SearchFilters", "Innertube"]) {
// 	read("./Innertube.d.ts", type)
// }

// read("./Innertube.d.ts", "Innertube")
// read("./parser/youtube/index.d.ts", "VideoInfo")
// read("./parser/youtube/index.d.ts", "VideoInfo")
// read("./parser/youtube/index.d.ts", "Search")
// read("./parser/youtube/index.d.ts", "Comments")
// read("./parser/youtube/index.d.ts", "HomeFeed")
// read("./parser/youtube/index.d.ts", "Guide")
// read("./parser/youtube/index.d.ts", "Library")
// read("./parser/youtube/index.d.ts", "History")
// read("./core/mixins/index.d.ts", "TabbedFeed")
// read("./parser/types/index.d.ts", "IBrowseResponse")
// read("./parser/youtube/index.d.ts", "Channel")
// read("./parser/youtube/index.d.ts", "NotificationsMenu")
// read("./parser/youtube/index.d.ts", "Playlist")
// read("./parser/youtube/index.d.ts", "HashtagFeed")
// read("./parser/classes/misc/Format.d.ts", "Format")
