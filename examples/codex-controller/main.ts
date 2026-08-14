import CodexControllerServiceProvider from "CodexControllerServiceProvider";
import type {
	AgentIndex,
	AgentStatus,
	CodexControllerService,
	ConnectionState,
} from "moddablue/codex-controller/service";
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
});

const BackgroundSkin = new Skin({ fill: Colors.background });
const ButtonSkin = new Skin({
	fill: [Colors.panel, Colors.panelPressed],
	stroke: Colors.border,
	borders: { left: 1, right: 1, top: 1, bottom: 1 },
});
const MicrophoneSkin = new Skin({
	fill: [Colors.microphone, "#8983ff"],
	stroke: Colors.securing,
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
const LightAgentButtonStyle = new Style({
	color: [Colors.background, Colors.text],
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
};

type CommandKind = "agent" | "action" | "microphone";

type CommandButtonData = {
	appData: AppData;
	kind: CommandKind;
	index: number;
	title: string;
};

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
	return luminance > 0.179 ? LightAgentButtonStyle : ButtonStyle;
}

function linearColorChannel(value: number) {
	const channel = value / 255;
	return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

const CommandButton = Container.template(($: CommandButtonData) => ({
	active: true,
	skin: $.kind === "microphone" ? MicrophoneSkin : ButtonSkin,
	Behavior: $.kind === "agent" ? AgentButtonBehavior : CommandButtonBehavior,
	contents: [
		Label($, {
			left: 2,
			right: 2,
			top: 0,
			bottom: 0,
			style: ButtonStyle,
			string: $.title,
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
			top: 2,
			width: 170,
			height: 26,
			style: TitleStyle,
			string: "CODEX CONTROLLER",
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
			right: 8,
			top: 2,
			width: 116,
			height: 26,
			style: StatusStyle,
			string: "PAIRING",
		}),
		CommandButton(
			{ appData: $, kind: "agent", index: 0, title: "AGENT 1" },
			{ left: 4, top: 32, width: 101, height: 39 },
		),
		CommandButton(
			{ appData: $, kind: "agent", index: 1, title: "AGENT 2" },
			{ left: 109, top: 32, width: 102, height: 39 },
		),
		CommandButton(
			{ appData: $, kind: "agent", index: 2, title: "AGENT 3" },
			{ right: 4, top: 32, width: 101, height: 39 },
		),
		CommandButton(
			{ appData: $, kind: "agent", index: 3, title: "AGENT 4" },
			{ left: 4, top: 75, width: 101, height: 39 },
		),
		CommandButton(
			{ appData: $, kind: "agent", index: 4, title: "AGENT 5" },
			{ left: 109, top: 75, width: 102, height: 39 },
		),
		CommandButton(
			{ appData: $, kind: "agent", index: 5, title: "AGENT 6" },
			{ right: 4, top: 75, width: 101, height: 39 },
		),
		Label($, {
			anchor: "FOCUS_LABEL",
			left: 4,
			right: 4,
			top: 116,
			height: 21,
			style: FocusStyle,
			string: "FOCUS: --",
		}),
		CommandButton(
			{ appData: $, kind: "action", index: 0, title: "FAST" },
			{ left: 4, top: 140, width: 60, height: 42 },
		),
		CommandButton({ appData: $, kind: "action", index: 1, title: "OK" }, { left: 68, top: 140, width: 60, height: 42 }),
		CommandButton(
			{ appData: $, kind: "action", index: 2, title: "NG" },
			{ left: 132, top: 140, width: 60, height: 42 },
		),
		CommandButton(
			{ appData: $, kind: "action", index: 3, title: "PLAN" },
			{ left: 196, top: 140, width: 60, height: 42 },
		),
		CommandButton({ appData: $, kind: "action", index: 4, title: "AI" }, { right: 4, top: 140, width: 60, height: 42 }),
		CommandButton(
			{ appData: $, kind: "microphone", index: 10, title: "HOLD TO TALK" },
			{ left: 4, right: 4, top: 186, bottom: 4 },
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
