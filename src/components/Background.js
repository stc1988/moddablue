import { log } from "Logger";
import extractThemeColorsFromBitmap from "ThemeColorExtractor";
import { Colors } from "assets";
import loadJPEG from "commodetto/loadJPEG";

const FALLBACK_TOP = "#101418";
const FALLBACK_BOTTOM = Colors.background;
const GRADIENT_BAND_HEIGHT = 8;
const MIN_TOP_LUMA = 82;
const MIN_BOTTOM_LUMA = 44;

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

const interpolateColor = (from, to, position) =>
	rgbToHex({
		r: Math.round(from.r + (to.r - from.r) * position),
		g: Math.round(from.g + (to.g - from.g) * position),
		b: Math.round(from.b + (to.b - from.b) * position),
	});

function extractBackgroundPalette(data) {
	const bitmap = loadJPEG(data);
	const colors = extractThemeColorsFromBitmap(bitmap);
	if (!colors) return undefined;
	const palette = new Uint8Array(colors);
	return {
		top: { r: palette[0], g: palette[1], b: palette[2] },
		bottom: { r: palette[3], g: palette[4], b: palette[5] },
	};
}

const Background = Port.template((_$) => ({
	Behavior: class extends Behavior {
		onCreate() {
			this.key = null;
			this.top = FALLBACK_TOP;
			this.bottom = FALLBACK_BOTTOM;
		}
		onModelChanged(port, model) {
			const artwork = model.artwork;
			if (artwork?.state !== "loaded" || !artwork.data) {
				if (this.key === null) return;
				this.key = null;
				this.top = FALLBACK_TOP;
				this.bottom = FALLBACK_BOTTOM;
				port.invalidate();
				return;
			}
			if (this.key === artwork.key) return;
			this.key = artwork.key;
			try {
				const started = Date.now();
				const palette = extractBackgroundPalette(artwork.data);
				if (palette) {
					const rawTop = rgbToHex(palette.top);
					const rawBottom = rgbToHex(palette.bottom);
					this.top = rgbToHex(brightenForBackground(palette.top, MIN_TOP_LUMA));
					this.bottom = rgbToHex(brightenForBackground(palette.bottom, MIN_BOTTOM_LUMA));
					log(
						"theme",
						"colors extracted",
						`${artwork.key} rawTop=${rawTop} rawBottom=${rawBottom} top=${this.top} bottom=${this.bottom} ms=${
							Date.now() - started
						}`,
					);
					port.invalidate();
				} else {
					log("theme", "colors unavailable", `${artwork.key} ms=${Date.now() - started}`);
				}
			} catch (error) {
				log("theme", "color extraction failed", `${artwork.key} error=${error}`);
				this.top = FALLBACK_TOP;
				this.bottom = FALLBACK_BOTTOM;
				port.invalidate();
			}
		}
		onDraw(port) {
			const top = {
				r: Number.parseInt(this.top.slice(1, 3), 16),
				g: Number.parseInt(this.top.slice(3, 5), 16),
				b: Number.parseInt(this.top.slice(5, 7), 16),
			};
			const bottom = {
				r: Number.parseInt(this.bottom.slice(1, 3), 16),
				g: Number.parseInt(this.bottom.slice(3, 5), 16),
				b: Number.parseInt(this.bottom.slice(5, 7), 16),
			};
			const last = Math.max(1, port.height - 1);
			for (let y = 0; y < port.height; y += GRADIENT_BAND_HEIGHT) {
				port.fillColor(
					interpolateColor(top, bottom, y / last),
					0,
					y,
					port.width,
					Math.min(GRADIENT_BAND_HEIGHT, port.height - y),
				);
			}
		}
	},
}));

export default Background;
