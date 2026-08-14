import CodexControllerServiceProvider from "CodexControllerServiceProvider";
import type {
	AgentIndex,
	AgentStatus,
	CodexControllerService,
	ConnectionState,
	EncoderStepKey,
} from "moddablue/codex-controller/service";
import { HID_KEY } from "moddablue/codex-controller/service";
import type * as MC from "piu/MC";
import "piu/MC";

const Colors = Object.freeze({
	background: "#0a0c10",
	panel: "#1b2028",
	panelPressed: "#35547a",
	border: "#485261",
	text: "#f7f9fc",
	muted: "#929ba7",
	pairing: "#f59e0b",
	securing: "#38bdf8",
	connected: "#22c55e",
	microphone: "#635bff",
	joystick: "#0f766e",
	knob: "#7c3aed",
});

const BackgroundSkin = new Skin({ fill: Colors.background });
const ButtonSkin = new Skin({
	fill: [Colors.panel, Colors.panelPressed],
	stroke: Colors.border,
	borders: { left: 1, right: 1, top: 1, bottom: 1 },
});
const AgentButtonSkin = new Skin({
	fill: [Colors.text, Colors.panelPressed],
	stroke: Colors.border,
	borders: { left: 1, right: 1, top: 1, bottom: 1 },
});
const MicrophoneSkin = new Skin({
	fill: [Colors.microphone, "#8983ff"],
	stroke: Colors.securing,
	borders: { left: 1, right: 1, top: 1, bottom: 1 },
});
const JoystickSkin = new Skin({
	fill: [Colors.panel, Colors.joystick],
	stroke: Colors.border,
	borders: { left: 1, right: 1, top: 1, bottom: 1 },
});
const KnobSkin = new Skin({
	fill: [Colors.panel, Colors.knob],
	stroke: Colors.border,
	borders: { left: 1, right: 1, top: 1, bottom: 1 },
});
const StatusDotSkin = new Skin({
	fill: [Colors.pairing, Colors.securing, Colors.connected],
});
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
const ButtonStyle = new Style({
	color: Colors.text,
	font: "semibold 16px Open Sans",
	horizontal: "center",
	vertical: "middle",
});
const CompactButtonStyle = new Style({
	color: Colors.text,
	font: "semibold 16px Open Sans",
	horizontal: "center",
	vertical: "middle",
});
const CompactLightAgentButtonStyle = new Style({
	color: [Colors.background, Colors.text],
	font: "semibold 16px Open Sans",
	horizontal: "center",
	vertical: "middle",
});
const ControlTitleStyle = new Style({
	color: Colors.muted,
	font: "semibold 16px Open Sans",
	horizontal: "center",
	vertical: "middle",
});
const FeedbackStyle = new Style({
	color: Colors.securing,
	font: "semibold 16px Open Sans",
	horizontal: "center",
	vertical: "middle",
});
const FocusStyle = new Style({
	color: Colors.muted,
	font: "16px Open Sans",
	horizontal: "center",
	vertical: "middle",
});

type AppData = {
	server: CodexControllerService;
	agents: MC.Container[];
	STATUS_DOT?: MC.Content;
	STATUS_LABEL?: MC.Label;
	FOCUS_LABEL?: MC.Label;
	JOY_STATUS?: MC.Label;
	KNOB_STATUS?: MC.Label;
};

type CommandKind = "agent" | "action" | "microphone";

type CommandButtonData = {
	appData: AppData;
	kind: CommandKind;
	index: number;
	title: string;
	compact?: boolean;
};

type JoystickButtonData = {
	appData: AppData;
	angle: number;
	direction: string;
};

type EncoderStepButtonData = {
	appData: AppData;
	key: EncoderStepKey;
	title: string;
};

const LONG_PRESS_MS = 500;

class CommandButtonBehavior extends Behavior {
	declare data: CommandButtonData;
	#pressed = false;

