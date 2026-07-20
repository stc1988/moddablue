import { GATTServer } from "embedded:io/bluetoothle/peripheral";
import Timer from "timer";

const DEFAULT_DEVICE_NAME = "BLE Media Control";
const DEFAULT_MANUFACTURER_NAME = "Moddablue";
const DEFAULT_MODEL_NUMBER = "BLE HID Media Control";
const DEFAULT_FIRMWARE_REVISION = "1.0.0";
const DEFAULT_VENDOR_ID_SOURCE = 0x02;
const DEFAULT_VENDOR_ID = 0x16c0;
const DEFAULT_PRODUCT_ID = 0x05df;
const DEFAULT_PRODUCT_VERSION = 0x0100;
const DEFAULT_RELEASE_DELAY_MS = 20;
const DEFAULT_BATTERY_LEVEL = 100;
const AD_FLAG_GENERAL_DISCOVERABLE = 0x02;
const AD_FLAG_BLE_ONLY = 0x04;
const AD_TYPE_APPEARANCE = 0x19;
const REMOTE_CONTROL_APPEARANCE = Uint8Array.of(0x80, 0x01);
const MAX_CONSUMER_CONTROL_USAGE = 0x03ff;

type MediaControlCharacteristic = object;

type MediaControlConnection = {
	notify(characteristic: unknown, value: ArrayBuffer, callback?: (error?: Error | number) => void): void;
	subscribedReports?: MediaControlCharacteristic[];
	batterySubscribed?: boolean;
	releaseTimer?: ReturnType<typeof Timer.set>;
};

type HIDMediaControlServerOptions = {
	autoAdvertise?: boolean;
	deviceName?: string;
	releaseDelayMs?: number;
	batteryLevel?: number;
	manufacturerName?: string;
	modelNumber?: string;
	firmwareRevision?: string;
	vendorIdSource?: 1 | 2;
	vendorId?: number;
	productId?: number;
	productVersion?: number;
};

type ConnectionState = {
	connected: boolean;
	connectionCount: number;
	subscribed: boolean;
	subscribedReportCount: number;
};

type ConnectionHandler = ((state: ConnectionState) => void) | null;
type NotifyErrorHandler = ((error: Error) => void) | null;

const USAGE = {
	PLAY: 0x00b0,
	PAUSE: 0x00b1,
	RECORD: 0x00b2,
	FAST_FORWARD: 0x00b3,
	REWIND: 0x00b4,
	SCAN_NEXT_TRACK: 0x00b5,
	SCAN_PREVIOUS_TRACK: 0x00b6,
	STOP: 0x00b7,
	EJECT: 0x00b8,
	RANDOM_PLAY: 0x00b9,
	PLAY_PAUSE: 0x00cd,
	MUTE: 0x00e2,
	VOLUME_UP: 0x00e9,
	VOLUME_DOWN: 0x00ea,
} as const;
Object.freeze(USAGE);

const USAGE_NAME: Readonly<Record<number, string>> = Object.freeze({
	[USAGE.PLAY]: "play",
	[USAGE.PAUSE]: "pause",
	[USAGE.RECORD]: "record",
	[USAGE.FAST_FORWARD]: "fast-forward",
	[USAGE.REWIND]: "rewind",
	[USAGE.SCAN_NEXT_TRACK]: "next-track",
	[USAGE.SCAN_PREVIOUS_TRACK]: "previous-track",
	[USAGE.STOP]: "stop",
	[USAGE.EJECT]: "eject",
	[USAGE.RANDOM_PLAY]: "random-play",
	[USAGE.PLAY_PAUSE]: "play-pause",
	[USAGE.MUTE]: "mute",
	[USAGE.VOLUME_UP]: "volume-up",
	[USAGE.VOLUME_DOWN]: "volume-down",
});

function getUsageName(usage: number): string {
	return USAGE_NAME[usage] ?? "unknown";
}

type ConsumerControlUsage = (typeof USAGE)[keyof typeof USAGE] | number;

const mediaControlReportMap = Uint8Array.of(
	0x05,
	0x0c, // Usage Page (Consumer)
	0x09,
	0x01, // Usage (Consumer Control)
	0xa1,
	0x01, // Collection (Application)
	0x85,
	0x01, // Report ID (1)
	0x15,
	0x00, // Logical Minimum (0)
	0x26,
	0xff,
	0x03, // Logical Maximum (1023)
	0x19,
	0x00, // Usage Minimum (Unassigned)
	0x2a,
	0xff,
	0x03, // Usage Maximum (1023)
	0x75,
	0x10, // Report Size (16)
	0x95,
	0x01, // Report Count (1)
	0x81,
	0x00, // Input (Data, Array, Absolute)
	0xc0, // End Collection
);

