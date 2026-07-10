import Background from "Background";
import MusicPlayer from "MusicPlayer";
import { Layout, Skins } from "assets";

const MediaPlayerApplication = Application.template(($) => ({
	skin: Skins.app,
	contents: [
		Background($, {
			left: 0,
			top: 0,
			width: screen.width,
			height: screen.height,
		}),
		MusicPlayer($, {
			left: Math.max(0, (screen.width - Layout.width) >> 1),
			top: Math.max(0, (screen.height - Layout.height) >> 1),
			width: Layout.width,
			height: Layout.height,
		}),
	],
}));

export default MediaPlayerApplication;
