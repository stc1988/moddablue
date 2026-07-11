import { Skins, Styles } from "assets";

const DeviceInfo = Container.template(($) => ({
	skin: Skins.panel,
	contents: [
		Content($, { left: 6, top: 0, width: 16, height: 16, skin: Skins.deviceIcon }),
		Label($, { anchor: "NAME", left: 28, top: 0, width: 112, height: 16, style: Styles.deviceName }),
		Label($, { anchor: "STATUS", right: 6, top: 0, width: 66, height: 16, style: Styles.deviceStatus }),
	],
	Behavior: class extends Behavior {
		onCreate(_container, anchors) {
			this.anchors = anchors;
		}
		onModelChanged(_container, model) {
			this.anchors.NAME.string = model.device.name;
			this.anchors.STATUS.string = model.playerConnection === "connected" ? "Connected" : model.device.status;
		}
	},
}));

export default DeviceInfo;