	onCreate(_button: MC.Container, data: CommandButtonData) {
		this.data = data;
	}

	onTouchBegan(button: MC.Container, id: number, x: number, y: number, ticks: number) {
		button.captureTouch(id as unknown as string, x, y, ticks);
		button.state = 1;
		this.#pressed = true;
		button.bubble("onCommandChanged", this.data.kind, this.data.index, true);
	}

	onTouchMoved(button: MC.Container, _id: number, x: number, y: number) {
		button.state = button.hit(x, y) ? 1 : 0;
	}

	onTouchEnded(button: MC.Container) {
		button.state = 0;
		this.#release(button);
	}

	onTouchCancelled(button: MC.Container) {
		button.state = 0;
		this.#release(button);
	}

	#release(button: MC.Container) {
		if (!this.#pressed) return;
		this.#pressed = false;
		button.bubble("onCommandChanged", this.data.kind, this.data.index, false);
	}
}

class AgentButtonBehavior extends CommandButtonBehavior {
	onCreate(button: MC.Container, data: CommandButtonData) {
		super.onCreate(button, data);
		data.appData.agents[data.index] = button;
	}
}

class JoystickButtonBehavior extends Behavior {
	declare data: JoystickButtonData;
	#pressed = false;

	onCreate(_button: MC.Container, data: JoystickButtonData) {
		this.data = data;
	}

	onTouchBegan(button: MC.Container, id: number, x: number, y: number, ticks: number) {
		button.captureTouch(id as unknown as string, x, y, ticks);
		button.state = 1;
		this.#pressed = true;
		button.bubble("onRadialChanged", this.data.direction, this.data.angle, 1);
	}

	onTouchMoved(button: MC.Container, _id: number, x: number, y: number) {
		button.state = button.hit(x, y) ? 1 : 0;
	}

	onTouchEnded(button: MC.Container) {
		this.#release(button);
	}

	onTouchCancelled(button: MC.Container) {
		this.#release(button);
	}

	#release(button: MC.Container) {
		button.state = 0;
		if (!this.#pressed) return;
		this.#pressed = false;
		button.bubble("onRadialChanged", "CENTER", 0, 0);
	}
}

class EncoderStepButtonBehavior extends Behavior {
	declare data: EncoderStepButtonData;

	onCreate(_button: MC.Container, data: EncoderStepButtonData) {
		this.data = data;
	}

	onTouchBegan(button: MC.Container, id: number, x: number, y: number, ticks: number) {
		button.captureTouch(id as unknown as string, x, y, ticks);
		button.state = 1;
	}

	onTouchMoved(button: MC.Container, _id: number, x: number, y: number) {
		button.state = button.hit(x, y) ? 1 : 0;
	}

	onTouchEnded(button: MC.Container, _id: number, x: number, y: number) {
		const accepted = Boolean(button.hit(x, y));
		button.state = 0;
		if (accepted) button.bubble("onEncoderStep", this.data.title, this.data.key);
	}

	onTouchCancelled(button: MC.Container) {
		button.state = 0;
	}
}

class EncoderPressButtonBehavior extends Behavior {
	#pressed = false;
	#startedAt = 0;

	onTouchBegan(button: MC.Container, id: number, x: number, y: number, ticks: number) {
		button.captureTouch(id as unknown as string, x, y, ticks);
		button.state = 1;
		this.#pressed = true;
		this.#startedAt = ticks;
		button.duration = LONG_PRESS_MS;
		button.time = 0;
		button.start();
		button.bubble("onEncoderPressChanged", true);
		button.bubble("onKnobGesture", "HOLD...");
	}

