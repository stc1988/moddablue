import { GATTServer } from "embedded:io/bluetoothle/peripheral";
import Timer from "timer";

const DEFAULT_DEVICE_NAME = "Vibe Watch #1";
const DEFAULT_MANUFACTURER_NAME = "VibeWatch";
const DEFAULT_MODEL_NUMBER = "VibeWatch";
const DEFAULT_FIRMWARE_REVISION = "v1.0";
const DEFAULT_VENDOR_ID_SOURCE = 0x01;
const DEFAULT_VENDOR_ID = 0x303a;
const DEFAULT_PRODUCT_ID = 0x8360;
const DEFAULT_PRODUCT_VERSION = 0x0001;
const DEFAULT_BATTERY_LEVEL = 100;
const AD_FLAG_GENERAL_DISCOVERABLE = 0x02;
const AD_FLAG_BLE_ONLY = 0x04;
const AD_TYPE_APPEARANCE = 0x19;
const KEYBOARD_APPEARANCE = Uint8Array.of(0xc1, 0x03);
const JSON_RPC_CHANNEL = 2;
const REPORT_LENGTH = 63;
const CHUNK_LENGTH = 61;
const MAXIMUM_MESSAGE_LENGTH = 2048;
const NOTIFICATION_INTERVAL_MS = 12;

type CodexCharacteristic = object;

type CodexConnection = {
	notify(characteristic: unknown, value: ArrayBuffer, callback?: (error?: Error | number) => void): void;
	readonly remoteAddress?: string;
	vendorInput?: CodexCharacteristic;
	batterySubscribed?: boolean;
	receiveBytes?: number[];
};

