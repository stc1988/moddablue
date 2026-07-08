import { Styles } from "assets";

const TrackInfo = Column.template(($) => ({
	contents: [
		Label($, { anchor: "TITLE", left: 0, right: 0, height: 24, style: Styles.title }),
		Label($, { anchor: "ARTIST", left: 0, right: 0, height: 18, style: Styles.mutedCenter }),
	],
	Behavior: class extends Behavior {
		onCreate(_column, anchors) {
			this.anchors = anchors;
		}
		onModelChanged(_column, model) {
			const anchors = this.anchors;
			anchors.TITLE.string = model.track.title;
			anchors.ARTIST.string = model.track.artist;
		}
	},
}));

export default TrackInfo;
