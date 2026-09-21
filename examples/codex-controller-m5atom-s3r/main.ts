/*
 * Copyright (c) 2026 Satoshi Tanaka
 *
 * This work is licensed under the Creative Commons Attribution 4.0 International License.
 * To view a copy of this license, visit
 *     http://creativecommons.org/licenses/by/4.0/
 */

import M5ChainBuzzer, { BUZZER_NOTE } from "m5chainBuzzer";
import M5ChainEncoder, { EncoderABDirection, SaveToFlash } from "m5chainEncoder";
import M5ChainJoyStick, { type JoystickValue, KEY_MODE } from "m5chainJoyStick";
import { Outline } from "commodetto/outline";
import type { RegisteredM5ChainDevice } from "m5chain";
import M5Chain from "m5chain";
import HIDCodexControllerServer from "moddablue/codex-controller/server";
import type {
	AgentStatus,
	AmbientStatus,
	CodexControllerService,
	ConnectionState,
	LightingEffect,
} from "moddablue/codex-controller/service";
import { HID_KEY, LIGHTING_EFFECT } from "moddablue/codex-controller/service";
import type * as MC from "piu/MC";
import "piu/MC";
import type { Shape as MCShape } from "piu/shape";
import "piu/shape";
import Timer from "timer";
import ByteButton from "unit/bytebutton";

const LOG_PREFIX = "[codex-controller-m5atom-s3r]";
const JOYSTICK_DEAD_ZONE = Math.round(127 * 0.15);
const KEY_POLLING_INTERVAL = 30;
const ACTION_LED_BRIGHTNESS = 128;
const AGENT_COLOR_BRIGHTNESS_BOOST = 64;
const COLOR_NOTIFICATION_MELODY = Object.freeze([
	{ note: BUZZER_NOTE.E6, beats: 0.5 },
	{ note: BUZZER_NOTE.C7, beats: 0.5 },
] as const);
const COLOR_NOTIFICATION_OPTIONS = Object.freeze({
	tempoBpm: 200,
	gateRatio: 0.82,
});

const AGENT_KEYS = Object.freeze(["AG00", "AG01", "AG02", "AG03", "AG04", "AG05"] as const);
const ACTION_KEYS = Object.freeze([HID_KEY.ACT06, HID_KEY.ACT07] as const);
const CHAIN_DEVICE_CLASSES = Object.freeze([M5ChainJoyStick, M5ChainEncoder, M5ChainBuzzer]);

type ChainDevice = RegisteredM5ChainDevice<typeof CHAIN_DEVICE_CLASSES>;
type JoystickDevice = Extract<ChainDevice, { kind: "joystick" }>;
type EncoderDevice = Extract<ChainDevice, { kind: "encoder" }>;
type BuzzerDevice = Extract<ChainDevice, { kind: "buzzer" }>;

type AtomButton = {
	readonly pressed: boolean;
	close(): void;
};

type AtomButtonConstructor = new (options: { onPush(this: AtomButton): void }) => AtomButton;

declare const device: {
	peripheral: {
		button: {
			A: AtomButtonConstructor;
		};
	};
};

type AgentLight = {
	color: number;
	brightness: number;
	effect: LightingEffect;
};

type AppData = {
	server: CodexControllerService;
	hardware?: ControllerHardware;
	STATUS_FRAME?: MC.Container;
	MICROPHONE?: MCShape;
};

const Colors = Object.freeze({
	background: "#080b10",
	pairing: "#f59e0b",
	securing: "#38bdf8",
	connected: "#22c55e",
	microphone: "#f7f9fc",
	microphonePressed: "#8983ff",
});

const StatusFrameSkin = new Skin({ fill: [Colors.pairing, Colors.securing, Colors.connected] });
const BackgroundSkin = new Skin({ fill: Colors.background });
const MicrophoneSkin = new Skin({
	fill: [Colors.microphone, Colors.microphonePressed],
	stroke: [Colors.microphone, Colors.microphonePressed],
});

