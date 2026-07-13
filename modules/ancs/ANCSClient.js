// @ts-nocheck
import { GATTClient } from "embedded:io/bluetoothle/central";
import TextDecoder from "text/decoder";

const ANCS_SERVICE_UUID = "7905f431-b5ce-4e99-a40f-4b1e122d00d0";
const NOTIFICATION_SOURCE_UUID = "9fbf120d-6301-42d9-8c58-25e699a21dbd";
const CONTROL_POINT_UUID = "69d1d8f3-45e1-49a8-9821-9bbdfdaad9d9";
const DATA_SOURCE_UUID = "22eac6e9-24d6-4bb5-be44-b36ace7c7bfb";
const GATT_CLIENT_MTU = 185;

const EventID = Object.freeze({ added: 0, modified: 1, removed: 2 });
const EventFlag = Object.freeze({ silent: 1, important: 2, preExisting: 4, positiveAction: 8, negativeAction: 16 });
const CategoryID = Object.freeze({
	other: 0,
	incomingCall: 1,
	missedCall: 2,
	voiceMail: 3,
	social: 4,
	schedule: 5,
	email: 6,
	news: 7,
	healthAndFitness: 8,
	businessAndFinance: 9,
	location: 10,
	entertainment: 11,
});
const NotificationAttributeID = Object.freeze({
	appIdentifier: 0,
	title: 1,
	subtitle: 2,
	message: 3,
	messageSize: 4,
	date: 5,
	positiveActionLabel: 6,
	negativeActionLabel: 7,
});
const ActionID = Object.freeze({ positive: 0, negative: 1 });
const AppAttributeID = Object.freeze({ displayName: 0 });
const REQUESTED_ATTRIBUTES = Object.freeze([
	[NotificationAttributeID.appIdentifier],
	[NotificationAttributeID.title, 96],
	[NotificationAttributeID.subtitle, 96],
	[NotificationAttributeID.message, 384],
	[NotificationAttributeID.messageSize],
	[NotificationAttributeID.date],
	[NotificationAttributeID.positiveActionLabel, 32],
	[NotificationAttributeID.negativeActionLabel, 32],
]);
const ATTRIBUTE_NAMES = Object.freeze([
	"appIdentifier",
	"title",
	"subtitle",
	"message",
	"messageSize",
	"date",
	"positiveActionLabel",
	"negativeActionLabel",
]);

const decoder = new TextDecoder();

class ANCSClient {
	#gatt;
	#characteristics = {};
	#requests = [];
	#activeRequest;
	#response = new Uint8Array();
	#appNames;

	constructor(delegate, options = {}) {
		this.delegate = delegate;
		this.#appNames = options.appNames ?? new Map();
	}

