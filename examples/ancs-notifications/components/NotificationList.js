import { Skins, Styles } from "NotificationAssets";

const MESSAGE_TOP = 49;
const MESSAGE_BOTTOM = 8;
const MAX_MESSAGE_LINES = 3;

class VerticalScrollerBehavior extends Behavior {
	onTouchBegan(scroller, _id, _x, y) {
		this.anchor = scroller.scroll.y;
		this.y = y;
		this.waiting = true;
	}

	onTouchMoved(scroller, id, x, y, ticks) {
		const delta = y - this.y;
		if (this.waiting) {
			if (Math.abs(delta) < 8) return;
			this.waiting = false;
			scroller.captureTouch(id, x, y, ticks);
		}
		scroller.scrollTo(0, this.anchor - delta);
	}
}

class DismissButtonBehavior extends Behavior {
	onCreate(_button, data) {
		this.controller = data.controller;
		this.uid = data.notification.uid;
	}

	onTouchBegan(button, id, x, y, ticks) {
		button.captureTouch(id, x, y, ticks);
		button.first.state = 1;
	}

	onTouchMoved(button, _id, x, y) {
		button.first.state = button.hit(x, y) ? 1 : 0;
	}

	onTouchEnded(button, _id, x, y) {
		const accepted = button.hit(x, y);
		button.first.state = 0;
		if (accepted) this.controller.onDismiss(this.uid);
	}

	onTouchCancelled(button) {
		button.first.state = 0;
	}
}

class NotificationCardBehavior extends Behavior {
	onCreate(_card, anchors) {
		this.anchors = anchors;
	}

	onDisplaying(card) {
		const message = this.anchors.MESSAGE;
		const lineHeight = Math.ceil(Styles.message.measure("Ag").height);
		const messageHeight = Math.min(message.height, lineHeight * MAX_MESSAGE_LINES);

		message.height = messageHeight;
		card.height = MESSAGE_TOP + messageHeight + MESSAGE_BOTTOM;
	}
}

const NotificationCard = Container.template(($) => {
	const notification = $.notification;
	const dismissible = notification.hasNegativeAction && !notification.pendingDismissal;
	const appName = notification.appName ?? notification.appIdentifier ?? "iPhone";
	const title = notification.title || notification.subtitle || "Notification";
	const message = notification.message || notification.subtitle || "No additional details";

	return {
		left: 8,
		right: 8,
		top: 8,
		height: 106,
		clip: true,
		skin: notification.pendingDismissal ? Skins.cardPending : Skins.card,
		Behavior: NotificationCardBehavior,
		contents: [
			Content($, { left: 0, top: 0, width: 4, bottom: 0, skin: Skins.accent }),
			Label($, { left: 12, right: 104, top: 6, height: 19, style: Styles.appName, string: appName }),
			Label($, {
				right: 48,
				top: 6,
				width: 52,
				height: 19,
				style: Styles.receivedTime,
				string: notification.receivedTime,
			}),
			Label($, { left: 12, right: 46, top: 26, height: 20, style: Styles.title, string: title }),
			Text($, { anchor: "MESSAGE", left: 12, right: 12, top: MESSAGE_TOP, style: Styles.message, string: message }),
			Container($, {
				right: 4,
				top: 1,
				width: 40,
				height: 40,
				active: dismissible,
				contents: [
					Label($, {
						left: 0,
						right: 0,
						top: 0,
						bottom: 1,
						style: dismissible ? Styles.delete : Styles.deleteDisabled,
						string: "×",
					}),
				],
				Behavior: DismissButtonBehavior,
			}),
		],
	};
});

const EmptyState = Column.template(($) => ({
	left: 18,
	right: 18,
	top: 72,
	contents: [
		Label($, { left: 0, right: 0, height: 30, style: Styles.emptyTitle, string: "No notifications" }),
		Text($, {
			left: 0,
			right: 0,
			top: 4,
			height: 62,
			style: Styles.emptyBody,
			string: "New iPhone alerts will appear here, newest first.",
		}),
	],
}));

const NotificationList = Scroller.template(($) => ({
	active: true,
	backgroundTouch: true,
	clip: true,
	contents: [
		Column($, {
			anchor: "LIST",
			left: 0,
			right: 0,
			top: 0,
			Behavior: class extends Behavior {
				onCreate(_column, data) {
					this.controller = data.controller;
					this.firstUID = undefined;
				}

				onModelChanged(column, model) {
					const firstUID = model.notifications[0]?.uid;
					const hasNewTopNotification = this.firstUID !== undefined && firstUID !== this.firstUID;
					this.firstUID = firstUID;
					column.empty();
					if (model.notifications.length) {
						for (const notification of model.notifications) {
							column.add(new NotificationCard({ controller: this.controller, notification }));
						}
						column.add(Content(null, { height: 8 }));
					} else column.add(new EmptyState());
					if (hasNewTopNotification) column.container.scrollTo(0, 0);
				}
			},
		}),
	],
	Behavior: VerticalScrollerBehavior,
}));

export default NotificationList;