class MicrophoneBehavior extends Behavior {
	onCreate(shape: MCShape) {
		const body = new Outline.CanvasPath();
		body.moveTo(38, 8);
		body.bezierCurveTo(29, 8, 23, 15, 23, 24);
		body.lineTo(23, 47);
		body.bezierCurveTo(23, 56, 29, 63, 38, 63);
		body.bezierCurveTo(47, 63, 53, 56, 53, 47);
		body.lineTo(53, 24);
		body.bezierCurveTo(53, 15, 47, 8, 38, 8);
		body.closePath();
		shape.fillOutline = Outline.fill(body);

		const stand = new Outline.CanvasPath();
		stand.moveTo(14, 43);
		stand.lineTo(14, 48);
		stand.bezierCurveTo(14, 62, 24, 73, 38, 73);
		stand.bezierCurveTo(52, 73, 62, 62, 62, 48);
		stand.lineTo(62, 43);
		stand.moveTo(38, 73);
		stand.lineTo(38, 82);
		stand.moveTo(25, 82);
		stand.lineTo(51, 82);
		shape.strokeOutline = Outline.stroke(stand, 5, Outline.LINECAP_ROUND, Outline.LINEJOIN_ROUND);
	}
}

class ControllerAppBehavior extends Behavior {
	declare data: AppData;

	onCreate(_application: MC.Application, data: AppData) {
		this.data = data;
	}

	onDisplaying(application: MC.Application) {
		if (application.width !== 128 || application.height !== 128)
			log(`this UI is designed for a 128x128 display (actual ${application.width}x${application.height})`);
	}

	onConnectionChanged(_application: MC.Application, state: ConnectionState) {
		if (this.data.STATUS_FRAME) this.data.STATUS_FRAME.state = state.subscribed ? 2 : state.connected ? 1 : 0;
	}

	onMicrophoneChanged(_application: MC.Application, pressed: boolean) {
		if (this.data.MICROPHONE) this.data.MICROPHONE.state = pressed ? 1 : 0;
	}

	onQuit(_application: MC.Application) {
		this.data.hardware?.close();
		this.data.server.close();
	}
}

const ControllerView = Container.template(($: AppData) => ({
	anchor: "STATUS_FRAME",
	left: 0,
	right: 0,
	top: 0,
	bottom: 0,
	skin: StatusFrameSkin,
	contents: [
		Container($, {
			left: 5,
			right: 5,
			top: 5,
			bottom: 5,
			skin: BackgroundSkin,
			contents: [
				Shape($, {
					anchor: "MICROPHONE",
					left: 21,
					right: 21,
					top: 14,
					bottom: 14,
					skin: MicrophoneSkin,
					Behavior: MicrophoneBehavior,
				}),
			],
		}),
	],
}));

const ControllerApp = Application.template(($: AppData) => ({
	skin: BackgroundSkin,
	Behavior: ControllerAppBehavior,
	contents: [ControllerView($)],
}));

