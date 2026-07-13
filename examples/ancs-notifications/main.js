// @ts-nocheck
import config from "mc/config";
import ANCSService from "moddablue/ancs/service";
import Timer from "timer";

class NotificationExample {
	#latest;
	#service;

	constructor() {
		this.#service = new ANCSService(this, { deviceName: "Moddable Notifications" });
		this.#service.start();
	}

	onANCSStatus(status) {
		trace(`[app] ${status}\n`);
	}

	onANCSConnected(address) {
		trace(`[app] connected to ${address}\n`);
	}

	onANCSReady() {
		trace("[app] ANCS ready; send a notification to the paired iPhone\n");
	}

	onANCSNotification(notification) {
		this.#latest = notification;
		trace(`\n[notification] ${notification.appName ?? notification.appIdentifier ?? "unknown app"}\n`);
		trace(`  app identifier: ${notification.appIdentifier ?? ""}\n`);
		trace(`  title: ${notification.title ?? ""}\n`);
		trace(`  subtitle: ${notification.subtitle ?? ""}\n`);
		trace(`  message: ${notification.message ?? ""}\n`);
		trace(
			`  uid: ${notification.uid} positive=${notification.hasPositiveAction} negative=${notification.hasNegativeAction}\n`,
		);

		// For unattended hardware testing, build with ancsAction=positive or
		// ancsAction=negative. The default never acts on a notification.
		if (config.ancsAction === "positive" && notification.hasPositiveAction)
			Timer.set(() => this.performLatestAction("positive"), 1000);
		else if (config.ancsAction === "negative" && notification.hasNegativeAction)
			Timer.set(() => this.performLatestAction("negative"), 1000);
	}

	onANCSNotificationRemoved(notification) {
		trace(`[notification] removed uid=${notification.uid}\n`);
		if (this.#latest?.uid === notification.uid) this.#latest = undefined;
	}

	onANCSError(error) {
		trace(`[app] ANCS error: ${error}\n`);
	}

	performLatestAction(action) {
		if (!this.#latest) return false;
		trace(`[app] ${action} action uid=${this.#latest.uid}\n`);
		return this.#service.performAction(this.#latest.uid, action);
	}
}

new NotificationExample();
