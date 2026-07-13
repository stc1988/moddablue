import { log } from "Logger";
import { Layout, Skins } from "assets";
import loadJPEG from "commodetto/loadJPEG";
import { ImageBuffer } from "piu/ImageBuffer";

const ARTWORK_WIDTH = Layout.artwork.width;
const ARTWORK_HEIGHT = Layout.artwork.height;

class ArtworkImageBehavior extends Behavior {
	onCreate(image) {
		this.key = null;
		image.visible = false;
	}
	onModelChanged(image, model) {
		const artwork = model.artwork;
		if (artwork?.state !== "loaded" || !artwork.data) {
			this.key = null;
			image.visible = false;
			return;
		}
		if (this.key === artwork.key) return;
		this.key = artwork.key;
		try {
			const bitmap = loadJPEG(artwork.data);
			image.buffer = bitmap.buffer;
			image.visible = true;
			log("artwork", "decoded", `${artwork.key} ${bitmap.width}x${bitmap.height}`);
		} catch (error) {
			image.visible = false;
			log("artwork", "decode failed", error);
		}
	}
}

const Artwork = Container.template(($) => ({
	skin: Skins.artwork,
	contents: [
		ImageBuffer($, {
			anchor: "ARTWORK_IMAGE",
			left: 0,
			top: 0,
			width: ARTWORK_WIDTH,
			height: ARTWORK_HEIGHT,
			imageWidth: ARTWORK_WIDTH,
			imageHeight: ARTWORK_HEIGHT,
			Behavior: ArtworkImageBehavior,
		}),
		Content($, {
			anchor: "PLACEHOLDER",
			left: (ARTWORK_WIDTH - 20) >> 1,
			top: (ARTWORK_HEIGHT - 20) >> 1,
			width: 20,
			height: 20,
			skin: Skins.musicNoteIcon,
		}),
	],
	Behavior: class extends Behavior {
		onCreate(_container, anchors) {
			this.anchors = anchors;
		}
		onModelChanged(_container, model) {
			const loaded = model.artwork?.state === "loaded" && model.artwork.data;
			this.anchors.PLACEHOLDER.visible = !loaded;
		}
	},
}));

export default Artwork;