class ControllerHardware {
	readonly #server: CodexControllerService;
	readonly #onMicrophoneChanged: (pressed: boolean) => void;
	readonly #agentLights: AgentLight[] = Array.from({ length: AGENT_KEYS.length }, () => ({
		color: 0,
		brightness: 1,
		effect: LIGHTING_EFFECT.SOLID,
	}));
	readonly #ambientLight: AgentLight = {
		color: 0,
		brightness: 1,
		effect: LIGHTING_EFFECT.OFF,
	};
	#atomButton?: AtomButton;
	#byteButton?: ByteButton;
	#byteButtonMask = 0;
	#m5chain?: M5Chain<typeof CHAIN_DEVICE_CLASSES>;
	#joystick?: JoystickDevice;
	#encoder?: EncoderDevice;
	#buzzer?: BuzzerDevice;
	#joystickDirection = "center";
	#joystickPressed = false;
	#encoderPressed = false;
	#keyTimer?: ReturnType<typeof Timer.repeat>;
	#pollingKeys = false;
	#updatingJoystickLight = false;
	#joystickLightDirty = false;
	#microphonePressed = false;
	#closed = false;

	constructor(server: CodexControllerService, onMicrophoneChanged: (pressed: boolean) => void) {
		this.#server = server;
		this.#onMicrophoneChanged = onMicrophoneChanged;
		this.#startAtomButton();
		this.#startByteButton();
		this.#startM5Chain();
	}

	updateAgentStatus(statuses: AgentStatus[]) {
		const byteButton = this.#byteButton;
		if (!byteButton) return;
		let shouldNotify = false;

		try {
			for (const status of statuses) {
				const index = AGENT_KEYS.indexOf(status.key);
				if (index < 0) continue;
				const light = this.#agentLights[index];
				if (status.color !== undefined) {
					if (status.color !== light.color && status.color !== 0x000000) shouldNotify = true;
					light.color = status.color;
				}
				if (status.brightness !== undefined) light.brightness = status.brightness;
				if (status.effect !== undefined) light.effect = status.effect;
				this.#applyAgentLight(index, light);
			}
		} catch (error) {
			logError("ByteButton LED update", error);
			safelyCloseByteButton(byteButton);
			this.#byteButton = undefined;
			return;
		}

		if (shouldNotify) this.#playColorNotification();
	}

	updateAmbientStatus(status: AmbientStatus) {
		const update = status.ambient;
		if (!update) return;
		if (update.color !== undefined) this.#ambientLight.color = update.color;
		if (update.brightness !== undefined) this.#ambientLight.brightness = update.brightness;
		if (update.effect !== undefined) this.#ambientLight.effect = update.effect;
		this.#requestJoystickLightUpdate();
	}

	close() {
		if (this.#closed) return;
		this.#closed = true;
		this.#joystickLightDirty = false;
		if (this.#keyTimer) Timer.clear(this.#keyTimer);
		this.#keyTimer = undefined;
		this.#atomButton?.close();
		this.#atomButton = undefined;
		this.#releaseMicrophone();
		this.#releaseByteButtons();
		this.#releaseJoystick();
		this.#releaseEncoder();
		this.#buzzer = undefined;
		if (this.#byteButton) safelyCloseByteButton(this.#byteButton);
		this.#byteButton = undefined;
		const m5chain = this.#m5chain;
		this.#m5chain = undefined;
		if (m5chain) void m5chain.close().catch((error: unknown) => logError("M5Chain close", error));
	}

	#startAtomButton() {
		const controller = this;
		this.#atomButton = new device.peripheral.button.A({
			onPush() {
				const pressed = this.pressed;
				if (pressed === controller.#microphonePressed) return;
				controller.#microphonePressed = pressed;
				controller.#server.sendMicrophone(pressed);
				controller.#onMicrophoneChanged(pressed);
			},
		});
	}

	#startByteButton() {
		let byteButton: ByteButton | undefined;
		try {
			byteButton = new ByteButton();
			byteButton.setLedMode(ByteButton.LED_MODE.MANUAL);
			for (let led = 0; led < ByteButton.LED_COUNT; led++) {
				byteButton.setLedBrightness(led, led === 8 ? 0 : led < AGENT_KEYS.length ? 255 : ACTION_LED_BRIGHTNESS);
				if (led === 6) byteButton.setLed(led, { r: 0, g: 255, b: 0 });
				else if (led === 7) byteButton.setLed(led, { r: 255, g: 0, b: 0 });
				else byteButton.setLed(led, { r: 0, g: 0, b: 0 });
			}
			byteButton.onButtonChange = (button, pressed) => this.#onByteButtonChanged(button, pressed);
			this.#byteButton = byteButton;
		} catch (error) {
			if (byteButton) safelyCloseByteButton(byteButton);
			this.#byteButton = undefined;
			logError("ByteButton initialization", error);
		}
	}

	#onByteButtonChanged(button: number, pressed: boolean) {
		const bit = 1 << button;
		if (pressed) this.#byteButtonMask |= bit;
		else this.#byteButtonMask &= ~bit;

		if (button < AGENT_KEYS.length) this.#server.sendAgent(AGENT_KEYS[button], pressed);
		else this.#server.sendAction(ACTION_KEYS[button - AGENT_KEYS.length], pressed);
	}

	#applyAgentLight(index: number, light: AgentLight) {
		const byteButton = this.#byteButton;
		if (!byteButton) return;
		let brightness = light.effect === LIGHTING_EFFECT.OFF ? 0 : Math.round(light.brightness * 255);
		if (brightness > 0 && light.color !== 0x000000 && light.color !== 0xffffff)
			brightness = Math.min(255, brightness + AGENT_COLOR_BRIGHTNESS_BOOST);
		byteButton.setLedBrightness(index, brightness);
		byteButton.setLed(index, {
			r: (light.color >> 16) & 0xff,
			g: (light.color >> 8) & 0xff,
			b: light.color & 0xff,
		});
	}

	#startM5Chain() {
		try {
			const m5chain = new M5Chain({
				deviceClasses: CHAIN_DEVICE_CLASSES,
				pollingInterval: 30,
				connectionCheckInterval: 1000,
			});
			this.#m5chain = m5chain;
			m5chain.onError = (error, context) => logError(`M5Chain ${context.source}`, error);
			m5chain.onDeviceListChanged = (devices) => this.#onChainDevicesChanged(devices);
			this.#keyTimer = Timer.repeat(() => this.#requestKeyPoll(), KEY_POLLING_INTERVAL);
			void m5chain.start().catch((error: unknown) => logError("M5Chain start", error));
		} catch (error) {
			logError("M5Chain initialization", error);
		}
	}

	async #onChainDevicesChanged(devices: readonly ChainDevice[]) {
		const joystick = devices.find((device): device is JoystickDevice => device.kind === "joystick");
		const encoder = devices.find((device): device is EncoderDevice => device.kind === "encoder");
		const buzzer = devices.find((device): device is BuzzerDevice => device.kind === "buzzer");
		this.#buzzer = buzzer;

		if (joystick !== this.#joystick) {
			this.#releaseJoystick();
			this.#joystick = joystick;
			if (joystick) {
				try {
					await joystick.configure({ key: { mode: KEY_MODE.PASSIVE } });
					if (this.#joystick === joystick && joystick.connected) {
						joystick.onSample = (sample) => this.#onJoystickSample(sample);
						joystick.onDisconnected = () => {
							if (this.#joystick !== joystick) return;
							this.#releaseJoystick();
							this.#joystick = undefined;
						};
						this.#requestJoystickLightUpdate();
					}
				} catch (error) {
					logError("joystick configuration", error);
				}
			}
		}

		if (encoder !== this.#encoder) {
			this.#releaseEncoder();
			this.#encoder = encoder;
			if (encoder) {
				try {
					await encoder.configure({
						key: { mode: KEY_MODE.PASSIVE },
						abDirection: EncoderABDirection.CLOCKWISE_INCREASE,
						saveToFlash: SaveToFlash.DISABLE,
					});
					if (this.#encoder === encoder && encoder.connected) {
						encoder.onSample = (delta) => this.#onEncoderSample(delta);
						encoder.onDisconnected = () => {
							if (this.#encoder !== encoder) return;
							this.#releaseEncoder();
							this.#encoder = undefined;
						};
					}
				} catch (error) {
					logError("encoder configuration", error);
				}
			}
		}
	}

	#playColorNotification() {
		const buzzer = this.#buzzer;
		if (!buzzer?.connected) return;
		void buzzer
			.playMelody(COLOR_NOTIFICATION_MELODY, COLOR_NOTIFICATION_OPTIONS)
			.catch((error: unknown) => logError("buzzer color notification", error));
	}

	#requestJoystickLightUpdate() {
		this.#joystickLightDirty = true;
		if (this.#updatingJoystickLight || this.#closed) return;
		this.#updatingJoystickLight = true;
		void this.#applyJoystickLightUpdates().finally(() => {
			this.#updatingJoystickLight = false;
			if (this.#joystickLightDirty && !this.#closed) this.#requestJoystickLightUpdate();
		});
	}

	async #applyJoystickLightUpdates() {
		try {
			while (this.#joystickLightDirty && !this.#closed) {
				this.#joystickLightDirty = false;
				const joystick = this.#joystick;
				if (!joystick?.connected) return;
				const { color, brightness, effect } = this.#ambientLight;
				await joystick.setLedColor((color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff);
				if (this.#joystick !== joystick || !joystick.connected) return;
				await joystick.setLedBrightness(effect === LIGHTING_EFFECT.OFF ? 0 : brightness);
			}
		} catch (error) {
			logError("joystick ambient LED update", error);
		}
	}

	#onJoystickSample(sample: JoystickValue) {
		const absX = Math.abs(sample.x);
		const absY = Math.abs(sample.y);
		let direction: "center" | "right" | "down" | "left" | "up";
		let angle = 0;

		if (Math.max(absX, absY) <= JOYSTICK_DEAD_ZONE) direction = "center";
		else if (absX >= absY) {
			if (sample.x >= 0) direction = "right";
			else {
				direction = "left";
				angle = 0.5;
			}
		} else if (sample.y >= 0) {
			direction = "up";
			angle = 0.75;
		} else {
			direction = "down";
			angle = 0.25;
		}

		if (direction === this.#joystickDirection) return;
		this.#joystickDirection = direction;
		this.#server.sendRadial({ angle, distance: direction === "center" ? 0 : 1 });
	}

	#onEncoderSample(delta: number) {
		const key = delta > 0 ? HID_KEY.ENC_CW : HID_KEY.ENC_CC;
		for (let step = 0; step < Math.abs(delta); step++) this.#server.sendEncoderStep(key);
	}

	#requestKeyPoll() {
		if (this.#pollingKeys || this.#closed) return;
		this.#pollingKeys = true;
		void this.#pollKeys().finally(() => {
			this.#pollingKeys = false;
		});
	}

	async #pollKeys() {
		const joystick = this.#joystick;
		if (joystick?.connected) {
			try {
				const pressed = await joystick.isKeyPressed();
				if (this.#joystick === joystick && pressed !== this.#joystickPressed) {
					this.#joystickPressed = pressed;
					this.#server.sendAction(HID_KEY.ACT08, pressed);
				}
			} catch (error) {
				logError("joystick key poll", error);
			}
		} else this.#releaseJoystickPress();

		const encoder = this.#encoder;
		if (encoder?.connected) {
			try {
				const pressed = await encoder.isKeyPressed();
				if (this.#encoder === encoder && pressed !== this.#encoderPressed) {
					this.#encoderPressed = pressed;
					this.#server.sendEncoderPress(pressed);
				}
			} catch (error) {
				logError("encoder key poll", error);
			}
		} else this.#releaseEncoderPress();
	}

	#releaseMicrophone() {
		if (!this.#microphonePressed) return;
		this.#microphonePressed = false;
		this.#server.sendMicrophone(false);
		this.#onMicrophoneChanged(false);
	}

	#releaseByteButtons() {
		for (let button = 0; button < ByteButton.BUTTON_COUNT; button++) {
			if (!(this.#byteButtonMask & (1 << button))) continue;
			if (button < AGENT_KEYS.length) this.#server.sendAgent(AGENT_KEYS[button], false);
			else this.#server.sendAction(ACTION_KEYS[button - AGENT_KEYS.length], false);
		}
		this.#byteButtonMask = 0;
	}

	#releaseJoystick() {
		if (this.#joystick) {
			this.#joystick.onSample = null;
			this.#joystick.onDisconnected = null;
		}
		if (this.#joystickDirection !== "center") {
			this.#joystickDirection = "center";
			this.#server.sendRadial({ angle: 0, distance: 0 });
		}
		this.#releaseJoystickPress();
	}

	#releaseJoystickPress() {
		if (!this.#joystickPressed) return;
		this.#joystickPressed = false;
		this.#server.sendAction(HID_KEY.ACT08, false);
	}

	#releaseEncoder() {
		if (this.#encoder) {
			this.#encoder.onSample = null;
			this.#encoder.onDisconnected = null;
		}
		this.#releaseEncoderPress();
	}

	#releaseEncoderPress() {
		if (!this.#encoderPressed) return;
		this.#encoderPressed = false;
		this.#server.sendEncoderPress(false);
	}
}

