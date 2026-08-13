import type {
	AgentStatus,
	AmbientStatus,
	CodexControllerService,
	CodexControllerServiceOptions,
	ConnectionState,
} from "CodexControllerService";
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
					{ id: 0, c: 0x22c55e, b: 1, e: 1, s: 0 },
					{ id: 1, c: 0x38bdf8, b: 0.85, e: 4, s: 0.6 },
					{ id: 2, c: 0xf59e0b, b: 0.8, e: 1, s: 0 },
					{ id: 3, c: 0x8b5cf6, b: 0.75, e: 1, s: 0 },
					{ id: 4, c: 0xef4444, b: 0.65, e: 1, s: 0 },
					{ id: 5, c: 0x64748b, b: 0.5, e: 1, s: 0 },
				]);
			}, 500);
		}, 500);
	}

	getConnectionState(): ConnectionState {
		return { ...this.#state };
	}

	sendAgent(index: number, pressed: boolean): boolean {
		return this.#send(`AG${index.toString().padStart(2, "0")}`, pressed);
	}

	sendAction(index: number, pressed: boolean): boolean {
		return this.#send(`ACT${index.toString().padStart(2, "0")}`, pressed);
	}

	sendMicrophone(pressed: boolean): boolean {
		const first = this.#send("ACT10", pressed);
		const second = this.#send("ACT11", pressed);
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

	#send(key: string, pressed: boolean): boolean {
		if (!this.#state.subscribed) return false;
		trace(`[codex-controller/mock] key=${key} action=${pressed ? "down" : "up"}\n`);
		return true;
	}

	#setState(update: Partial<ConnectionState>) {
		this.#state = { ...this.#state, ...update };
		this.onConnectionChanged?.(this.getConnectionState());
	}
}

export default MockCodexControllerServer;
