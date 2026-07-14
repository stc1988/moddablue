import { ConnectionState } from "NotificationModel";
import NotificationService from "NotificationService";
import config from "mc/config";
import ANCSService from "moddablue/ancs/service";
import Timer from "timer";

class ANCSNotificationService extends NotificationService {
	start() {
		this.service = new ANCSService(this, { deviceName: "Moddable Notifications" });
		this.service.start();
	}

	dismiss(uid) {
		return this.service?.performAction(uid, "negative") ?? false;
	}

	onANCSStatus(status) {
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

	onANCSNotification(notification) {
		this.emit({ notification });

		const action = config.ancsAction;
		const supported =
			(action === "positive" && notification.hasPositiveAction) ||
			(action === "negative" && notification.hasNegativeAction);
		if (supported) Timer.set(() => this.service?.performAction(notification.uid, action), 1000);
	}

	onANCSNotificationRemoved(notification) {
		this.emit({ removedUID: notification.uid });
	}

	onANCSSessionEnded() {
		this.emit({ clearNotifications: true });
	}

	onANCSError(error) {
		this.emit({ status: "ANCS error", error });
	}
}

export default ANCSNotificationService;
