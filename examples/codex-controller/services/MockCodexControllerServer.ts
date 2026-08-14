import type {
	ActionKey,
	AgentIndex,
	AgentStatus,
	AmbientStatus,
	CodexControllerService,
	CodexControllerServiceOptions,
	ConnectionState,
	HIDKeyEvent,
	RadialPosition,
} from "moddablue/codex-controller/service";
import { LIGHTING_EFFECT } from "moddablue/codex-controller/service";
import Timer from "timer";

const INITIAL_STATE: ConnectionState = Object.freeze({
	connected: false,
	connectionCount: 0,
	subscribed: false,
	subscribedReportCount: 0,
});

class MockCodexControllerServer implements CodexControllerService {
	#connectTimer?: ReturnType<typeof Timer.set>;
	#subscribeTimer?: ReturnType<typeof Timer.set>;
	#state: ConnectionState = { ...INITIAL_STATE };
	onConnectionChanged: ((state: ConnectionState) => void) | null = null;
	onAgentStatus: ((status: AgentStatus[]) => void) | null = null;
	onAmbientStatus: ((status: AmbientStatus) => void) | null = null;
	onFocusedApp: ((appName: string) => void) | null = null;
	onNotifyError: ((error: Error) => void) | null = null;

	constructor(options: CodexControllerServiceOptions = {}) {
		trace(`[codex-controller/mock] advertising as "${options.deviceName ?? "Vibe Watch #1"}"\n`);
		this.#connectTimer = Timer.set(() => {
			this.#connectTimer = undefined;
			this.#setState({ connected: true, connectionCount: 1 });
			this.#subscribeTimer = Timer.set(() => {
				this.#subscribeTimer = undefined;
				this.#setState({ subscribed: true, subscribedReportCount: 1 });
				this.onFocusedApp?.("Codex");
				this.onAgentStatus?.([
					{ id: 0, color: 0x22c55e, brightness: 1, effect: LIGHTING_EFFECT.SOLID, speed: 0 },
					{ id: 1, color: 0x38bdf8, brightness: 0.85, effect: LIGHTING_EFFECT.BREATH, speed: 0.6 },
					{ id: 2, color: 0xf59e0b, brightness: 0.8, effect: LIGHTING_EFFECT.SOLID, speed: 0 },
					{ id: 3, color: 0x8b5cf6, brightness: 0.75, effect: LIGHTING_EFFECT.SOLID, speed: 0 },
					{ id: 4, color: 0xef4444, brightness: 0.65, effect: LIGHTING_EFFECT.SOLID, speed: 0 },
					{ id: 5, color: 0x64748b, brightness: 0.5, effect: LIGHTING_EFFECT.SOLID, speed: 0 },
				]);
			}, 500);
		}, 500);
	}

	getConnectionState(): ConnectionState {
		return { ...this.#state };
	}

	sendHID(event: HIDKeyEvent): boolean {
		if (!this.#state.subscribed) return false;
		trace(
			`[codex-controller/mock] key=${event.key} action=${event.pressed ? "down" : "up"} agent=${event.agent ?? "none"}\n`,
		);
		return true;
	}

	sendRadial(position: RadialPosition): boolean {
		if (!this.#state.subscribed) return false;
		trace(`[codex-controller/mock] radial angle=${position.angle} distance=${position.distance}\n`);
		return true;
	}

	sendAgent(index: AgentIndex, pressed: boolean): boolean {
		return this.sendHID({ key: `AG0${index}`, pressed, agent: index });
	}

	sendAction(index: number, pressed: boolean): boolean {
		return this.sendHID({ key: `ACT${index.toString().padStart(2, "0")}` as ActionKey, pressed });
	}

	sendMicrophone(pressed: boolean): boolean {
		const first = this.sendAction(10, pressed);
		const second = this.sendAction(11, pressed);
		return first || second;
	}

	close(): void {
		if (this.#connectTimer) Timer.clear(this.#connectTimer);
		if (this.#subscribeTimer) Timer.clear(this.#subscribeTimer);
		this.#connectTimer = undefined;
		this.#subscribeTimer = undefined;
		this.#state = { ...INITIAL_STATE };
		this.onConnectionChanged?.(this.getConnectionState());
	}

	#setState(update: Partial<ConnectionState>) {
		this.#state = { ...this.#state, ...update };
		this.onConnectionChanged?.(this.getConnectionState());
	}
}

export default MockCodexControllerServer;
