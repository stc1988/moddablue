import type { NotificationAction, NotificationInput } from "NotificationModel";
import { ConnectionState } from "NotificationModel";
import NotificationService from "NotificationService";
import config from "mc/config";
import ANCSService from "moddablue/ancs";
import Timer from "timer";

class ANCSNotificationService extends NotificationService {
	declare service: ANCSService | undefined;

	start() {
		this.service = new ANCSService(this, { deviceName: "Moddable Notifications" });
		this.service.start();
	}

	performAction(uid: number, action: NotificationAction) {
		return this.service?.performAction(uid, action) ?? false;
	}

	onANCSStatus(status: string) {
		const connecting = status === "pairing" || status === "paired" || status === "reconnecting";
		this.emit({
			connection: connecting ? ConnectionState.CONNECTING : ConnectionState.DISCONNECTED,
			status: status === "pairing" ? "Pair with iPhone" : status,
			error: undefined,
		});
	}

	onANCSConnected() {
		this.emit({ connection: ConnectionState.CONNECTING, status: "Loading notifications" });
	}

	onANCSReady() {
		this.emit({ connection: ConnectionState.CONNECTED, status: "iPhone connected", error: undefined });
	}

	onANCSNotification(notification: NotificationInput) {
		this.emit({ notification });

		const action = config.ancsAction;
		const supported =
			(action === "positive" && notification.hasPositiveAction) ||
			(action === "negative" && notification.hasNegativeAction);
		if (supported) Timer.set(() => this.service?.performAction(notification.uid, action), 1000);
	}

	onANCSNotificationRemoved(notification: { uid: number }) {
		this.emit({ removedUID: notification.uid });
	}

	onANCSSessionEnded() {
		this.emit({ clearNotifications: true });
	}

	onANCSError(error: unknown) {
		this.emit({ status: "ANCS error", error });
	}
}

export default ANCSNotificationService;