	connect(address) {
		if (this.#gatt) return false;

		const client = this;
		this.#gatt = new GATTClient({
			address,
			mtu: GATT_CLIENT_MTU,
			security: { bond: true, ioCapabilities: "none", immediate: true },
			onReady() {
				client.delegate?.onANCSConnected?.(address);
			},
			onSecured(state) {
				trace(`[ancs/client] secured encrypted=${state.encrypted} bonded=${state.bonded}\n`);
				client.#discover(this);
			},
			onReadable(count) {
				while (count--) {
					const value = this.read();
					if (!value) continue;
					if (value.handle === client.#characteristics.notificationSource?.handle)
						client.#handleNotificationSource(new Uint8Array(value));
					else if (value.handle === client.#characteristics.dataSource?.handle)
						client.#handleDataSource(new Uint8Array(value));
				}
			},
			onError(error) {
				client.#reset();
				client.delegate?.onANCSError?.(error);
			},
		});
		return true;
	}

	disconnect() {
		if (!this.#gatt) return;
		this.#gatt.close();
		this.#reset();
	}

	performAction(uid, action) {
		const controlPoint = this.#characteristics.controlPoint;
		if (!this.#gatt || !controlPoint) return false;
		const actionID = typeof action === "string" ? ActionID[action] : action;
		if (actionID !== ActionID.positive && actionID !== ActionID.negative) return false;
		const packet = new Uint8Array(6);
		packet[0] = 2;
		writeUID(packet, 1, uid);
		packet[5] = actionID;
		this.#gatt.write(controlPoint, packet, { response: true }, (error) => {
			if (error) this.delegate?.onANCSError?.(error);
		});
		return true;
	}

	#discover(gatt) {
		gatt.getPrimaryServices([ANCS_SERVICE_UUID], (serviceError, services) => {
			if (serviceError || !services.length) return this.delegate?.onANCSError?.(serviceError ?? "ANCS not found");
			gatt.getCharacteristics(
				services[0],
				[NOTIFICATION_SOURCE_UUID, CONTROL_POINT_UUID, DATA_SOURCE_UUID],
				(error, characteristics) => {
					if (error) return this.delegate?.onANCSError?.(error);
					for (const characteristic of characteristics) {
						const uuid = String(characteristic.uuid).toLowerCase();
						if (uuid === NOTIFICATION_SOURCE_UUID) this.#characteristics.notificationSource = characteristic;
						else if (uuid === CONTROL_POINT_UUID) this.#characteristics.controlPoint = characteristic;
						else if (uuid === DATA_SOURCE_UUID) this.#characteristics.dataSource = characteristic;
					}
					if (
						!this.#characteristics.notificationSource ||
						!this.#characteristics.controlPoint ||
						!this.#characteristics.dataSource
					)
						return this.delegate?.onANCSError?.("ANCS characteristics incomplete");
					gatt.subscribe(this.#characteristics.dataSource, (dataError) => {
						if (dataError) return this.delegate?.onANCSError?.(dataError);
						gatt.subscribe(this.#characteristics.notificationSource, (notificationError) => {
							if (notificationError) return this.delegate?.onANCSError?.(notificationError);
							this.delegate?.onANCSReady?.();
						});
					});
				},
			);
		});
	}

	#handleNotificationSource(bytes) {
		if (bytes.length < 8) return;
		const notification = {
			event: bytes[0],
			flags: bytes[1],
			category: bytes[2],
			categoryCount: bytes[3],
			uid: readUID(bytes, 4),
		};
		if (notification.event === EventID.removed) {
			this.delegate?.onANCSNotificationRemoved?.(notification);
			return;
		}
		this.#requests.push(notification);
		this.#requestNext();
	}

	#requestNext() {
		if (this.#activeRequest || !this.#requests.length) return;
		this.#activeRequest = { type: "notification", notification: this.#requests.shift() };
		this.#response = new Uint8Array();
		const packet = makeNotificationAttributeRequest(this.#activeRequest.notification.uid);
		this.#gatt.write(this.#characteristics.controlPoint, packet, { response: true }, (error) => {
			if (!error) return;
			this.delegate?.onANCSError?.(error);
			this.#activeRequest = undefined;
			this.#requestNext();
		});
	}

	#handleDataSource(fragment) {
		if (!this.#activeRequest) return;
		this.#response = append(this.#response, fragment);
		if (this.#activeRequest.type === "app") this.#handleAppAttributeResponse();
		else this.#handleNotificationAttributeResponse();
	}

	#handleNotificationAttributeResponse() {
		const parsed = parseNotificationAttributeResponse(this.#response, REQUESTED_ATTRIBUTES.length);
		if (!parsed) return;
		const notification = this.#activeRequest.notification;
		if (parsed.uid !== notification.uid) {
			this.delegate?.onANCSError?.("ANCS response UID mismatch");
			this.#completeRequest();
			return;
		}

		Object.assign(notification, parsed.attributes);
		notification.hasPositiveAction = Boolean(notification.flags & EventFlag.positiveAction);
		notification.hasNegativeAction = Boolean(notification.flags & EventFlag.negativeAction);
		const appIdentifier = notification.appIdentifier;
		if (!appIdentifier) {
			this.#deliverNotification(notification);
			return;
		}
		if (this.#appNames.has(appIdentifier)) {
			notification.appName = this.#appNames.get(appIdentifier);
			this.#deliverNotification(notification);
			return;
		}

		this.#activeRequest = { type: "app", appIdentifier, notification };
		this.#response = new Uint8Array();
		this.#gatt.write(
			this.#characteristics.controlPoint,
			makeAppAttributeRequest(appIdentifier),
			{ response: true },
			(error) => {
				if (!error) return;
				this.delegate?.onANCSError?.(error);
				notification.appName = appIdentifier;
				this.#deliverNotification(notification);
			},
		);
	}

	#handleAppAttributeResponse() {
		const parsed = parseAppAttributeResponse(this.#response);
		if (!parsed) return;
		const { appIdentifier, notification } = this.#activeRequest;
		if (parsed.appIdentifier !== appIdentifier) {
			this.delegate?.onANCSError?.("ANCS app response identifier mismatch");
			notification.appName = appIdentifier;
		} else {
			notification.appName = parsed.displayName || appIdentifier;
			this.#appNames.set(appIdentifier, notification.appName);
		}
		this.#deliverNotification(notification);
	}

	#deliverNotification(notification) {
		this.delegate?.onANCSNotification?.(notification);
		this.#completeRequest();
	}

	#completeRequest() {
		this.#activeRequest = undefined;
		this.#response = new Uint8Array();
		this.#requestNext();
	}

	#reset() {
		this.#gatt = undefined;
		this.#characteristics = {};
		this.#requests.length = 0;
		this.#activeRequest = undefined;
		this.#response = new Uint8Array();
	}
}