function log(message: string) {
	trace(`${LOG_PREFIX} ${message}\n`);
}

function logError(context: string, error: unknown) {
	log(`${context} failed: ${error instanceof Error ? error.message : String(error)}`);
}

function safelyCloseByteButton(byteButton: ByteButton) {
	try {
		byteButton.close();
	} catch (error) {
		logError("ByteButton cleanup", error);
	}
}

export default function () {
	const server: CodexControllerService = new HIDCodexControllerServer({
		deviceName: "Vibe Watch #1",
	});
	const data: AppData = { server };
	const app = new ControllerApp(data, {
		commandListLength: 2048,
		displayListLength: 2048,
		touchCount: 0,
	});
	data.hardware = new ControllerHardware(server, (pressed) => app.distribute("onMicrophoneChanged", pressed));
	server.onConnectionChanged = (state) => app.distribute("onConnectionChanged", state);
	server.onAgentStatus = (status) => data.hardware?.updateAgentStatus(status);
	server.onAmbientStatus = (status) => data.hardware?.updateAmbientStatus(status);
	server.onFocusedApp = (appName) => log(`focused app changed name=${appName}`);
	server.onNotifyError = (error) => logError("BLE notification", error);
	app.distribute("onConnectionChanged", server.getConnectionState());
	return app;
}
