import { log } from "Logger";
import { Skins } from "assets";

class ControlButtonBehavior extends Behavior {
	onCreate(_container, data) {
		this.command = data.command;
		this.controller = data.controller;
		this.skin = data.skin;
	}
	onTouchBegan(container) {
		container.skin = Skins.controlActive;
	}
	onTouchEnded(container) {
		container.skin = this.skin;
		log("ui", "control tapped", this.command);
		if (this.controller) this.controller.onCommand(this.command);
		else log("ui", "control ignored because controller is not attached", this.command);
	}
}

const ControlButton = Container.template(($) => ({
	active: true,
	width: $.width,
	height: $.height,
	skin: $.skin,
	contents: [
		Content($, {
			left: ($.width - $.iconSize) >> 1,
			top: ($.height - $.iconSize) >> 1,
			width: $.iconSize,
			height: $.iconSize,
			skin: $.icon,
		}),
	],
	Behavior: ControlButtonBehavior,
}));

const Controls = Row.template(($) => ({
	contents: [
		ControlButton({
			command: "previous",
			controller: $.controller,
			width: 56,
			height: 54,
			icon: Skins.previousIcon,
			iconSize: 32,
			skin: Skins.control,
		}),
		ControlButton({
			command: "playpause",
			controller: $.controller,
			width: 84,
			height: 54,
			icon: Skins.pauseIcon,
			iconSize: 32,
			skin: Skins.controlPrimary,
		}),
		ControlButton({
			command: "next",
			controller: $.controller,
			width: 56,
			height: 54,
			icon: Skins.nextIcon,
			iconSize: 32,
			skin: Skins.control,
		}),
	],
	Behavior: class extends Behavior {
		onModelChanged(row, model) {
			row.first.next.first.skin = model.playback === "playing" ? Skins.pauseIcon : Skins.playIcon;
		}
	},
}));

export default Controls;
