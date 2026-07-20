import { type ConnectionState, type HIDMediaControlService, USAGE } from "HIDMediaControlService";
import HIDMediaControlServiceProvider from "HIDMediaControlServiceProvider";
import type * as MC from "piu/MC";
import "piu/MC";

const Colors = Object.freeze({
	background: "#0a0c10",
	panel: "#15181d",
	panelPressed: "#174b83",
	rail: "#30353c",
	text: "#f7f9fc",
	muted: "#929ba7",
	pairing: "#f59e0b",
	securing: "#38bdf8",
	connected: "#22c55e",
});

const Textures = Object.freeze({
	controlCircle: new Texture("control-circle-mask.png"),
	next: new Texture("next-mask.png"),
	pause: new Texture("pause-mask.png"),
	play: new Texture("play-mask.png"),
	previous: new Texture("previous-mask.png"),
	volume: new Texture("volume-small-mask.png"),
});

const BackgroundSkin = new Skin({ fill: Colors.background });
const RailSkin = new Skin({ fill: Colors.rail });
const ControlSkin = new Skin({
	texture: Textures.controlCircle,
	width: 52,
	height: 52,
	color: [Colors.panel, Colors.panelPressed],
});
const IconSkins = Object.freeze({
	next: new Skin({ texture: Textures.next, width: 32, height: 32, color: Colors.text }),
	play: new Skin({ texture: Textures.play, width: 32, height: 32, color: Colors.text }),
	previous: new Skin({ texture: Textures.previous, width: 32, height: 32, color: Colors.text }),
	volume: new Skin({ texture: Textures.volume, width: 20, height: 20, color: Colors.text }),
});
const StatusDotSkin = new Skin({
	fill: [Colors.pairing, Colors.securing, Colors.connected],
});
const SymbolSkin = new Skin({ fill: Colors.text });

const TitleStyle = new Style({
	color: Colors.text,
	font: "semibold 16px Open Sans",
	horizontal: "left",
	vertical: "middle",
});
const StatusStyle = new Style({
	color: [Colors.pairing, Colors.securing, Colors.connected],
	font: "semibold 16px Open Sans",
	horizontal: "right",
	vertical: "middle",
});

type AppData = {
	server: HIDMediaControlService;
	STATUS_DOT?: MC.Content;
	STATUS_LABEL?: MC.Label;
};

type ControlButtonData = {
	usage: number;
};

class ControlButtonBehavior extends Behavior {
	#usage = 0;

	onCreate(_button: MC.Container, data: ControlButtonData) {
		this.#usage = data.usage;
	}

	onTouchBegan(button: MC.Container, id: number, x: number, y: number, ticks: number) {
		button.captureTouch(id as unknown as string, x, y, ticks);
		button.state = 1;
	}

	onTouchMoved(button: MC.Container, _id: number, x: number, y: number) {
		button.state = button.hit(x, y) ? 1 : 0;
	}

	onTouchEnded(button: MC.Container, _id: number, x: number, y: number) {
		const accepted = button.hit(x, y);
		button.state = 0;
		if (accepted) {
			button.bubble("onControlTapped", this.#usage);
		}
	}

	onTouchCancelled(button: MC.Container) {
		button.state = 0;
	}
}

class MediaControlAppBehavior extends Behavior {
	declare data: AppData;
	#state: ConnectionState = {
		connected: false,
		connectionCount: 0,
		subscribed: false,
		subscribedReportCount: 0,
	};

	onCreate(_application: MC.Application, data: AppData) {
		this.data = data;
	}

	onDisplaying(application: MC.Application) {
		if (application.width !== 320 || application.height !== 240) {
			trace("[hid-media-control] this UI is designed for a 320x240 display\n");
		}
	}

	onControlTapped(_application: MC.Application, usage: number) {
		this.data.server.notifyUsage(usage);
	}

	onBLEStateChanged(application: MC.Application, state: ConnectionState) {
		this.#state = state;
		this.#renderState(application);
	}

	onQuit(_application: MC.Application) {
		this.data.server.close();
	}

	#renderState(_application: MC.Application) {
		const dot = this.data.STATUS_DOT;
		const label = this.data.STATUS_LABEL;
		if (!dot || !label) return;

		if (this.#state.subscribed) {
			dot.state = 2;
			label.state = 2;
			label.string = "CONNECTED";
		} else if (this.#state.connected) {
			dot.state = 1;
			label.state = 1;
			label.string = "SECURING";
		} else {
			dot.state = 0;
			label.state = 0;
			label.string = "PAIRING";
		}
	}
}

