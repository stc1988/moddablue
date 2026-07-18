/// <reference path="./moddable-extensions.d.ts" />

import { type ConnectionState, type HIDKeyboardService, INDICATOR } from "HIDKeyboardService";
import HIDKeyboardServiceProvider from "HIDKeyboardServiceProvider";
import { Keyboard } from "keyboard";
import type * as MC from "piu/MC";
import "piu/MC";

const BackgroundSkin = new Skin({ fill: "#f8fafc" });
const HeaderSkin = new Skin({ fill: "#0f172a" });
const StatusDotSkin = new Skin({
	fill: ["#f59e0b", "#38bdf8", "#22c55e"],
});

const HeaderStyle = new Style({
	color: "#ffffff",
	font: "semibold 18px Open Sans",
	horizontal: "left",
	vertical: "middle",
});
const StatusStyle = new Style({
	color: ["#fbbf24", "#7dd3fc", "#86efac"],
	font: "semibold 16px Open Sans",
	horizontal: "left",
	vertical: "middle",
});
const FeedbackStyle = new Style({
	color: ["#64748b", "#16a34a", "#dc2626"],
	font: "16px Open Sans",
	horizontal: "center",
	vertical: "middle",
});
const KeyboardStyle = new Style({
	color: "#000000",
	font: "18px Roboto",
});

type AppData = {
	server: HIDKeyboardService;
	FEEDBACK?: MC.Label;
	KEYBOARD?: MC.Port;
	STATUS_DOT?: MC.Content;
	STATUS_LABEL?: MC.Label;
};

type KeyboardBehaviorState = MC.Behavior & {
	SYMBOL?: string[];
	state?: string[];
};

function keyName(key: string): string {
	switch (key) {
		case "\b":
			return "Backspace";
		case "\r":
			return "Enter";
		case " ":
			return "Space";
		default:
			return key;
	}
}

class KeyboardAppBehavior extends Behavior {
	declare data: AppData;
	#awaitingPasskey = false;
	#passkey = "";

	onCreate(_application: MC.Application, data: AppData) {
		this.data = data;
	}

	onDisplaying(application: MC.Application) {
		if (application.width !== 320 || application.height !== 240) {
			trace("[hid-keyboard] this UI is designed for a 320x240 display\n");
		}
	}