const emptyMediaControlReport = Uint8Array.of(0, 0);

class HIDMediaControlServer {
	static USAGE = USAGE;

	#connections: MediaControlConnection[] = [];
	#advertising = false;
	#advertisingRequested: boolean;
	#deviceName: string;
	#releaseDelayMs: number;
	#server?: GATTServer;
	#batteryLevel: number;
	#batteryLevelCharacteristic?: MediaControlCharacteristic;
	onConnectionChanged: ConnectionHandler = null;
	onNotifyError: NotifyErrorHandler = null;

	constructor(options: HIDMediaControlServerOptions = {}) {
		const deviceName = options.deviceName ?? DEFAULT_DEVICE_NAME;
		const batteryLevel = options.batteryLevel ?? DEFAULT_BATTERY_LEVEL;
		const releaseDelayMs = options.releaseDelayMs ?? DEFAULT_RELEASE_DELAY_MS;
		const manufacturerName = options.manufacturerName ?? DEFAULT_MANUFACTURER_NAME;
		const modelNumber = options.modelNumber ?? DEFAULT_MODEL_NUMBER;
		const firmwareRevision = options.firmwareRevision ?? DEFAULT_FIRMWARE_REVISION;
		const vendorIdSource = options.vendorIdSource ?? DEFAULT_VENDOR_ID_SOURCE;
		const vendorId = options.vendorId ?? DEFAULT_VENDOR_ID;
		const productId = options.productId ?? DEFAULT_PRODUCT_ID;
		const productVersion = options.productVersion ?? DEFAULT_PRODUCT_VERSION;
		if (!Number.isInteger(batteryLevel) || batteryLevel < 0 || batteryLevel > 100) {
			throw new RangeError("batteryLevel must be an integer from 0 to 100.");
		}
		if (!Number.isInteger(releaseDelayMs) || releaseDelayMs < 0) {
			throw new RangeError("releaseDelayMs must be a non-negative integer.");
		}
		if (ArrayBuffer.fromString(deviceName).byteLength > 29) {
			throw new RangeError("deviceName must be at most 29 UTF-8 bytes.");
		}
		if (vendorIdSource !== 1 && vendorIdSource !== 2) {
			throw new RangeError("vendorIdSource must be 1 (Bluetooth SIG) or 2 (USB-IF).");
		}
		for (const [name, value] of [
			["vendorId", vendorId],
			["productId", productId],
			["productVersion", productVersion],
		] as const) {
			if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
				throw new RangeError(`${name} must be an integer from 0 through 65535.`);
			}
		}
		this.#advertisingRequested = options.autoAdvertise ?? true;
		this.#deviceName = deviceName;
		this.#releaseDelayMs = releaseDelayMs;
		this.#batteryLevel = batteryLevel;

