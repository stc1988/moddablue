const ConnectionState = Object.freeze({
	DISCONNECTED: "disconnected",
	CONNECTING: "connecting",
	CONNECTED: "connected",
});

const MAX_NOTIFICATIONS = 20;

function formatReceivedTime(timestamp) {
	const date = new Date(timestamp);
	const hours = date.getHours();
	const minutes = date.getMinutes();
	return `${hours < 10 ? "0" : ""}${hours}:${minutes < 10 ? "0" : ""}${minutes}`;
}

function createInitialModel() {
	return {
		connection: ConnectionState.DISCONNECTED,
		status: "Starting",
		notifications: [],
		error: undefined,
	};
}

function addOrUpdateNotification(model, notification) {
	const index = model.notifications.findIndex((item) => item.uid === notification.uid);
	const previous = index >= 0 ? model.notifications[index] : undefined;
	const receivedAt = notification.receivedAt ?? Date.now();
	const next = {
		...previous,
		...notification,
		receivedAt,
		receivedTime: formatReceivedTime(receivedAt),
		pendingDismissal: false,
	};

	if (index >= 0) model.notifications[index] = next;
	else model.notifications.unshift(next);

	if (model.notifications.length > MAX_NOTIFICATIONS) model.notifications.length = MAX_NOTIFICATIONS;
}

function removeNotification(model, uid) {
	const index = model.notifications.findIndex((item) => item.uid === uid);
	if (index >= 0) model.notifications.splice(index, 1);
}

function setDismissalPending(model, uid, pending) {
	const notification = model.notifications.find((item) => item.uid === uid);
	if (notification) notification.pendingDismissal = pending;
}

function applyServiceUpdate(model, update) {
	if (!update) return model;
	if (update.connection !== undefined) model.connection = update.connection;
	if (update.status !== undefined) model.status = update.status;
	if (update.clearNotifications) model.notifications.length = 0;
	if (update.notification) addOrUpdateNotification(model, update.notification);
	if (update.removedUID !== undefined) removeNotification(model, update.removedUID);
	if ("error" in update) model.error = update.error === undefined ? undefined : `${update.error}`;
	return model;
}

export {
	addOrUpdateNotification,
	applyServiceUpdate,
	ConnectionState,
	createInitialModel,
	formatReceivedTime,
	removeNotification,
	setDismissalPending,
};
