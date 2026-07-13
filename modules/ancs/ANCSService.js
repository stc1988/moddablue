// @ts-nocheck

import ANCSClient from "moddablue/ancs/client";
import ANCSPairingServer from "moddablue/ancs/pairing-server";
import Timer from "timer";

const RECONNECT_DELAY_MS = 1000;

class ANCSService {
	constructor(delegate, options = {}) {
		this.delegate = delegate;
		this.options = options;
		this.appNames = new Map();
		this.ready = false;
	}

	start() {
		if (this.pairingServer || this.client) return;
		this.pairingServer = new ANCSPairingServer({
			deviceName: this.options.deviceName,
			onPaired: (address) => {
				this.address = address;
				this.delegate?.onANCSStatus?.("paired");
				this.#connect();
			},
		});
		this.delegate?.onANCSStatus?.("pairing");
	}

	performAction(uid, action) {
		return this.client?.performAction(uid, action) ?? false;
	}

	onANCSConnected(address) {
		this.delegate?.onANCSConnected?.(address);
	}

	onANCSReady() {
		this.ready = true;
		this.delegate?.onANCSReady?.();
	}

	onANCSNotification(notification) {
		this.delegate?.onANCSNotification?.(notification);
	}

	onANCSNotificationRemoved(notification) {
		this.delegate?.onANCSNotificationRemoved?.(notification);
	}

	onANCSError(error) {
		if (error !== undefined) {
			this.delegate?.onANCSError?.(error);
			return;
		}

		this.ready = false;
		this.client = undefined;
		this.delegate?.onANCSStatus?.("reconnecting");
		if (this.reconnectTimer) return;
		this.reconnectTimer = Timer.set(() => {
			this.reconnectTimer = undefined;
			this.#connect();
		}, RECONNECT_DELAY_MS);
	}

	#connect() {
		if (!this.address || this.client) return;
		this.client = new ANCSClient(this, { appNames: this.appNames });
		if (!this.client.connect(this.address)) this.client = undefined;
	}
}

export default ANCSService;