	onKeyUp(_application: MC.Application, key: string) {
		const feedback = this.data.FEEDBACK;
		if (!feedback) return;
		if (this.#awaitingPasskey) {
			if (key === "\b") {
				this.#passkey = this.#passkey.slice(0, -1);
			} else if (key === "\r") {
				if (this.#passkey.length !== 6) {
					feedback.state = 2;
					feedback.string = "Enter all 6 digits";
					return;
				}
				const submitted = this.data.server.submitPasskey(Number(this.#passkey));
				feedback.state = submitted ? 0 : 2;
				feedback.string = submitted ? "Authenticating..." : "Pairing code expired";
				if (submitted) this.#awaitingPasskey = false;
				return;
			} else if (key >= "0" && key <= "9" && this.#passkey.length < 6) {
				this.#passkey += key;
			} else {
				feedback.state = 2;
				feedback.string = "Use digits, then tap OK";
				return;
			}
			feedback.state = 0;
			feedback.string = `Pair code: ${this.#passkey.padEnd(6, "•")}`;
			return;
		}
		const sent = this.data.server.notifyCharacter(key);
		feedback.state = sent ? 1 : 2;
		feedback.string = sent ? `Sent: ${keyName(key)}` : "Pair with a host before typing";
	}

	onBLEStateChanged(_application: MC.Application, state: ConnectionState) {
		const dot = this.data.STATUS_DOT;
		const label = this.data.STATUS_LABEL;
		const feedback = this.data.FEEDBACK;
		if (!dot || !label || !feedback) return;

		if (state.subscribed) {
			this.#awaitingPasskey = false;
			this.#passkey = "";
			dot.state = 2;
			label.state = 2;
			label.string = "CONNECTED";
			feedback.state = 0;
			feedback.string = "Tap a key to send";
		} else if (state.connected) {
			dot.state = 1;
			label.state = 1;
			label.string = "SECURING";
			feedback.state = 0;
			feedback.string = "Waiting for keyboard subscription";
		} else {
			this.#awaitingPasskey = false;
			this.#passkey = "";
			dot.state = 0;
			label.state = 0;
			label.string = "PAIRING";
			feedback.state = 0;
			feedback.string = "Pair “Moddablue Keyboard”";
		}
	}

	onPasskeyRequested(_application: MC.Application) {
		this.#awaitingPasskey = true;
		this.#passkey = "";
		const keyboard = this.data.KEYBOARD;
		const behavior = keyboard?.behavior as KeyboardBehaviorState | undefined;
		if (keyboard && behavior?.SYMBOL) {
			behavior.state = behavior.SYMBOL;
			keyboard.invalidate();
		}
		if (this.data.STATUS_DOT) this.data.STATUS_DOT.state = 1;
		if (this.data.STATUS_LABEL) {
			this.data.STATUS_LABEL.state = 1;
			this.data.STATUS_LABEL.string = "AUTH CODE";
		}
		if (this.data.FEEDBACK) {
			this.data.FEEDBACK.state = 0;
			this.data.FEEDBACK.string = "Enter the 6-digit Mac code";
		}
	}
}

const Header = Container.template(($: AppData) => ({
	height: 42,
	left: 0,
	right: 0,
	skin: HeaderSkin,
	contents: [
		Label($, {
			left: 14,
			width: 150,
			top: 0,
			bottom: 0,
			style: HeaderStyle,
			string: "BLE Keyboard",
		}),
		Content($, {
			anchor: "STATUS_DOT",
			right: 130,
			top: 16,
			width: 10,
			height: 10,
			skin: StatusDotSkin,
		}),
		Label($, {
			anchor: "STATUS_LABEL",
			right: 10,
			width: 112,
			top: 0,
			bottom: 0,
			style: StatusStyle,
			string: "PAIRING",
		}),
	],
}));

const KeyboardView = Column.template(($: AppData) => ({
	left: 0,
	right: 0,
	top: 0,
	bottom: 0,
	skin: BackgroundSkin,
	contents: [
		Header($),
		Label($, {
			anchor: "FEEDBACK",
			left: 0,
			right: 0,
			height: 34,
			style: FeedbackStyle,
			string: "Pair “Moddablue Keyboard”",
		}),
		Container($, {
			left: 0,
			right: 0,
			height: 164,
			contents: [
				Keyboard($, {
					anchor: "KEYBOARD",
					doTransition: false,
					style: KeyboardStyle,
				}),
			],
		}),
	],
}));

const KeyboardApp = Application.template(($: AppData) => ({
	skin: BackgroundSkin,
	Behavior: KeyboardAppBehavior,
	contents: [KeyboardView($)],
}));

export default function () {
	const server: HIDKeyboardService = new HIDKeyboardServiceProvider({
		deviceName: "Moddablue Keyboard",
	});
	const data: AppData = { server };
	const app = new KeyboardApp(data, {
		commandListLength: 3072,
		displayListLength: 4096,
		touchCount: 1,
	});

	server.onConnectionChanged = (state) => {
		app.distribute("onBLEStateChanged", state);
	};
	server.onIndicatorsChanged = (indicators) => {
		const capsLock = (indicators & INDICATOR.CAPS_LOCK) !== 0;
		trace(`[hid-keyboard] caps-lock=${capsLock}\n`);
	};
	server.onNotifyError = (error) => {
		trace(`[hid-keyboard] notify failed: ${error.message}\n`);
	};
	server.onPasskeyRequested = () => {
		app.distribute("onPasskeyRequested");
	};

	app.distribute("onBLEStateChanged", server.getConnectionState());
}
