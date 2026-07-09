// @ts-nocheck
import { GATTClient } from "embedded:io/bluetoothle/central";
import TextDecoder from "text/decoder";
import Timer from "timer";

const GAP_SERVICE_UUID = "1800";
const DEVICE_NAME_CHARACTERISTIC_UUID = "2a00";
const AMS_SERVICE_UUID = "89d3502b-0f36-433a-8ef4-c502ad55f8dc";
const GATT_CLIENT_MTU = 185;
const ENTITY_ATTRIBUTE_READ_DELAY_MS = 50;
const ENTITY_ATTRIBUTE_READ_AFTER_WRITE_MS = 50;

const AMS_CHARACTERISTIC = Object.freeze({
	REMOTE_COMMAND: Object.freeze({
		field: "remoteCommand",
		name: "remote command",
		uuid: "9b3c81d8-57b1-4a8a-b8df-0e56f7ca51c2",
		subscribe: true,
	}),
	ENTITY_UPDATE: Object.freeze({
		field: "entityUpdate",
		name: "entity update",
		uuid: "2f7cabce-808d-411f-9a0c-bb92ba96c102",
		subscribe: true,
	}),
	ENTITY_ATTRIBUTE: Object.freeze({
		field: "entityAttribute",
		name: "entity attribute",
		uuid: "c6b2f38c-23ab-46d8-a6ab-a3a870bbd5d7",
		subscribe: false,
	}),
});
const REQUIRED_AMS_CHARACTERISTICS = Object.freeze([
	AMS_CHARACTERISTIC.REMOTE_COMMAND,
	AMS_CHARACTERISTIC.ENTITY_UPDATE,
	AMS_CHARACTERISTIC.ENTITY_ATTRIBUTE,
]);
const SUBSCRIBED_AMS_CHARACTERISTICS = Object.freeze([
	AMS_CHARACTERISTIC.REMOTE_COMMAND,
	AMS_CHARACTERISTIC.ENTITY_UPDATE,
]);
const AMS_CHARACTERISTIC_UUIDS = Object.freeze(
	REQUIRED_AMS_CHARACTERISTICS.map((characteristic) => characteristic.uuid),
);

const ENTITY_ID = Object.freeze({
	PLAYER: 0,
	QUEUE: 1,
	TRACK: 2,
});

const ENTITY_UPDATE_FLAGS = Object.freeze({
	TRUNCATED: 1 << 0,
});

const TRACK_ATTRIBUTE_ID = Object.freeze({
	ARTIST: 0,
	ALBUM: 1,
	TITLE: 2,
	DURATION: 3,
});

const PLAYER_ATTRIBUTE_ID = Object.freeze({
	NAME: 0,
	PLAYBACK_INFO: 1,
	VOLUME: 2,
});

const utf8Decoder = new TextDecoder();

const RemoteCommandID = Object.freeze({
	PLAY: 0,
	PAUSE: 1,
	TOGGLE_PLAY_PAUSE: 2,
	NEXT_TRACK: 3,
	PREVIOUS_TRACK: 4,
	VOLUME_UP: 5,
	VOLUME_DOWN: 6,
	ADVANCE_REPEAT_MODE: 7,
	ADVANCE_SHUFFLE_MODE: 8,
	SKIP_FORWARD: 9,
	SKIP_BACKWARD: 10,
	LIKE_TRACK: 11,
	DISLIKE_TRACK: 12,
	BOOKMARK_TRACK: 13,
});

