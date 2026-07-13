import { log } from "Logger";
import extractThemeColorsFromBitmap from "ThemeColorExtractor";
import { Skins } from "assets";
import loadJPEG from "commodetto/loadJPEG";

const FALLBACK_TOP = "#101418";
const MIN_TOP_LUMA = 82;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const toHex = (component) => clamp(component, 0, 255).toString(16).padStart(2, "0");

const rgbToHex = ({ r, g, b }) => `#${toHex(r)}${toHex(g)}${toHex(b)}`;

const luma = ({ r, g, b }) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function brightenForBackground(color, minimumLuma) {
	const current = luma(color);
	if (current >= minimumLuma) return color;

	const scale = minimumLuma / Math.max(1, current);
	return {
		r: Math.round(clamp(color.r * scale, 0, 255)),
		g: Math.round(clamp(color.g * scale, 0, 255)),
		b: Math.round(clamp(color.b * scale, 0, 255)),
	};
}

function extractBackgroundColor(data) {
	const bitmap = loadJPEG(data);
	const colors = extractThemeColorsFromBitmap(bitmap);
	if (!colors) return undefined;
	const color = new Uint8Array(colors);
	return { r: color[0], g: color[1], b: color[2] };
}

const Background = Container.template(($) => ({
	skin: new Skin({ fill: FALLBACK_TOP }),
	contents: [Content($, { left: 0, right: 0, top: 0, bottom: 0, skin: Skins.backgroundGradient })],
	Behavior: class extends Behavior {
		onCreate(_container) {
			this.key = null;
			this.color = FALLBACK_TOP;
		}
		onModelChanged(container, model) {
			const artwork = model.artwork;
			if (artwork?.state !== "loaded" || !artwork.data) {
				if (this.key === null) return;
				this.key = null;
				this.color = FALLBACK_TOP;
				container.skin = new Skin({ fill: this.color });
				return;
			}
			if (this.key === artwork.key) return;
			this.key = artwork.key;
			try {
				const started = Date.now();
				const color = extractBackgroundColor(artwork.data);
				if (color) {
					const raw = rgbToHex(color);
					this.color = rgbToHex(brightenForBackground(color, MIN_TOP_LUMA));
					log("theme", "color extracted", `${artwork.key} raw=${raw} color=${this.color} ms=${Date.now() - started}`);
					container.skin = new Skin({ fill: this.color });
				} else {
					log("theme", "colors unavailable", `${artwork.key} ms=${Date.now() - started}`);
				}
			} catch (error) {
				log("theme", "color extraction failed", `${artwork.key} error=${error}`);
				this.color = FALLBACK_TOP;
				container.skin = new Skin({ fill: this.color });
			}
		}
	},
}));

export default Background;
