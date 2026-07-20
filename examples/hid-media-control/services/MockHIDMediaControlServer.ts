import type { ConnectionState, HIDMediaControlService, HIDMediaControlServiceOptions } from "HIDMediaControlService";
import { getUsageName } from "HIDMediaControlService";
import Timer from "timer";

const INITIAL_STATE: ConnectionState = Object.freeze({
	connected: false,
	connectionCount: 0,
	subscribed: false,
	subscribedReportCount: 0,
});

class MockHIDMediaControlServer implements HIDMediaControlService {
	#connectTimer?: ReturnType<typeof Timer.set>;
	#subscribeTimer?: ReturnType<typeof Timer.set>;
	#state: ConnectionState = { ...INITIAL_STATE };
	onConnectionChanged: ((state: ConnectionState) => void) | null = null;
	onNotifyError: ((error: Error) => void) | null = null;

	constructor(options: HIDMediaControlServiceOptions = {}) {
		trace(`[hid-media-control/mock] advertising as "${options.deviceName ?? "BLE Media Control"}"\n`);
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

	notifyUsage(usage: number): boolean {
		if (!this.#state.subscribed) return false;
		trace(`[hid-media-control/mock] action=${getUsageName(usage)} usage=0x${usage.toString(16).padStart(4, "0")}\n`);
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

export default MockHIDMediaControlServer;
