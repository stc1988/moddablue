type ProtocolMode = 0 | 1;

type ConnectionState = {
	connected: boolean;
	connectionCount: number;
	protocolMode: ProtocolMode;
	subscribed: boolean;
	subscribedReportCount: number;
};

type HIDKeyboardServiceOptions = {
	deviceName?: string;
};

interface HIDKeyboardService {
	onConnectionChanged: ((state: ConnectionState) => void) | null;
	onIndicatorsChanged: ((indicators: number) => void) | null;
	onNotifyError: ((error: Error) => void) | null;
	onPasskeyRequested: (() => void) | null;

	close(): void;
	getConnectionState(): ConnectionState;
	notifyCharacter(character: string, modifiers?: number): boolean;
	submitPasskey(passkey: number): boolean;
}

const INDICATOR = Object.freeze({
	NUM_LOCK: 0x01,
	CAPS_LOCK: 0x02,
	SCROLL_LOCK: 0x04,
	COMPOSE: 0x08,
	KANA: 0x10,
});

export type { ConnectionState, HIDKeyboardService, HIDKeyboardServiceOptions, ProtocolMode };
export { INDICATOR };