type CodexControllerServerOptions = {
	autoAdvertise?: boolean;
	deviceName?: string;
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

type AgentStatus = {
	id: number;
	c?: number;
	b?: number;
	e?: number;
	s?: number;
};

type AmbientStatus = {
	ambient?: {
		c?: number;
		b?: number;
		e?: number;
		s?: number;
	};
};

type OutboundNotification = {
	connection: CodexConnection;
	characteristic: CodexCharacteristic;
	report: Uint8Array;
};

type ConnectionHandler = ((state: ConnectionState) => void) | null;
type AgentStatusHandler = ((status: AgentStatus[]) => void) | null;
type AmbientStatusHandler = ((status: AmbientStatus) => void) | null;
type FocusedAppHandler = ((appName: string) => void) | null;
type NotifyErrorHandler = ((error: Error) => void) | null;

const reportMap = Uint8Array.of(
	0x05,
	0x01,
	0x09,
	0x06,
	0xa1,
	0x01,
	0x85,
	0x01,
	0x05,
	0x07,
	0x19,
	0xe0,
	0x29,
	0xe7,
	0x15,
	0x00,
	0x25,
	0x01,
	0x75,
	0x01,
	0x95,
	0x08,
	0x81,
	0x02,
	0x95,
	0x01,
	0x75,
	0x08,
	0x81,
	0x01,
	0x95,
	0x06,
	0x75,
	0x08,
	0x15,
	0x00,
	0x25,
	0xa4,
	0x05,
	0x07,
	0x19,
	0x00,
	0x29,
	0xa4,
	0x81,
	0x00,
	0xc0,
	0x05,
	0x0c,
	0x09,
	0x01,
	0xa1,
	0x01,
	0x85,
	0x02,
	0x75,
	0x10,
	0x95,
	0x01,
	0x15,
	0x00,
	0x26,
	0xff,
	0x07,
	0x19,
	0x00,
	0x2a,
	0xff,
	0x07,
	0x81,
	0x00,
	0xc0,
	0x05,
	0x01,
	0x09,
	0x02,
	0xa1,
	0x01,
	0x85,
	0x03,
	0x09,
	0x01,
	0xa1,
	0x00,
	0x05,
	0x09,
	0x19,
	0x01,
	0x29,
	0x05,
	0x15,
	0x00,
	0x25,
	0x01,
	0x95,
	0x05,
	0x75,
	0x01,
	0x81,
	0x02,
	0x95,
	0x01,
	0x75,
	0x03,
	0x81,
	0x01,
	0x05,
	0x01,
	0x09,
	0x30,
	0x09,
	0x31,
	0x15,
	0x81,
	0x25,
	0x7f,
	0x95,
	0x02,
	0x75,
	0x08,
	0x81,
	0x06,
	0x09,
	0x38,
	0x15,
	0x81,
	0x25,
	0x7f,
	0x95,
	0x01,
	0x75,
	0x08,
	0x81,
	0x06,
	0x05,
	0x0c,
	0x0a,
	0x38,
	0x02,
	0x15,
	0x81,
	0x25,
	0x7f,
	0x95,
	0x01,
	0x75,
	0x08,
	0x81,
	0x06,
	0xc0,
	0xc0,
	0x06,
	0x00,
	0xff,
	0x09,
	0x01,
	0xa1,
	0x01,
	0x85,
	0x06,
	0x09,
	0x02,
	0x15,
	0x00,
	0x26,
	0xff,
	0x00,
	0x75,
	0x08,
	0x95,
	0x3f,
	0x81,
	0x02,
	0x09,
	0x03,
	0x15,
	0x00,
	0x26,
	0xff,
	0x00,
	0x75,
	0x08,
	0x95,
	0x3f,
	0x91,
	0x02,
	0x09,
	0x04,
	0x15,
	0x00,
	0x26,
	0xff,
	0x00,
	0x75,
	0x08,
	0x95,
	0x3f,
	0xb1,
	0x02,
	0xc0,
);

const emptyKeyboardReport = new Uint8Array(8);
const emptyConsumerReport = new Uint8Array(2);
const emptyPointerReport = new Uint8Array(5);
const emptyVendorReport = new Uint8Array(REPORT_LENGTH);

function reportReference(reportId: number, reportType: 1 | 2 | 3) {
	return [{ uuid: "2908", value: Uint8Array.of(reportId, reportType) }];
}

function connectionLabel(connection: CodexConnection): string {
	return connection.remoteAddress ?? "unknown";
}

function completeJSONMessageLength(bytes: number[]): number {
	let depth = 0;
	let escaped = false;
	let inString = false;
	for (let index = 0; index < bytes.length; index++) {
		const byte = bytes[index];
		if (inString) {
			if (escaped) escaped = false;
			else if (byte === 0x5c) escaped = true;
			else if (byte === 0x22) inString = false;
			continue;
		}
		if (byte === 0x22) inString = true;
		else if (byte === 0x7b || byte === 0x5b) depth++;
		else if (byte === 0x7d || byte === 0x5d) {
			depth--;
			if (depth === 0) return index + 1;
		}
	}
	return 0;
}

class HIDCodexControllerServer {
	#connections: CodexConnection[] = [];
	#advertising = false;
	#advertisingRequested: boolean;
	#deviceName: string;
	#server?: GATTServer;
	#batteryLevel: number;
	#batteryLevelCharacteristic?: CodexCharacteristic;
	#outbound: OutboundNotification[] = [];
	#senderTimer?: ReturnType<typeof Timer.repeat>;
	onConnectionChanged: ConnectionHandler = null;
	onAgentStatus: AgentStatusHandler = null;
	onAmbientStatus: AmbientStatusHandler = null;
	onFocusedApp: FocusedAppHandler = null;
	onNotifyError: NotifyErrorHandler = null;

	constructor(options: CodexControllerServerOptions = {}) {
		const deviceName = options.deviceName ?? DEFAULT_DEVICE_NAME;
		const batteryLevel = options.batteryLevel ?? DEFAULT_BATTERY_LEVEL;
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
		this.#batteryLevel = batteryLevel;

		const controller = this;
		const vendorInput = {
			uuid: "2a4d",
			properties: GATTServer.properties.readEncrypted | GATTServer.properties.subscribeEncrypted,
			onRead() {
				return emptyVendorReport;
			},
			onSubscribe(connection: CodexConnection) {
				connection.vendorInput = this;
				trace(`[moddablue/hid/codex] subscribed report=vendor-input id=6 peer=${connectionLabel(connection)}\n`);
				controller.#emitConnectionChanged();
			},
			onUnsubscribe(characteristicOrConnection: CodexCharacteristic, connection?: CodexConnection) {
				const targetConnection = connection ?? (characteristicOrConnection as CodexConnection);
				delete targetConnection.vendorInput;
				controller.#outbound = controller.#outbound.filter((item) => item.connection !== targetConnection);
				trace(
					`[moddablue/hid/codex] unsubscribed report=vendor-input id=6 peer=${connectionLabel(targetConnection)}\n`,
				);
				controller.#emitConnectionChanged();
			},
			descriptors: reportReference(6, 1),
		};
		const vendorOutput = {
			uuid: "2a4d",
			properties:
				GATTServer.properties.readEncrypted |
				GATTServer.properties.writeEncrypted |
				GATTServer.properties.writeWithOutResponse,
			onRead() {
				return emptyVendorReport;
			},
			onWrite(value: ArrayBuffer, connection: CodexConnection) {
				controller.#receiveReport(connection, value);
			},
			descriptors: reportReference(6, 2),
		};
		const batteryLevelCharacteristic = {
			uuid: "2a19",
			properties: GATTServer.properties.readEncrypted | GATTServer.properties.subscribeEncrypted,
			onRead() {
				return Uint8Array.of(controller.#batteryLevel);
			},
			onSubscribe(connection: CodexConnection) {
				connection.batterySubscribed = true;
				trace(`[moddablue/hid/codex] subscribed report=battery peer=${connectionLabel(connection)}\n`);
			},
			onUnsubscribe(characteristicOrConnection: CodexCharacteristic, connection?: CodexConnection) {
				const targetConnection = connection ?? (characteristicOrConnection as CodexConnection);
				targetConnection.batterySubscribed = false;
				trace(`[moddablue/hid/codex] unsubscribed report=battery peer=${connectionLabel(targetConnection)}\n`);
			},
			descriptors: [
				{
					uuid: "2904",
					value: Uint8Array.of(0x04, 0x00, 0xad, 0x27, 0x01, 0x00, 0x00),
				},
			],
		};
		this.#batteryLevelCharacteristic = batteryLevelCharacteristic;
		const protocolMode = Uint8Array.of(1);

		this.#server = new GATTServer({
			mtu: 128,
			security: { bond: true, immediate: true, ioCapabilities: "none" },
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
							uuid: "2a01",
							properties: GATTServer.properties.read,
							value: KEYBOARD_APPEARANCE,
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
							uuid: "2a50",
							properties: GATTServer.properties.read,
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
				{ uuid: "180f", characteristics: [batteryLevelCharacteristic] },
				{
					uuid: "1812",
					characteristics: [
						{
							uuid: "2a4a",
							properties: GATTServer.properties.read,
							value: Uint8Array.of(0x11, 0x01, 0x00, 0x01),
						},
						{
							uuid: "2a4b",
							properties: GATTServer.properties.read,
							value: reportMap,
						},
						{
							uuid: "2a4c",
							properties: GATTServer.properties.writeWithOutResponse,
							onWrite() {},
						},
						{
							uuid: "2a4e",
							properties: GATTServer.properties.read | GATTServer.properties.writeWithOutResponse,
							onRead() {
								return protocolMode;
							},
							onWrite(value: ArrayBuffer) {
								protocolMode[0] = new Uint8Array(value)[0] ? 1 : 0;
							},
						},
						{
							uuid: "2a4d",
							properties: GATTServer.properties.readEncrypted | GATTServer.properties.subscribeEncrypted,
							onRead() {
								return emptyKeyboardReport;
							},
							onSubscribe(connection: CodexConnection) {
								trace(`[moddablue/hid/codex] subscribed report=keyboard id=1 peer=${connectionLabel(connection)}\n`);
							},
							onUnsubscribe(connection: CodexConnection) {
								trace(`[moddablue/hid/codex] unsubscribed report=keyboard id=1 peer=${connectionLabel(connection)}\n`);
							},
							descriptors: reportReference(1, 1),
						},
						{
							uuid: "2a4d",
							properties: GATTServer.properties.readEncrypted | GATTServer.properties.subscribeEncrypted,
							onRead() {
								return emptyConsumerReport;
							},
							onSubscribe(connection: CodexConnection) {
								trace(`[moddablue/hid/codex] subscribed report=consumer id=2 peer=${connectionLabel(connection)}\n`);
							},
							onUnsubscribe(connection: CodexConnection) {
								trace(`[moddablue/hid/codex] unsubscribed report=consumer id=2 peer=${connectionLabel(connection)}\n`);
							},
							descriptors: reportReference(2, 1),
						},
						{
							uuid: "2a4d",
							properties: GATTServer.properties.readEncrypted | GATTServer.properties.subscribeEncrypted,
							onRead() {
								return emptyPointerReport;
							},
							onSubscribe(connection: CodexConnection) {
								trace(`[moddablue/hid/codex] subscribed report=pointer id=3 peer=${connectionLabel(connection)}\n`);
							},
							onUnsubscribe(connection: CodexConnection) {
								trace(`[moddablue/hid/codex] unsubscribed report=pointer id=3 peer=${connectionLabel(connection)}\n`);
							},
							descriptors: reportReference(3, 1),
						},
						vendorInput,
						vendorOutput,
						{
							uuid: "2a4d",
							properties: GATTServer.properties.readEncrypted | GATTServer.properties.writeEncrypted,
							onRead() {
								return emptyVendorReport;
							},
							onWrite() {},
							descriptors: reportReference(6, 3),
						},
					],
				},
			],
			onReady() {
				controller.#server = this;
				trace(`[moddablue/hid/codex] ready device=${controller.#deviceName}\n`);
				if (controller.#advertisingRequested) controller.startAdvertising();
			},
			onConnect(connection: CodexConnection) {
				controller.#advertising = false;
				connection.receiveBytes = [];
				controller.#connections.push(connection);
				trace(`[moddablue/hid/codex] connected peer=${connectionLabel(connection)}\n`);
				controller.#emitConnectionChanged();
			},
			onDisconnect(connection: CodexConnection) {
				controller.#connections = controller.#connections.filter((item) => item !== connection);
				controller.#outbound = controller.#outbound.filter((item) => item.connection !== connection);
				trace(`[moddablue/hid/codex] disconnected peer=${connectionLabel(connection)}\n`);
				if (controller.#connections.length === 0 && controller.#advertisingRequested) controller.startAdvertising();
				controller.#emitConnectionChanged();
			},
			onSecured(connection: CodexConnection, state) {
				trace(
					`[moddablue/hid/codex] secured peer=${connectionLabel(connection)} encrypted=${state.encrypted} bonded=${state.bonded} keySize=${state.keySize}\n`,
				);
			},
			onWarning(message) {
				trace(`[moddablue/hid/codex] BLE warning: ${message}\n`);
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
			[AD_TYPE_APPEARANCE]: KEYBOARD_APPEARANCE,
			...(ArrayBuffer.fromString(this.#deviceName).byteLength <= 18 ? { name: this.#deviceName } : {}),
		};
		const scanResponse =
			ArrayBuffer.fromString(this.#deviceName).byteLength > 18 ? { name: this.#deviceName } : undefined;
		if (scanResponse) server.startAdvertising(advertisement, scanResponse);
		else server.startAdvertising(advertisement);
		this.#advertising = true;
		trace(`[moddablue/hid/codex] advertising started name=${this.#deviceName}\n`);
		return true;
	}

	stopAdvertising(): boolean {
		this.#advertisingRequested = false;
		if (!this.#server) return false;
		this.#server.stopAdvertising();
		this.#advertising = false;
		trace("[moddablue/hid/codex] advertising stopped\n");
		return true;
	}

	isAdvertising(): boolean {
		return this.#advertising;
	}

	getConnectionState(): ConnectionState {
		let subscribedReportCount = 0;
		for (const connection of this.#connections) {
			if (connection.vendorInput) subscribedReportCount++;
		}
		return {
			connected: this.#connections.length > 0,
			connectionCount: this.#connections.length,
			subscribed: subscribedReportCount > 0,
			subscribedReportCount,
		};
	}

	sendAgent(index: number, pressed: boolean): boolean {
		if (!Number.isInteger(index) || index < 0 || index > 5) throw new RangeError("index must be from 0 to 5.");
		return this.#sendKey(`AG${index.toString().padStart(2, "0")}`, pressed);
	}

	sendAction(index: number, pressed: boolean): boolean {
		if (!Number.isInteger(index) || index < 0 || index > 99) throw new RangeError("index must be from 0 to 99.");
		return this.#sendKey(`ACT${index.toString().padStart(2, "0")}`, pressed);
	}

	sendMicrophone(pressed: boolean): boolean {
		const first = this.sendAction(10, pressed);
		const second = this.sendAction(11, pressed);
		return first || second;
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
		for (const connection of this.#connections) {
			if (connection.batterySubscribed) this.#notify(connection, characteristic, Uint8Array.of(level).buffer);
		}
	}

	close(): void {
		this.#advertisingRequested = false;
		this.#advertising = false;
		this.#stopSender();
		this.#outbound.length = 0;
		this.#connections.length = 0;
		this.#server?.close();
		this.#server = undefined;
		this.#emitConnectionChanged();
	}

	#sendKey(key: string, pressed: boolean): boolean {
		return this.#sendMessage({
			m: "v.oai.hid",
			p: { k: key, act: pressed ? 1 : 0 },
		});
	}

	#sendMessage(message: unknown): boolean {
		const json = JSON.stringify(message);
		const payload = new Uint8Array(ArrayBuffer.fromString(`${json}\r\n`));
		let queued = false;
		for (const connection of this.#connections) {
			const characteristic = connection.vendorInput;
			if (!characteristic) continue;
			for (let offset = 0; offset < payload.length; offset += CHUNK_LENGTH) {
				const length = Math.min(CHUNK_LENGTH, payload.length - offset);
				const report = new Uint8Array(REPORT_LENGTH);
				report[0] = JSON_RPC_CHANNEL;
				report[1] = length;
				report.set(payload.subarray(offset, offset + length), 2);
				this.#outbound.push({ connection, characteristic, report });
				queued = true;
			}
		}
		if (queued) {
			trace("[moddablue/hid/codex] sending RPC message: ", json, "\n");
			this.#startSender();
		}
		return queued;
	}

	#receiveReport(connection: CodexConnection, value: ArrayBuffer) {
		const report = new Uint8Array(value);
		if (report.length < 2 || report[0] !== JSON_RPC_CHANNEL) return;
		const length = report[1];
		if (length > CHUNK_LENGTH || length > report.length - 2) {
			connection.receiveBytes = [];
			return;
		}
		if (!connection.receiveBytes) connection.receiveBytes = [];
		const receiveBytes = connection.receiveBytes;
		if (receiveBytes.length + length > MAXIMUM_MESSAGE_LENGTH) {
			receiveBytes.length = 0;
			return;
		}
		for (let index = 0; index < length; index++) receiveBytes.push(report[index + 2]);

		for (;;) {
			while (receiveBytes.length && (receiveBytes[0] === 0x0d || receiveBytes[0] === 0x0a)) receiveBytes.shift();
			const messageLength = completeJSONMessageLength(receiveBytes);
			if (!messageLength) return;
			const messageBytes = receiveBytes.splice(0, messageLength);
			const message = String.fromArrayBuffer(Uint8Array.from(messageBytes).buffer);
			let request: unknown;
			try {
				request = JSON.parse(message);
			} catch {
				trace("[moddablue/hid/codex] discarded malformed RPC message\n");
				continue;
			}
			if (!request || typeof request !== "object" || Array.isArray(request)) {
				trace("[moddablue/hid/codex] discarded non-object RPC message\n");
				continue;
			}
			trace("[moddablue/hid/codex] received RPC message: ", message, "\n");
			this.#dispatch(request as Record<string, unknown>);
		}
	}

	#dispatch(request: Record<string, unknown>) {
		const method = (request.method ?? request.m ?? "") as string;
		const parameters = request.params ?? request.p;
		switch (method) {
			case "v.oai.thstatus":
				if (Array.isArray(parameters)) this.onAgentStatus?.(parameters as AgentStatus[]);
				break;
			case "v.oai.rgbcfg":
				this.onAmbientStatus?.((parameters ?? {}) as AmbientStatus);
				break;
			case "host.focused_app":
				this.onFocusedApp?.(((parameters as { appName?: string })?.appName ?? "") as string);
				break;
		}

		const id = request.id ?? request.i;
		if (id === undefined || !method) return;
		let result: Record<string, unknown> = { ok: 1 };
		if (method === "device.status") {
			result = {
				version: DEFAULT_FIRMWARE_REVISION,
				profile_index: 0,
				layer_index: 1,
				battery: this.#batteryLevel,
				is_charging: false,
			};
		} else if (method === "sys.version") {
			result = { version: DEFAULT_FIRMWARE_REVISION };
		}
		this.#sendMessage({ id, method, result });
	}

	#startSender() {
		if (this.#senderTimer) return;
		this.#senderTimer = Timer.repeat(() => {
			const item = this.#outbound.shift();
			if (!item) {
				this.#stopSender();
				return;
			}
			if (this.#connections.includes(item.connection) && item.connection.vendorInput === item.characteristic) {
				this.#notify(item.connection, item.characteristic, item.report.buffer as ArrayBuffer);
			}
		}, NOTIFICATION_INTERVAL_MS);
	}

	#stopSender() {
		if (!this.#senderTimer) return;
		Timer.clear(this.#senderTimer);
		this.#senderTimer = undefined;
	}

	#notify(connection: CodexConnection, characteristic: CodexCharacteristic, value: ArrayBuffer) {
		connection.notify(characteristic, value, (error?: Error | number) => {
			if (!error) return;
			const notifyError = error instanceof Error ? error : new Error(`BLE notify failed with code ${error}`);
			trace(`[moddablue/hid/codex] notify failed: ${notifyError.message}\n`);
			this.onNotifyError?.(notifyError);
		});
	}

	#emitConnectionChanged() {
		this.onConnectionChanged?.(this.getConnectionState());
	}
}

export type { AgentStatus, AmbientStatus, CodexControllerServerOptions, ConnectionState };
export default HIDCodexControllerServer;
