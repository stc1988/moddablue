import { Layout, Skins } from "assets";

const StatusIcon = Content.template(($) => ({
	width: Layout.statusIconSize,
	height: Layout.statusIconSize,
	skin: Skins.statusIcon,
	state: $.state,
	variant: $.variant,
}));

const StatusHeader = Container.template(($) => ({
	skin: Skins.statusHeader,
	contents: [
		Row($, {
			right: 8,
			top: 3,
			height: Layout.statusIconSize,
			contents: [StatusIcon({ state: 0, variant: 0 }), Content($, { width: 6 }), StatusIcon({ state: 0, variant: 1 })],
		}),
	],
	Behavior: class extends Behavior {
		onModelChanged(container, model) {
			const icons = container.first;
			icons.first.state = model.network.connected ? 1 : 0;
			icons.last.state = model.playerConnection === "connected" ? 1 : 0;
		}
	},
}));

export default StatusHeader;