		const mediaControl = this;
		const inputReport = {
			uuid: "2a4d",
			properties: GATTServer.properties.readEncrypted | GATTServer.properties.subscribeEncrypted,
			onRead() {
				return emptyMediaControlReport;
			},
			onSubscribe(connection: MediaControlConnection) {
				connection.subscribedReports ??= [];
				if (connection.subscribedReports.indexOf(this) < 0) {
					connection.subscribedReports.push(this);
				}
				trace("[moddablue/hid] media control input report subscribed\n");
				mediaControl.#emitConnectionChanged();
			},
			onUnsubscribe(characteristicOrConnection: MediaControlCharacteristic, connection?: MediaControlConnection) {
				// Current Moddable runtimes pass only the connection. The published typing
				// accidentally declares an extra first argument, so accept both shapes.
				const targetConnection = connection ?? (characteristicOrConnection as MediaControlConnection);
				targetConnection.subscribedReports = targetConnection.subscribedReports?.filter((item) => item !== this);
				trace("[moddablue/hid] media control input report unsubscribed\n");
				mediaControl.#emitConnectionChanged();
			},
			descriptors: [
				{
					// Report Reference: report ID 1, input report type.
					uuid: "2908",
					value: Uint8Array.of(1, 1),
				},
			],
		};
		const batteryLevelCharacteristic = {
			uuid: "2a19",
			properties: GATTServer.properties.readEncrypted | GATTServer.properties.subscribeEncrypted,
			onRead() {
				return Uint8Array.of(mediaControl.#batteryLevel);
			},
			onSubscribe(connection: MediaControlConnection) {
				connection.batterySubscribed = true;
			},
			onUnsubscribe(characteristicOrConnection: MediaControlCharacteristic, connection?: MediaControlConnection) {
				const targetConnection = connection ?? (characteristicOrConnection as MediaControlConnection);
				targetConnection.batterySubscribed = false;
			},
		};
		this.#batteryLevelCharacteristic = batteryLevelCharacteristic;
		const security = {
			bond: true,
			immediate: true,
			ioCapabilities: "none",
		} as const;

		this.#server = new GATTServer({
			mtu: 128,
			security,
			services: [
				{
					uuid: "1800",
					characteristics: [
						{
							uuid: "2a00",
							properties: GATTServer.properties.read,
							value: ArrayBuffer.fromString(deviceName),
						},
						{
							// Appearance 0x0180 identifies a generic remote control.
							uuid: "2a01",
							properties: GATTServer.properties.read,
							value: REMOTE_CONTROL_APPEARANCE,
						},
					],
				},
				{
					uuid: "180a",
					characteristics: [
						{
							uuid: "2a29",
							properties: GATTServer.properties.read,
							value: ArrayBuffer.fromString(manufacturerName),
						},
						{
							uuid: "2a24",
							properties: GATTServer.properties.read,
							value: ArrayBuffer.fromString(modelNumber),
						},
						{
							uuid: "2a26",
							properties: GATTServer.properties.read,
							value: ArrayBuffer.fromString(firmwareRevision),
						},
						{
							// PnP ID: mandatory device identity for a HOGP Report Host.
							uuid: "2a50",
							properties: GATTServer.properties.readEncrypted,
							value: Uint8Array.of(
								vendorIdSource,
								vendorId & 0xff,
								vendorId >> 8,
								productId & 0xff,
								productId >> 8,
								productVersion & 0xff,
								productVersion >> 8,
							),
						},
					],
				},
				{
					uuid: "180f",
					characteristics: [batteryLevelCharacteristic],
				},
				{
					uuid: "1812",
					characteristics: [
						{
							uuid: "2a4a",
							properties: GATTServer.properties.readEncrypted,
							value: Uint8Array.of(0x11, 0x01, 0x00, 0x03),
						},
						{
							uuid: "2a4b",
							properties: GATTServer.properties.readEncrypted,
							value: mediaControlReportMap,
						},
						{
							uuid: "2a4c",
							properties: GATTServer.properties.writeWithOutResponse | GATTServer.properties.writeEncrypted,
							onWrite() {
								// The host may suspend or resume the device. No application power state is kept here.
							},
						},
						inputReport,
					],
				},
			],
			onReady() {
				trace("[moddablue/hid] media control ready\n");
				mediaControl.#server = this;
				if (mediaControl.#advertisingRequested) {
					mediaControl.startAdvertising();
				}
			},
			onConnect(connection: MediaControlConnection) {
				trace("[moddablue/hid] media control connected\n");
				mediaControl.#advertising = false;
				connection.subscribedReports = [];
				mediaControl.#connections.push(connection);
				mediaControl.#emitConnectionChanged();
			},
			onDisconnect(connection: MediaControlConnection) {
				trace("[moddablue/hid] media control disconnected\n");
				mediaControl.#clearReleaseTimer(connection);
				mediaControl.#connections = mediaControl.#connections.filter((item) => item !== connection);
				if (mediaControl.#connections.length === 0 && mediaControl.#advertisingRequested) {
					mediaControl.startAdvertising();
				}
				mediaControl.#emitConnectionChanged();
			},
			onSecured(_connection, state) {
				trace(
					`[moddablue/hid] media control secured encrypted=${state.encrypted} bonded=${state.bonded} keySize=${state.keySize}\n`,
				);
			},
			onWarning(message) {
				trace(`[moddablue/hid] BLE warning: ${message}\n`);
			},
		});
	}

	startAdvertising(): boolean {
		this.#advertisingRequested = true;
		const server = this.#server;
		if (!server) return false;

		const advertisement = {
			flags: AD_FLAG_GENERAL_DISCOVERABLE | AD_FLAG_BLE_ONLY,
			services: ["1812"],
			[AD_TYPE_APPEARANCE]: REMOTE_CONTROL_APPEARANCE,
			...(ArrayBuffer.fromString(this.#deviceName).byteLength <= 18 ? { name: this.#deviceName } : {}),
		};
		const scanResponse =
			ArrayBuffer.fromString(this.#deviceName).byteLength > 18 ? { name: this.#deviceName } : undefined;
		if (scanResponse) server.startAdvertising(advertisement, scanResponse);
		else server.startAdvertising(advertisement);
		this.#advertising = true;
		trace(
			`[moddablue/hid] media control advertising name="${this.#deviceName}" nameLocation=${scanResponse ? "scan-response" : "primary"}\n`,
		);
		return true;
	}

	stopAdvertising(): boolean {
		this.#advertisingRequested = false;
		const server = this.#server;
		if (!server) return false;

		server.stopAdvertising();
		this.#advertising = false;
		return true;
	}

	isAdvertising(): boolean {
		return this.#advertising;
	}

	notifyUsage(usage: ConsumerControlUsage): boolean {
		const notified = this.pressUsage(usage);
		if (!notified) return false;
		for (const connection of this.#connections) {
			if ((connection.subscribedReports?.length ?? 0) === 0) continue;
			connection.releaseTimer = Timer.set(() => {
				this.#sendReportToConnection(connection, emptyMediaControlReport, false);
				delete connection.releaseTimer;
			}, this.#releaseDelayMs);
		}
		trace(`[moddablue/hid] action=${getUsageName(usage)} usage=0x${usage.toString(16).padStart(4, "0")}\n`);
		return true;
	}

	pressUsage(usage: ConsumerControlUsage): boolean {
		if (!Number.isInteger(usage) || usage < 0 || usage > MAX_CONSUMER_CONTROL_USAGE) {
			throw new RangeError(`usage must be an integer from 0 through ${MAX_CONSUMER_CONTROL_USAGE}.`);
		}
		return this.#sendReport(Uint8Array.of(usage & 0xff, usage >> 8));
	}

	releaseAll(): boolean {
		return this.#sendReport(emptyMediaControlReport);
	}

	isConnected(): boolean {
		return this.#connections.length > 0;
	}

	hasSubscribedHost(): boolean {
		for (const connection of this.#connections) {
			if ((connection.subscribedReports?.length ?? 0) > 0) return true;
		}
		return false;
	}

	getConnectionState(): ConnectionState {
		let subscribedReportCount = 0;
		for (const connection of this.#connections) {
			subscribedReportCount += connection.subscribedReports?.length ?? 0;
		}
		return {
			connected: this.isConnected(),
			connectionCount: this.#connections.length,
			subscribed: subscribedReportCount > 0,
			subscribedReportCount,
		};
	}

	getBatteryLevel(): number {
		return this.#batteryLevel;
	}

	setBatteryLevel(level: number): void {
		if (!Number.isInteger(level) || level < 0 || level > 100) {
			throw new RangeError("Battery level must be an integer from 0 to 100.");
		}
		if (this.#batteryLevel === level) return;
		this.#batteryLevel = level;
		const characteristic = this.#batteryLevelCharacteristic;
		if (!characteristic) return;
		const value = Uint8Array.of(level);
		for (const connection of this.#connections) {
			if (!connection.batterySubscribed) continue;
			this.#notify(connection, characteristic, value.buffer);
		}
	}

	close(): void {
		this.#advertisingRequested = false;
		this.#advertising = false;
		for (const connection of this.#connections) {
			this.#clearReleaseTimer(connection);
		}
		this.#connections.length = 0;
		this.#server?.close();
		this.#server = undefined;
		this.#emitConnectionChanged();
	}

	#sendReport(report: Uint8Array): boolean {
		let notified = false;
		for (const connection of this.#connections) {
			if (this.#sendReportToConnection(connection, report)) {
				notified = true;
			}
		}
		return notified;
	}

	#sendReportToConnection(connection: MediaControlConnection, report: Uint8Array, clearReleaseTimer = true): boolean {
		const reports = connection.subscribedReports ?? [];
		if (reports.length === 0) return false;
		if (clearReleaseTimer) {
			this.#clearReleaseTimer(connection);
		}

		const reportBuffer = report.buffer as ArrayBuffer;
		for (const subscribedReport of reports) {
			this.#notify(connection, subscribedReport, reportBuffer);
		}
		return true;
	}

	#notify(connection: MediaControlConnection, characteristic: MediaControlCharacteristic, value: ArrayBuffer) {
		connection.notify(characteristic, value, (error?: Error | number) => {
			if (!error) return;
			const notifyError = error instanceof Error ? error : new Error(`BLE notify failed with code ${error}`);
			trace(`[moddablue/hid] notify failed: ${notifyError.message}\n`);
			this.onNotifyError?.(notifyError);
		});
	}

	#clearReleaseTimer(connection: MediaControlConnection) {
		if (!connection.releaseTimer) return;
		Timer.clear(connection.releaseTimer);
		delete connection.releaseTimer;
	}

	#emitConnectionChanged() {
		this.onConnectionChanged?.(this.getConnectionState());
	}
}

export { type ConnectionState, type ConsumerControlUsage, getUsageName, type HIDMediaControlServerOptions, USAGE };
export default HIDMediaControlServer;
