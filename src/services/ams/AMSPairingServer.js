// @ts-nocheck
import { GATTServer } from "embedded:io/bluetoothle/peripheral";

const DEFAULT_DEVICE_NAME = "AMS Client";
const DEFAULT_ADVERTISED_DEVICE_NAME = "AMS";
const DEFAULT_BATTERY_LEVEL = 100;
const AMS_SERVICE_UUID = "89d3502b-0f36-433a-8ef4-c502ad55f8dc";
const BATTERY_SERVICE_UUID = "180f";
const BATTERY_LEVEL_CHARACTERISTIC_UUID = "2a19";
const AD_FLAGS_GENERAL_DISCOVERABLE_BLE_ONLY = 6;
const AD_TYPE_SOLICIT_UUID128 = 0x15;
const AMS_SOLICIT_UUID128 = Uint8Array.of(
	0xdc,
	0xf8,
	0x55,
	0xad,
	0x02,
	0xc5,
	0xf4,
	0x8e,
	0x3a,
	0x43,
	0x36,
	0x0f,
	0x2b,
	0x50,
	0xd3,
	0x89,
);

class AMSPairingServer {
	#server;
	#onPaired;
	#advertisedDeviceName;
	#pairingSecured = false;
	#peerAddress;

	constructor(options = {}) {
		const deviceName = options.deviceName ?? DEFAULT_DEVICE_NAME;
		const batteryLevel = options.batteryLevel ?? DEFAULT_BATTERY_LEVEL;
		this.#advertisedDeviceName = options.advertisedDeviceName ?? DEFAULT_ADVERTISED_DEVICE_NAME;
		this.#onPaired = options.onPaired;

		const pairingServer = this;
		this.#server = new GATTServer({
			security: {
				bond: true,
				ioCapabilities: "none",
				immediate: true,
			},
			services: [
				{
					uuid: "1800",
					characteristics: [
						{
							uuid: "2a00",
							properties: GATTServer.properties.read,
							value: ArrayBuffer.fromString(deviceName),
						},
					],
				},
				{
					uuid: BATTERY_SERVICE_UUID,
					characteristics: [
						{
							uuid: BATTERY_LEVEL_CHARACTERISTIC_UUID,
							properties: GATTServer.properties.readEncrypted,
							onRead() {
								trace("[ams/server] encrypted battery read\n");
								return Uint8Array.of(batteryLevel);
							},
						},
					],
				},
			],
			onReady() {
				pairingServer.#startAdvertising();
			},
			onConnect(connection) {
				pairingServer.#peerAddress = connection.remoteAddress;
				this.stopAdvertising();
			},
			onDisconnect() {
				if (pairingServer.#pairingSecured) {
					pairingServer.#stopAdvertising();
					pairingServer.#onPaired?.(pairingServer.#peerAddress);
				} else {
					pairingServer.#peerAddress = undefined;
					pairingServer.#startAdvertising();
				}
			},
			onSecured(connection, state) {
				trace(
					`[ams/server] secured encrypted=${state.encrypted} authenticated=${state.authenticated} bonded=${state.bonded}\n`,
				);
				pairingServer.#finishPairing(connection);
			},
			onWarning(message) {
				trace(`[ams/server] BLE warning: ${message}\n`);
			},
		});
	}

	#startAdvertising() {
		trace(`[ams/server] advertising ${AMS_SERVICE_UUID}\n`);
		this.#server.startAdvertising({
			flags: AD_FLAGS_GENERAL_DISCOVERABLE_BLE_ONLY,
			name: this.#advertisedDeviceName,
			services: [BATTERY_SERVICE_UUID],
			[AD_TYPE_SOLICIT_UUID128]: AMS_SOLICIT_UUID128,
		});
	}

	#finishPairing(connection) {
		this.#pairingSecured = true;
		this.#peerAddress = connection.remoteAddress;

		try {
			connection.disconnect();
		} catch (error) {
			trace(`[ams/server] pairing disconnect warning: ${error}\n`);
		}

		this.#stopAdvertising();
	}

	#stopAdvertising() {
		try {
			this.#server.stopAdvertising();
		} catch (error) {
			trace(`[ams/server] stop advertising warning: ${error}\n`);
		}
	}
}

export default AMSPairingServer;