class AMSClient {
	#gatt;
	#amsCharacteristics = {};
	#supportedRemoteCommands = new Uint8Array();
	#entityAttributeReads = [];
	#readingEntityAttribute = false;
	#entityAttributeReadTimer;
	#state = {
		player: {},
		playback: {},
		track: {},
	};

	constructor(delegate) {
		this.delegate = delegate;
	}

	get connected() {
		return this.#gatt !== undefined;
	}

	connect(address) {
		if (this.#gatt) return false;

		this.#resetConnectionState();
		const client = this;
		this.#gatt = new GATTClient({
			address,
			mtu: GATT_CLIENT_MTU,
			security: {
				bond: true,
				ioCapabilities: "none",
				immediate: true,
			},
			onReady() {
				trace(`[ams/client] connected ${address}\n`);
				client.delegate?.onAMSConnected?.(address);
			},
			onSecured(state) {
				trace(
					`[ams/client] secured encrypted=${state.encrypted} authenticated=${state.authenticated} bonded=${state.bonded}\n`,
				);
				client.#readDeviceName(this);
				client.#discoverAMS(this);
			},
			onReadable(count) {
				while (count--) {
					const value = this.read();
					if (!value) continue;

					if (value.handle === client.#amsCharacteristics.remoteCommand?.handle) {
						client.#supportedRemoteCommands = new Uint8Array(value);
						trace(`[ams/client] supported commands ${client.#supportedRemoteCommands.toHex()}\n`);
					} else if (value.handle === client.#amsCharacteristics.entityUpdate?.handle) {
						client.#handleEntityUpdate(value);
					}
				}
			},
			onError(error) {
				trace(`[ams/client] error: ${error}\n`);
				client.#resetConnectionState();
				client.delegate?.onAMSError?.(error);
			},
		});
		return true;
	}

	remoteCommand(command) {
		const characteristic = this.#amsCharacteristics.remoteCommand;
		if (!this.#gatt || !characteristic) return false;
		if (!this.#supportedRemoteCommands.includes(command)) return false;

		this.#gatt.write(characteristic, Uint8Array.of(command), { response: false }, (error) => {
			if (error) trace(`[ams/client] remote command ${command} failed: ${error}\n`);
			else trace(`[ams/client] remote command ${command} sent\n`);
		});
		return true;
	}

	sample() {
		return this.#state;
	}

	#readDeviceName(gatt) {
		gatt.getPrimaryServices([GAP_SERVICE_UUID], (serviceError, services) => {
			if (serviceError || services.length === 0) {
				trace(`[ams/client] GAP service not found: ${serviceError ?? "empty"}\n`);
				return;
			}

			gatt.getCharacteristics(
				services[0],
				[DEVICE_NAME_CHARACTERISTIC_UUID],
				(characteristicError, characteristics) => {
					if (characteristicError || characteristics.length === 0) {
						trace(`[ams/client] device name characteristic not found: ${characteristicError ?? "empty"}\n`);
						return;
					}

					gatt.read(characteristics[0], (readError, value) => {
						if (readError || !value) {
							trace(`[ams/client] device name read failed: ${readError ?? "empty"}\n`);
							return;
						}

						const name = decodeText(value, "device name");
						if (!name) return;

						trace(`[ams/client] device name ${name}\n`);
						this.#state.deviceName = name;
						this.delegate?.onAMSDeviceNameChanged?.(name);
					});
				},
			);
		});
	}

	#discoverAMS(gatt) {
		gatt.getPrimaryServices([AMS_SERVICE_UUID], (serviceError, services) => {
			if (serviceError || services.length === 0) {
				trace(`[ams/client] AMS service not found: ${serviceError ?? "empty"}\n`);
				this.delegate?.onAMSError?.(serviceError ?? "AMS service not found");
				return;
			}

			gatt.getCharacteristics(services[0], AMS_CHARACTERISTIC_UUIDS, (characteristicError, characteristics) => {
				if (characteristicError) {
					trace(`[ams/client] characteristic discovery failed: ${characteristicError}\n`);
					this.delegate?.onAMSError?.(characteristicError);
					return;
				}

				for (const characteristic of characteristics) {
					const definition = amsCharacteristicDefinition(characteristic.uuid);
					if (definition) this.#amsCharacteristics[definition.field] = characteristic;
				}

				this.#subscribeAMS(gatt);
			});
		});
	}

	#subscribeAMS(gatt) {
		const missing = this.#missingAMSCharacteristics();
		if (missing) {
			trace(`[ams/client] required AMS characteristics not found: ${missing}\n`);
			this.delegate?.onAMSError?.(`required AMS characteristics not found: ${missing}`);
			return;
		}

		this.#subscribeAMSCharacteristic(gatt, 0);
	}

	#missingAMSCharacteristics() {
		for (const definition of REQUIRED_AMS_CHARACTERISTICS) {
			if (!this.#amsCharacteristics[definition.field]) return definition.name;
		}
	}

	#subscribeAMSCharacteristic(gatt, index) {
		if (index >= SUBSCRIBED_AMS_CHARACTERISTICS.length) {
			this.#requestEntityUpdates(gatt);
			return;
		}

		const definition = SUBSCRIBED_AMS_CHARACTERISTICS[index];
		gatt.subscribe(this.#amsCharacteristics[definition.field], (error) => {
			if (error) {
				trace(`[ams/client] ${definition.name} subscribe failed: ${error}\n`);
				this.delegate?.onAMSError?.(error);
				return;
			}
			this.#subscribeAMSCharacteristic(gatt, index + 1);
		});
	}

	#requestEntityUpdates(gatt) {
		gatt.write(
			this.#amsCharacteristics.entityUpdate,
			Uint8Array.of(
				ENTITY_ID.TRACK,
				TRACK_ATTRIBUTE_ID.ARTIST,
				TRACK_ATTRIBUTE_ID.ALBUM,
				TRACK_ATTRIBUTE_ID.TITLE,
				TRACK_ATTRIBUTE_ID.DURATION,
			),
			{ response: false },
			(error) => {
				if (error) trace(`[ams/client] track update request failed: ${error}\n`);
			},
		);
		gatt.write(
			this.#amsCharacteristics.entityUpdate,
			Uint8Array.of(
				ENTITY_ID.PLAYER,
				PLAYER_ATTRIBUTE_ID.NAME,
				PLAYER_ATTRIBUTE_ID.PLAYBACK_INFO,
				PLAYER_ATTRIBUTE_ID.VOLUME,
			),
			{ response: false },
			(error) => {
				if (error) trace(`[ams/client] player update request failed: ${error}\n`);
			},
		);
	}

	#handleEntityUpdate(value) {
		const bytes = new Uint8Array(value);
		const entityID = bytes[0];
		const attributeID = bytes[1];
		const flags = bytes[2];
		const updateValue = decodeText(value.slice(3), `entity=${entityID} attribute=${attributeID}`);
		if (updateValue === undefined) return;

		if (ENTITY_ID.TRACK === entityID) {
			this.#updateTrack(attributeID, updateValue, flags);
		} else if (ENTITY_ID.PLAYER === entityID) {
			this.#updatePlayer(attributeID, updateValue, flags);
		}
	}

	#updatePlayer(attributeID, value, flags) {
		if (flags & ENTITY_UPDATE_FLAGS.TRUNCATED) {
			this.#readEntityAttribute(ENTITY_ID.PLAYER, attributeID, (error, fullValue) => {
				if (!error) this.#updatePlayer(attributeID, fullValue, 0);
			});
			return;
		}

		if (PLAYER_ATTRIBUTE_ID.NAME === attributeID) {
			this.#state.player.name = value;
		} else if (PLAYER_ATTRIBUTE_ID.PLAYBACK_INFO === attributeID) {
			const parts = value.split(",");
			this.#state.playback.state = Number(parts[0]);
			this.#state.playback.rate = Number(parts[1]);
			this.#state.playback.elapsed = Number(parts[2]);
		} else if (PLAYER_ATTRIBUTE_ID.VOLUME === attributeID) {
			this.#state.player.volume = Number(value);
		} else {
			return;
		}

		this.delegate?.onAMSStateChanged?.(this.#state);
	}

	#updateTrack(attributeID, value, flags, readFromAttribute = false) {
		if (!readFromAttribute && this.#shouldReadFullTrackAttribute(attributeID, flags)) {
			trace(
				`[ams/client] track ${trackAttributeName(attributeID)} notification ignored flags=${flags} value=${value}\n`,
			);
			this.#readEntityAttribute(ENTITY_ID.TRACK, attributeID, (error, fullValue) => {
				if (error) {
					trace(`[ams/client] track ${trackAttributeName(attributeID)} full read failed: ${error}\n`);
					if (flags & ENTITY_UPDATE_FLAGS.TRUNCATED) this.#updateTrack(attributeID, "", 0, true);
					return;
				}
				trace(`[ams/client] track ${trackAttributeName(attributeID)} full read value=${fullValue}\n`);
				if (flags & ENTITY_UPDATE_FLAGS.TRUNCATED) {
					trace(
						`[ams/client] track ${trackAttributeName(attributeID)} full read is partial because long GATT reads are unavailable\n`,
					);
				}
				this.#updateTrack(attributeID, fullValue, 0, true);
			});
			return;
		}

		if (TRACK_ATTRIBUTE_ID.ARTIST === attributeID) this.#state.track.artist = value;
		else if (TRACK_ATTRIBUTE_ID.ALBUM === attributeID) this.#state.track.album = value;
		else if (TRACK_ATTRIBUTE_ID.TITLE === attributeID) this.#state.track.title = value;
		else if (TRACK_ATTRIBUTE_ID.DURATION === attributeID) this.#state.track.duration = Number(value);
		else return;

		this.delegate?.onAMSStateChanged?.(this.#state);
	}

	#shouldReadFullTrackAttribute(attributeID, flags) {
		if (flags & ENTITY_UPDATE_FLAGS.TRUNCATED) return true;
		return (
			TRACK_ATTRIBUTE_ID.ARTIST === attributeID ||
			TRACK_ATTRIBUTE_ID.ALBUM === attributeID ||
			TRACK_ATTRIBUTE_ID.TITLE === attributeID
		);
	}

	#readEntityAttribute(entityID, attributeID, callback) {
		trace(`[ams/client] full read queued ${entityName(entityID)}.${attributeName(entityID, attributeID)}\n`);
		this.#entityAttributeReads.push({ entityID, attributeID, callback });
		this.#scheduleEntityAttributeRead();
	}

	#scheduleEntityAttributeRead() {
		if (this.#entityAttributeReadTimer) return;

		this.#entityAttributeReadTimer = Timer.set(() => {
			this.#entityAttributeReadTimer = undefined;
			this.#pumpEntityAttributeReads();
		}, ENTITY_ATTRIBUTE_READ_DELAY_MS);
	}

	#pumpEntityAttributeReads() {
		if (this.#readingEntityAttribute || this.#entityAttributeReads.length === 0) return;
		const characteristic = this.#amsCharacteristics.entityAttribute;
		if (!this.#gatt || !characteristic) return;

		this.#readingEntityAttribute = true;
		const request = this.#entityAttributeReads.shift();
		this.#gatt.write(
			characteristic,
			Uint8Array.of(request.entityID, request.attributeID),
			{ response: true },
			(writeError) => {
				if (writeError) {
					this.#readingEntityAttribute = false;
					request.callback?.(writeError);
					this.#scheduleEntityAttributeRead();
					return;
				}

				Timer.set(() => {
					const characteristic = this.#amsCharacteristics.entityAttribute;
					if (!this.#gatt || !characteristic) {
						this.#readingEntityAttribute = false;
						request.callback?.(new Error("disconnected"));
						this.#scheduleEntityAttributeRead();
						return;
					}
					this.#gatt.read(characteristic, (readError, value) => {
						this.#readingEntityAttribute = false;
						const decoded = readError
							? undefined
							: decodeText(value, `read entity=${request.entityID} attribute=${request.attributeID}`);
						request.callback?.(readError || (decoded === undefined ? new Error("invalid UTF-8") : undefined), decoded);
						this.#scheduleEntityAttributeRead();
					});
				}, ENTITY_ATTRIBUTE_READ_AFTER_WRITE_MS);
			},
		);
	}

	#resetConnectionState() {
		if (this.#entityAttributeReadTimer) {
			Timer.clear(this.#entityAttributeReadTimer);
			this.#entityAttributeReadTimer = undefined;
		}
		this.#gatt = undefined;
		this.#amsCharacteristics = {};
		this.#supportedRemoteCommands = new Uint8Array();
		this.#entityAttributeReads.length = 0;
		this.#readingEntityAttribute = false;
	}
}