function makeNotificationAttributeRequest(uid) {
	let length = 5;
	for (const attribute of REQUESTED_ATTRIBUTES) length += attribute.length === 2 ? 3 : 1;
	const packet = new Uint8Array(length);
	packet[0] = 0;
	writeUID(packet, 1, uid);
	let offset = 5;
	for (const [id, maximumLength] of REQUESTED_ATTRIBUTES) {
		packet[offset++] = id;
		if (maximumLength !== undefined) {
			packet[offset++] = maximumLength & 0xff;
			packet[offset++] = maximumLength >> 8;
		}
	}
	return packet;
}

function makeAppAttributeRequest(appIdentifier) {
	const identifier = new Uint8Array(ArrayBuffer.fromString(appIdentifier));
	const packet = new Uint8Array(identifier.length + 3);
	packet[0] = 1;
	packet.set(identifier, 1);
	packet[identifier.length + 1] = 0;
	packet[identifier.length + 2] = AppAttributeID.displayName;
	return packet;
}

function parseNotificationAttributeResponse(bytes, expectedCount) {
	if (bytes.length < 5 || bytes[0] !== 0) return;
	const attributes = {};
	let offset = 5;
	let count = 0;
	while (count < expectedCount) {
		if (offset + 3 > bytes.length) return;
		const id = bytes[offset++];
		const length = bytes[offset++] | (bytes[offset++] << 8);
		if (offset + length > bytes.length) return;
		if (ATTRIBUTE_NAMES[id]) attributes[ATTRIBUTE_NAMES[id]] = decoder.decode(bytes.subarray(offset, offset + length));
		offset += length;
		count++;
	}
	return { uid: readUID(bytes, 1), attributes };
}

function parseAppAttributeResponse(bytes) {
	if (bytes.length < 2 || bytes[0] !== 1) return;
	let offset = 1;
	while (offset < bytes.length && bytes[offset] !== 0) offset++;
	if (offset === bytes.length) return;
	const appIdentifier = decoder.decode(bytes.subarray(1, offset));
	offset++;
	if (offset + 3 > bytes.length) return;
	const id = bytes[offset++];
	const length = bytes[offset++] | (bytes[offset++] << 8);
	if (offset + length > bytes.length) return;
	if (id !== AppAttributeID.displayName) return { appIdentifier, displayName: "" };
	return { appIdentifier, displayName: decoder.decode(bytes.subarray(offset, offset + length)) };
}

function append(left, right) {
	const result = new Uint8Array(left.length + right.length);
	result.set(left);
	result.set(right, left.length);
	return result;
}

function readUID(bytes, offset) {
	return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function writeUID(bytes, offset, uid) {
	bytes[offset] = uid;
	bytes[offset + 1] = uid >> 8;
	bytes[offset + 2] = uid >> 16;
	bytes[offset + 3] = uid >> 24;
}

export { ActionID, AppAttributeID, CategoryID, EventFlag, EventID, NotificationAttributeID };
export default ANCSClient;