const Icon = (skin: MC.Skin, left: number, top: number, width: number, height: number) =>
	new Content(null, { left, top, width, height, skin });

const PreviousButton = Container.template((_$: ControlButtonData) => ({
	active: true,
	left: 43,
	top: 105,
	width: 52,
	height: 52,
	skin: ControlSkin,
	Behavior: ControlButtonBehavior,
	contents: [Icon(IconSkins.previous, 10, 10, 32, 32)],
}));

const NextButton = Container.template((_$: ControlButtonData) => ({
	active: true,
	left: 225,
	top: 105,
	width: 52,
	height: 52,
	skin: ControlSkin,
	Behavior: ControlButtonBehavior,
	contents: [Icon(IconSkins.next, 10, 10, 32, 32)],
}));

const VolumeDownButton = Container.template(($: ControlButtonData) => ({
	active: true,
	left: 134,
	top: 173,
	width: 52,
	height: 52,
	skin: ControlSkin,
	Behavior: ControlButtonBehavior,
	contents: [
		Icon(IconSkins.volume, 10, 16, 20, 20),
		Content($, { left: 31, top: 25, width: 10, height: 3, skin: SymbolSkin }),
	],
}));

const VolumeUpButton = Container.template(($: ControlButtonData) => ({
	active: true,
	left: 134,
	top: 37,
	width: 52,
	height: 52,
	skin: ControlSkin,
	Behavior: ControlButtonBehavior,
	contents: [
		Icon(IconSkins.volume, 9, 16, 20, 20),
		Content($, { left: 30, top: 25, width: 11, height: 3, skin: SymbolSkin }),
		Content($, { left: 34, top: 21, width: 3, height: 11, skin: SymbolSkin }),
	],
}));

const PlayPauseButton = Container.template(($: ControlButtonData) => ({
	active: true,
	left: 134,
	top: 105,
	width: 52,
	height: 52,
	skin: ControlSkin,
	Behavior: ControlButtonBehavior,
	contents: [
		Icon(IconSkins.play, 3, 10, 32, 32),
		Content($, { left: 34, top: 13, width: 4, height: 26, skin: SymbolSkin }),
		Content($, { left: 43, top: 13, width: 4, height: 26, skin: SymbolSkin }),
	],
}));

const MediaControlView = Container.template(($: AppData) => ({
	left: 0,
	right: 0,
	top: 0,
	bottom: 0,
	skin: BackgroundSkin,
	contents: [
		Label($, {
			left: 14,
			top: 0,
			width: 150,
			height: 31,
			style: TitleStyle,
			string: "MEDIA REMOTE",
		}),
		Content($, {
			anchor: "STATUS_DOT",
			right: 130,
			top: 11,
			width: 8,
			height: 8,
			skin: StatusDotSkin,
		}),
		Label($, {
			anchor: "STATUS_LABEL",
			right: 12,
			top: 0,
			width: 112,
			height: 31,
			style: StatusStyle,
			string: "PAIRING",
		}),
		Content($, { left: 158, top: 89, width: 4, height: 16, skin: RailSkin }),
		Content($, { left: 158, top: 157, width: 4, height: 16, skin: RailSkin }),
		Content($, { left: 95, top: 129, width: 39, height: 4, skin: RailSkin }),
		Content($, { left: 186, top: 129, width: 39, height: 4, skin: RailSkin }),
		PreviousButton({
			usage: USAGE.SCAN_PREVIOUS_TRACK,
		}),
		NextButton({
			usage: USAGE.SCAN_NEXT_TRACK,
		}),
		VolumeDownButton({
			usage: USAGE.VOLUME_DOWN,
		}),
		VolumeUpButton({
			usage: USAGE.VOLUME_UP,
		}),
		PlayPauseButton({
			usage: USAGE.PLAY_PAUSE,
		}),
	],
}));

const MediaControlApp = Application.template(($: AppData) => ({
	skin: BackgroundSkin,
	Behavior: MediaControlAppBehavior,
	contents: [MediaControlView($)],
}));

export default function () {
	const server: HIDMediaControlService = new HIDMediaControlServiceProvider({
		deviceName: "Moddablue Remote",
	});
	const data: AppData = { server };
	const app = new MediaControlApp(data, {
		commandListLength: 3072,
		displayListLength: 4096,
		touchCount: 1,
	});

	server.onConnectionChanged = (state) => {
		app.distribute("onBLEStateChanged", state);
	};
	server.onNotifyError = (error) => {
		trace(`[hid-media-control] notify failed: ${error.message}\n`);
	};
	app.distribute("onBLEStateChanged", server.getConnectionState());
	return app;
}