function sameUUID(a, b) {
	return a.toLowerCase() === b;
}

function amsCharacteristicDefinition(uuid) {
	for (const definition of REQUIRED_AMS_CHARACTERISTICS) {
		if (sameUUID(uuid, definition.uuid)) return definition;
	}
}

function entityName(entityID) {
	if (ENTITY_ID.PLAYER === entityID) return "player";
	if (ENTITY_ID.QUEUE === entityID) return "queue";
	if (ENTITY_ID.TRACK === entityID) return "track";
	return `${entityID}`;
}

function trackAttributeName(attributeID) {
	if (TRACK_ATTRIBUTE_ID.ARTIST === attributeID) return "artist";
	if (TRACK_ATTRIBUTE_ID.ALBUM === attributeID) return "album";
	if (TRACK_ATTRIBUTE_ID.TITLE === attributeID) return "title";
	if (TRACK_ATTRIBUTE_ID.DURATION === attributeID) return "duration";
	return `${attributeID}`;
}

function playerAttributeName(attributeID) {
	if (PLAYER_ATTRIBUTE_ID.NAME === attributeID) return "name";
	if (PLAYER_ATTRIBUTE_ID.PLAYBACK_INFO === attributeID) return "playback";
	if (PLAYER_ATTRIBUTE_ID.VOLUME === attributeID) return "volume";
	return `${attributeID}`;
}

function attributeName(entityID, attributeID) {
	if (ENTITY_ID.TRACK === entityID) return trackAttributeName(attributeID);
	if (ENTITY_ID.PLAYER === entityID) return playerAttributeName(attributeID);
	return `${attributeID}`;
}

function decodeText(buffer, context) {
	try {
		return utf8Decoder.decode(buffer);
	} catch (error) {
		trace(`[ams/client] ${context} UTF-8 decode failed: ${error} bytes=${new Uint8Array(buffer).toHex()}\n`);
		return undefined;
	}
}

export { AMSClient, RemoteCommandID };