	onFinished(button: MC.Container) {
		if (this.#pressed) button.bubble("onKnobGesture", "LONG");
	}

	onTouchMoved(button: MC.Container, _id: number, x: number, y: number) {
		button.state = button.hit(x, y) ? 1 : 0;
	}

	onTouchEnded(button: MC.Container, _id: number, _x: number, _y: number, ticks: number) {
		this.#release(button, ticks - this.#startedAt >= LONG_PRESS_MS ? "LONG" : "SHORT");
	}

	onTouchCancelled(button: MC.Container) {
		this.#release(button, "CANCEL");
	}

	#release(button: MC.Container, gesture: string) {
		button.stop();
		button.state = 0;
		if (!this.#pressed) return;
		this.#pressed = false;
		button.bubble("onEncoderPressChanged", false);
		button.bubble("onKnobGesture", gesture);
	}
}

class CodexControllerAppBehavior extends Behavior {
	declare data: AppData;

	onCreate(_application: MC.Application, data: AppData) {
		this.data = data;
	}

	onDisplaying(application: MC.Application) {
		if (application.width !== 320 || application.height !== 240) {
			trace("[codex-controller] this UI is designed for a 320x240 display\n");
		}
	}

	onCommandChanged(_application: MC.Application, kind: CommandKind, index: number, pressed: boolean) {
		if (kind === "agent") {
			if (Number.isInteger(index) && index >= 0 && index <= 5) this.data.server.sendAgent(index as AgentIndex, pressed);
		} else if (kind === "action") this.data.server.sendAction(index, pressed);
		else this.data.server.sendMicrophone(pressed);
	}

	onRadialChanged(_application: MC.Application, direction: string, angle: number, distance: number) {
		this.data.server.sendRadial({ angle, distance });
		if (this.data.JOY_STATUS) this.data.JOY_STATUS.string = direction;
	}

	onEncoderStep(_application: MC.Application, direction: string, key: EncoderStepKey) {
		this.data.server.sendEncoderStep(key);
		if (this.data.KNOB_STATUS) this.data.KNOB_STATUS.string = direction;
	}

	onEncoderPressChanged(_application: MC.Application, pressed: boolean) {
		this.data.server.sendHID({ key: HID_KEY.ENCODER_PRESS, pressed });
	}

	onKnobGesture(_application: MC.Application, gesture: string) {
		if (this.data.KNOB_STATUS) this.data.KNOB_STATUS.string = gesture;
	}

	onBLEStateChanged(_application: MC.Application, state: ConnectionState) {
		const dot = this.data.STATUS_DOT;
		const label = this.data.STATUS_LABEL;
		if (!dot || !label) return;
		if (state.subscribed) {
			dot.state = 2;
			label.state = 2;
			label.string = "CODEX READY";
		} else if (state.connected) {
			dot.state = 1;
			label.state = 1;
			label.string = "SECURING";
		} else {
			dot.state = 0;
			label.state = 0;
			label.string = "PAIRING";
		}
	}

	onAgentStatusChanged(_application: MC.Application, status: AgentStatus[]) {
		for (const item of status) {
			if (!Number.isInteger(item.id) || item.id < 0 || item.id >= this.data.agents.length) continue;
			const button = this.data.agents[item.id];
			if (!button) continue;
			const value = item.color ?? 0;
			const color = colorForAgent(value);
			button.skin = new Skin({
				fill: [color, Colors.panelPressed],
				stroke: Colors.text,
				borders: { left: 1, right: 1, top: 1, bottom: 1 },
			});
			const label = button.first as MC.Label | null;
			if (label) label.style = styleForAgent(value);
		}
	}

	onFocusedAppChanged(_application: MC.Application, appName: string) {
		if (this.data.FOCUS_LABEL) this.data.FOCUS_LABEL.string = appName ? `FOCUS: ${appName}` : "FOCUS: --";
	}

