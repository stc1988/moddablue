import Artwork from "Artwork";
import Controls from "Controls";
import Progress from "Progress";
import TrackInfo from "TrackInfo";
import Volume from "Volume";
import { Layout } from "assets";

const MusicPlayer = Container.template(($) => ({
	contents: [
		Artwork($, { anchor: "ARTWORK", ...Layout.artwork }),
		TrackInfo($, { anchor: "TRACK", ...Layout.track }),
		Progress($, { anchor: "PROGRESS", ...Layout.progress }),
		Controls($, { anchor: "CONTROLS", ...Layout.controls }),
		Volume($, { anchor: "VOLUME", ...Layout.volume }),
	],
	Behavior: class extends Behavior {
		onCreate(_container, anchors) {
			this.anchors = anchors;
		}
		onModelChanged(_container, model) {
			const anchors = this.anchors;
			anchors.ARTWORK.delegate("onModelChanged", model);
			anchors.TRACK.delegate("onModelChanged", model);
			anchors.PROGRESS.delegate("onModelChanged", model);
			anchors.CONTROLS.delegate("onModelChanged", model);
			anchors.VOLUME.delegate("onModelChanged", model);
		}
	},
}));

export default MusicPlayer;
