type ConnectionState = {
	connected: boolean;
	connectionCount: number;
	subscribed: boolean;
	subscribedReportCount: number;
};

type HIDMediaControlServiceOptions = {
	deviceName?: string;
};

interface HIDMediaControlService {
	onConnectionChanged: ((state: ConnectionState) => void) | null;
	onNotifyError: ((error: Error) => void) | null;

	close(): void;
	getConnectionState(): ConnectionState;
	notifyUsage(usage: number): boolean;
}

const USAGE = Object.freeze({
	PLAY_PAUSE: 0x00cd,
	SCAN_NEXT_TRACK: 0x00b5,
	SCAN_PREVIOUS_TRACK: 0x00b6,
	VOLUME_UP: 0x00e9,
	VOLUME_DOWN: 0x00ea,
});

const USAGE_NAME: Readonly<Record<number, string>> = Object.freeze({
	[USAGE.PLAY_PAUSE]: "play-pause",
	[USAGE.SCAN_NEXT_TRACK]: "next-track",
	[USAGE.SCAN_PREVIOUS_TRACK]: "previous-track",
	[USAGE.VOLUME_UP]: "volume-up",
	[USAGE.VOLUME_DOWN]: "volume-down",
});

function getUsageName(usage: number): string {
	return USAGE_NAME[usage] ?? "unknown";
}

export type { ConnectionState, HIDMediaControlService, HIDMediaControlServiceOptions };
export { getUsageName, USAGE };
