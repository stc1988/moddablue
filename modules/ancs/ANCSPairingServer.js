// @ts-nocheck
import { GATTServer } from "embedded:io/bluetoothle/peripheral";
import Timer from "timer";

const ANCS_SOLICIT_UUID128 = Uint8Array.of(
	0xd0,
	0x00,
	0x2d,
	0x12,
	0x1e,
	0x4b,
	0x0f,
	0xa4,
	0x99,
	0x4e,
	0xce,
	0xb5,
	0x31,
	0xf4,
	0x05,
	0x79,
);
const BATTERY_SERVICE_UUID = "180f";
const BATTERY_LEVEL_CHARACTERISTIC_UUID = "2a19";

class ANCSPairingServer {
	#server;
	#secured = false;
	#address;
	#transitioning = false;

	constructor(options = {}) {
		const pairingServer = this;
		this.onPaired = options.onPaired;
		this.#server = new GATTServer({
			security: { bond: true, ioCapabilities: "none", immediate: true },
			services: [
				{
					uuid: "1800",
					characteristics: [
						{
							uuid: "2a00",
							properties: GATTServer.properties.read,
							value: ArrayBuffer.fromString(options.deviceName ?? "Moddable ANCS"),
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
								return Uint8Array.of(100);
							},
						},
					],
				},
			],
			onReady() {
				pairingServer.#advertise();
			},
			onConnect(connection) {
				pairingServer.#address = connection.remoteAddress;
				this.stopAdvertising();
			},
			onSecured(connection, state) {
				pairingServer.#secured = state.encrypted && state.bonded;
				pairingServer.#address = connection.remoteAddress;
				trace(
					`[ancs/server] secured encrypted=${state.encrypted} authenticated=${state.authenticated} bonded=${state.bonded}\n`,
				);
				connection.disconnect();
			},
			onDisconnect() {
				if (pairingServer.#secured) pairingServer.#finishPairing();
				else pairingServer.#advertise();
			},
			onWarning(message) {
				trace(`[ancs/server] ${message}\n`);
			},
		});
	}

	#finishPairing() {
		if (this.#transitioning) return;
		this.#transitioning = true;
		const address = this.#address;

		// Return from NimBLE's disconnect callback before constructing the
		// central. Keep the stopped peripheral alive: GATTServer.close() shuts
		// down the shared NimBLE host and can reset an active GATTClient later.
		Timer.set(() => {
			trace("[ancs/server] starting ANCS central\n");
			this.onPaired?.(address);
		}, 250);
	}

	#advertise() {
		this.#server.startAdvertising({
			flags: 6,
			name: "ANCS",
			services: [BATTERY_SERVICE_UUID],
			21: ANCS_SOLICIT_UUID128,
		});
	}
}

export default ANCSPairingServer;