	onQuit(_application: MC.Application) {
		this.data.server.close();
	}
}

function colorForAgent(color: number) {
	const red = (color >> 16) & 0xff;
	const green = (color >> 8) & 0xff;
	const blue = color & 0xff;
	return `#${red.toString(16).padStart(2, "0")}${green.toString(16).padStart(2, "0")}${blue
		.toString(16)
		.padStart(2, "0")}`;
}

function styleForAgent(color: number) {
	const red = linearColorChannel((color >> 16) & 0xff);
	const green = linearColorChannel((color >> 8) & 0xff);
	const blue = linearColorChannel(color & 0xff);
	const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
	return luminance > 0.179 ? CompactLightAgentButtonStyle : CompactButtonStyle;
}

function linearColorChannel(value: number) {
	const channel = value / 255;
	return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

const CommandButton = Container.template(($: CommandButtonData) => ({
	active: true,
	skin: $.kind === "agent" ? AgentButtonSkin : $.kind === "microphone" ? MicrophoneSkin : ButtonSkin,
	Behavior: $.kind === "agent" ? AgentButtonBehavior : CommandButtonBehavior,
	contents: [
		Label($, {
			left: 2,
			right: 2,
			top: 0,
			bottom: 0,
			style: $.kind === "agent" ? CompactLightAgentButtonStyle : $.compact ? CompactButtonStyle : ButtonStyle,
			string: $.title,
		}),
	],
}));

const JoystickButton = Container.template(($: JoystickButtonData) => ({
	active: true,
	skin: JoystickSkin,
	Behavior: JoystickButtonBehavior,
	contents: [
		Label($, {
			left: 0,
			right: 0,
			top: 0,
			bottom: 0,
			style: CompactButtonStyle,
			string: $.direction,
		}),
	],
}));

const EncoderStepButton = Container.template(($: EncoderStepButtonData) => ({
	active: true,
	skin: KnobSkin,
	Behavior: EncoderStepButtonBehavior,
	contents: [
		Label($, {
			left: 0,
			right: 0,
			top: 0,
			bottom: 0,
			style: CompactButtonStyle,
			string: $.title,
		}),
	],
}));

const EncoderPressButton = Container.template(($: AppData) => ({
	active: true,
	skin: KnobSkin,
	Behavior: EncoderPressButtonBehavior,
	contents: [
		Label($, {
			left: 0,
			right: 0,
			top: 0,
			bottom: 0,
			style: CompactButtonStyle,
			string: "PUSH",
		}),
	],
}));

const ControllerView = Container.template(($: AppData) => ({
	left: 0,
	right: 0,
	top: 0,
	bottom: 0,
	skin: BackgroundSkin,
	contents: [
		Label($, {
			left: 8,
			top: 0,
			width: 160,
			height: 26,
			style: TitleStyle,
			string: "CODEX CONTROLLER",
		}),
		Content($, {
			anchor: "STATUS_DOT",
			right: 108,
			top: 9,
			width: 8,
			height: 8,
			skin: StatusDotSkin,
		}),
		Label($, {
			anchor: "STATUS_LABEL",
			right: 4,
			top: 0,
			width: 100,
			height: 26,
			style: StatusStyle,
			string: "PAIRING",
		}),
		CommandButton(
			{ appData: $, kind: "agent", index: 0, title: "AG00", compact: true },
			{ left: 4, top: 28, width: 48, height: 28 },
		),
		CommandButton(
			{ appData: $, kind: "agent", index: 1, title: "AG01", compact: true },
			{ left: 57, top: 28, width: 48, height: 28 },
		),
		CommandButton(
			{ appData: $, kind: "agent", index: 2, title: "AG02", compact: true },
			{ left: 110, top: 28, width: 48, height: 28 },
		),
		CommandButton(
			{ appData: $, kind: "agent", index: 3, title: "AG03", compact: true },
			{ left: 163, top: 28, width: 48, height: 28 },
		),
		CommandButton(
			{ appData: $, kind: "agent", index: 4, title: "AG04", compact: true },
			{ left: 216, top: 28, width: 48, height: 28 },
		),
		CommandButton(
			{ appData: $, kind: "agent", index: 5, title: "AG05", compact: true },
			{ left: 269, top: 28, width: 47, height: 28 },
		),
		Label($, {
			anchor: "FOCUS_LABEL",
			left: 4,
			right: 4,
			top: 58,
			height: 17,
			style: FocusStyle,
			string: "FOCUS: --",
		}),
		JoystickButton({ appData: $, angle: 0.75, direction: "U" }, { left: 41, top: 78, width: 30, height: 26 }),
		JoystickButton({ appData: $, angle: 0.5, direction: "L" }, { left: 7, top: 106, width: 30, height: 30 }),
		Label($, {
			anchor: "JOY_STATUS",
			left: 39,
			top: 106,
			width: 34,
			height: 30,
			style: ControlTitleStyle,
			string: "JOY",
		}),
		JoystickButton({ appData: $, angle: 0, direction: "R" }, { left: 75, top: 106, width: 30, height: 30 }),
		JoystickButton({ appData: $, angle: 0.25, direction: "D" }, { left: 41, top: 138, width: 30, height: 26 }),
		Label($, {
			left: 114,
			top: 78,
			width: 202,
			height: 18,
			style: ControlTitleStyle,
			string: "KNOB",
		}),
		EncoderStepButton(
			{ appData: $, key: HID_KEY.ENCODER_COUNTERCLOCKWISE, title: "CCW" },
			{ left: 114, top: 98, width: 54, height: 45 },
		),
		EncoderPressButton($, { left: 171, top: 98, width: 88, height: 45 }),
		EncoderStepButton(
			{ appData: $, key: HID_KEY.ENCODER_CLOCKWISE, title: "CW" },
			{ left: 262, top: 98, width: 54, height: 45 },
		),
		Label($, {
			anchor: "KNOB_STATUS",
			left: 114,
			top: 145,
			width: 202,
			height: 19,
			style: FeedbackStyle,
			string: "READY",
		}),
		CommandButton(
			{ appData: $, kind: "action", index: 6, title: "ACT06", compact: true },
			{ left: 4, top: 168, width: 60, height: 31 },
		),
		CommandButton(
			{ appData: $, kind: "action", index: 7, title: "ACT07", compact: true },
			{ left: 68, top: 168, width: 60, height: 31 },
		),
		CommandButton(
			{ appData: $, kind: "action", index: 8, title: "ACT08", compact: true },
			{ left: 132, top: 168, width: 60, height: 31 },
		),
		CommandButton(
			{ appData: $, kind: "action", index: 9, title: "ACT09", compact: true },
			{ left: 196, top: 168, width: 60, height: 31 },
		),
		CommandButton(
			{ appData: $, kind: "action", index: 12, title: "ACT12", compact: true },
			{ right: 4, top: 168, width: 60, height: 31 },
		),
		CommandButton(
			{ appData: $, kind: "microphone", index: 10, title: "MIC  ACT10 + ACT11", compact: true },
			{ left: 4, right: 4, top: 202, bottom: 4 },
		),
	],
}));

const CodexControllerApp = Application.template(($: AppData) => ({
	skin: BackgroundSkin,
	Behavior: CodexControllerAppBehavior,
	contents: [ControllerView($)],
}));

export default function () {
	const server: CodexControllerService = new CodexControllerServiceProvider({
		deviceName: "Vibe Watch #1",
	});
	const data: AppData = { server, agents: new Array(6) };
	const app = new CodexControllerApp(data, {
		commandListLength: 4096,
		displayListLength: 4096,
		touchCount: 1,
	});
	server.onConnectionChanged = (state) => app.distribute("onBLEStateChanged", state);
	server.onAgentStatus = (status) => app.distribute("onAgentStatusChanged", status);
	server.onFocusedApp = (appName) => app.distribute("onFocusedAppChanged", appName);
	server.onNotifyError = (error) => trace(`[codex-controller] notify failed: ${error.message}\n`);
	app.distribute("onBLEStateChanged", server.getConnectionState());
	return app;
}
