import Artwork from "Artwork";
import Controls from "Controls";
import Progress from "Progress";
import StatusHeader from "StatusHeader";
import TrackInfo from "TrackInfo";
import Volume from "Volume";
import { Layout } from "assets";

const MusicPlayer = Container.template(($) => ({
	contents: [
		StatusHeader($, { anchor: "STATUS_HEADER", ...Layout.statusHeader }),
		Artwork($, { anchor: "ARTWORK", ...Layout.artwork }),
		TrackInfo($, { anchor: "TRACK", ...Layout.track }),
		Progress($, { anchor: "PROGRESS", ...Layout.progress }),
		Controls($, { anchor: "CONTROLS", ...Layout.controls }),
		Volume($, { anchor: "VOLUME", ...Layout.volume }),
	],
}));

export default MusicPlayer;
