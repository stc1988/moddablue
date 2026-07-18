import type { ConnectionState, HIDKeyboardService, HIDKeyboardServiceOptions } from "HIDKeyboardService";
import Timer from "timer";

const INITIAL_STATE: ConnectionState = Object.freeze({
	connected: false,
	connectionCount: 0,
	protocolMode: 1,
	subscribed: false,
	subscribedReportCount: 0,
});

class MockHIDKeyboardServer implements HIDKeyboardService {
	#connectTimer?: ReturnType<typeof Timer.set>;
	#subscribeTimer?: ReturnType<typeof Timer.set>;
	#state: ConnectionState = { ...INITIAL_STATE };
	onConnectionChanged: ((state: ConnectionState) => void) | null = null;
	onIndicatorsChanged: ((indicators: number) => void) | null = null;
	onNotifyError: ((error: Error) => void) | null = null;

	constructor(options: HIDKeyboardServiceOptions = {}) {
		trace(`[hid-keyboard/mock] advertising as "${options.deviceName ?? "BLE Keyboard"}"\n`);
		this.#connectTimer = Timer.set(() => {
			this.#connectTimer = undefined;
			this.#setState({
				connected: true,
				connectionCount: 1,
			});
			this.#subscribeTimer = Timer.set(() => {
				this.#subscribeTimer = undefined;
				this.#setState({
					subscribed: true,
					subscribedReportCount: 1,
				});
			}, 500);
		}, 500);
	}

	getConnectionState(): ConnectionState {
		return { ...this.#state };
	}

	notifyCharacter(character: string, modifiers = 0): boolean {
		if (!this.#state.subscribed) return false;
		trace(`[hid-keyboard/mock] key=${JSON.stringify(character)} modifiers=${modifiers}\n`);
		return true;
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

export default MockHIDKeyboardServer;
