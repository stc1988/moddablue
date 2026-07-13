function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

export class ButtonBehavior extends Behavior {
	onCreate(_container, data) {
		this.command = data.command;
		this.controller = data.controller;
	}
	onTouchBegan(container, id, x, y, ticks) {
		container.captureTouch(id, x, y, ticks);
		this.setPressed(container, true);
	}
	onTouchMoved(container, _id, x, y) {
		this.setPressed(container, container.hit(x, y));
	}
	onTouchEnded(container, _id, x, y) {
		const accepted = container.hit(x, y);
		this.setPressed(container, false);
		if (accepted) this.onTap(container);
	}
	onTouchCancelled(container) {
		this.setPressed(container, false);
	}
	setPressed(container, pressed) {
		container.state = pressed ? 1 : 0;
	}
	onTap(_container) {}
}

export class SliderBehavior extends Behavior {
	onCreate(_container, data) {
		this.anchors = data;
		this.controller = data.controller;
		this.dragging = false;
	}
	onTouchBegan(container, id, x, y, ticks) {
		container.captureTouch(id, x, y, ticks);
		this.dragging = true;
		this.setActive(true);
		this.onValueChanging(container, this.valueFromTouch(container, x));
	}
	onTouchMoved(container, _id, x) {
		this.onValueChanging(container, this.valueFromTouch(container, x));
	}
	onTouchEnded(container, _id, x) {
		const value = this.valueFromTouch(container, x);
		this.onValueChanging(container, value);
		this.dragging = false;
		this.setActive(false);
		this.onValueChanged(container, value);
	}
	onTouchCancelled(_container) {
		this.dragging = false;
		this.setActive(false);
	}
	valueFromTouch(container, x) {
		return clamp((x - container.x - this.trackLeft) / (container.width - this.trackLeft - this.trackRight), 0, 1);
	}
	setActive(_active) {}
	onValueChanging(_container, _value) {}
	onValueChanged(_container, _value) {}
}
