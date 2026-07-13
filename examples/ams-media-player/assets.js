const Colors = Object.freeze({
	background: "black",
	panel: "#101418",
	panelAlt: "#20242c",
	text: "#f4f7fb",
	muted: "#a7b0ba",
	accent: "#78d957",
	accentSoft: "#a6f07f",
	border: "#343a43",
	sliderInactive: "#a7b0ba",
	transparent: "transparent",
	white: "white",
	controlText: "black",
	warning: "#f2c94c",
});

const Textures = Object.freeze({
	play: new Texture("play-mask.png"),
	pause: new Texture("pause-mask.png"),
	next: new Texture("next-mask.png"),
	previous: new Texture("previous-mask.png"),
	volumeSmall: new Texture("volume-small-mask.png"),
	muteSmall: new Texture("mute-small-mask.png"),
	musicNoteSmall: new Texture("music-note-small-mask.png"),
	deviceSmall: new Texture("device-small-mask.png"),
	controlCircle: new Texture("control-circle-mask.png"),
	knob: new Texture("knob-mask.png"),
	knobLarge: new Texture("knob-large-mask.png"),
	knobSmall: new Texture("knob-small-mask.png"),
	backgroundGradient: new Texture("background-gradient-mask.png"),
	statusIcons: new Texture("status-icons-mask.png"),
});

const iconSkin = (texture, color = Colors.text, size = 32) =>
	new Skin({
		texture,
		width: size,
		height: size,
		color,
	});

const Skins = Object.freeze({
	app: new Skin({ fill: Colors.background }),
	panel: new Skin({ fill: Colors.panel }),
	panelAlt: new Skin({ fill: Colors.panelAlt }),
	statusHeader: new Skin({ fill: Colors.transparent }),
	statusIcon: new Skin({
		texture: Textures.statusIcons,
		width: 16,
		height: 16,
		states: 16,
		variants: 16,
		color: Colors.white,
	}),
	progressTrack: new Skin({ fill: Colors.border }),
	sliderFillActive: new Skin({ fill: Colors.white }),
	sliderFillInactive: new Skin({ fill: Colors.sliderInactive }),
	touchArea: new Skin({ fill: Colors.transparent }),
	control: new Skin({
		texture: Textures.controlCircle,
		width: 52,
		height: 52,
		color: [Colors.transparent, Colors.accent],
	}),
	artwork: new Skin({ fill: Colors.panelAlt }),
	backgroundGradient: new Skin({
		texture: Textures.backgroundGradient,
		width: 240,
		height: 320,
		color: Colors.background,
	}),
	knobActive: iconSkin(Textures.knobLarge, Colors.white, 16),
	knobInactive: iconSkin(Textures.knob, Colors.sliderInactive, 10),
	knobSmallActive: iconSkin(Textures.knobLarge, Colors.white, 14),
	knobSmallInactive: iconSkin(Textures.knobSmall, Colors.sliderInactive, 8),

	deviceIcon: iconSkin(Textures.deviceSmall, Colors.accent, 16),
	musicNoteIcon: iconSkin(Textures.musicNoteSmall, Colors.muted, 20),
	muteIcon: iconSkin(Textures.muteSmall, Colors.muted, 20),
	nextIcon: iconSkin(Textures.next),
	pauseIcon: iconSkin(Textures.pause),
	playIcon: iconSkin(Textures.play),
	previousIcon: iconSkin(Textures.previous),
	volumeIcon: iconSkin(Textures.volumeSmall, Colors.muted, 20),
});

const Styles = Object.freeze({
	title: new Style({
		font: "semibold 18px M PLUS 1",
		color: Colors.text,
		horizontal: "center",
		vertical: "middle",
	}),
	body: new Style({
		font: "medium 16px M PLUS 1",
		color: Colors.text,
		horizontal: "center",
		vertical: "middle",
	}),
	bodyCenter: new Style({
		font: "medium 16px M PLUS 1",
		color: Colors.text,
		horizontal: "center",
		vertical: "middle",
	}),
	muted: new Style({
		font: "medium 16px M PLUS 1",
		color: Colors.muted,
		horizontal: "center",
		vertical: "middle",
	}),
	mutedCenter: new Style({
		font: "medium 16px M PLUS 1",
		color: Colors.muted,
		horizontal: "center",
		vertical: "middle",
	}),
	button: new Style({
		font: "medium 16px M PLUS 1",
		color: Colors.text,
		horizontal: "center",
		vertical: "middle",
	}),
	primaryButton: new Style({
		font: "semibold 18px M PLUS 1",
		color: Colors.controlText,
		horizontal: "center",
		vertical: "middle",
	}),
	time: new Style({
		font: "medium 16px M PLUS 1",
		color: Colors.text,
		horizontal: "center",
		vertical: "middle",
	}),
	deviceName: new Style({
		font: "medium 16px M PLUS 1",
		color: Colors.text,
		horizontal: "left",
		vertical: "middle",
	}),
	deviceStatus: new Style({
		font: "medium 16px M PLUS 1",
		color: Colors.accent,
		horizontal: "left",
		vertical: "middle",
	}),
});

const Layout = Object.freeze({
	width: 240,
	height: 320,
	margin: 12,
	statusHeader: { left: 0, top: 0, width: 240, height: 22 },
	statusIconSize: 16,
	artwork: { left: 56, top: 14, width: 128, height: 128 },
	track: { left: 12, top: 148, width: 216, height: 40 },
	progress: { left: 12, top: 190, width: 216, height: 22 },
	controls: { left: 22, top: 217, width: 196, height: 54 },
	volume: { left: 18, top: 274, width: 204, height: 18 },
	device: { left: 12, top: 292, width: 216, height: 16 },
});

const assets = Object.freeze({
	colors: Colors,
	layout: Layout,
	skins: Skins,
	styles: Styles,
	textures: Textures,
});

export { Colors, Layout, Skins, Styles, Textures };
export default assets;
