import { Colors, Styles } from "assets";

const TITLE_HEIGHT = 24;
const TITLE_START_HOLD_MS = 1800;
const TITLE_END_HOLD_MS = 900;
const TITLE_SCROLL_PIXELS_PER_SECOND = 25;
const TITLE_SCROLL_INSET = 16;
const TITLE_SCROLL_GAP = 32;

const TitleScrollStyle = new Style({
	font: "semibold 18px M PLUS 1",
	color: Colors.text,
	horizontal: "left",
	vertical: "middle",
});

const TitleMarquee = Container.template(($) => ({
	anchor: "TITLE",
	left: 0,
	right: 0,
	height: TITLE_HEIGHT,
	clip: true,
	contents: [
		Label($, { anchor: "TITLE_CENTER", left: 0, right: 0, top: 0, height: TITLE_HEIGHT, style: Styles.title }),
		Label($, {
			anchor: "TITLE_SCROLL",
			left: 0,
			top: 0,
			height: TITLE_HEIGHT,
			style: TitleScrollStyle,
			visible: false,
		}),
		Label($, {
			anchor: "TITLE_SCROLL_NEXT",
			left: 0,
			top: 0,
			height: TITLE_HEIGHT,
			style: TitleScrollStyle,
			visible: false,
		}),
	],
	Behavior: class extends Behavior {
		onCreate(_container, anchors) {
			this.anchors = anchors;
			this.title = "";
			this.textWidth = 0;
			this.scrollDistance = 0;
			this.scrollDuration = 0;
		}
		onDisplaying(container) {
			this.layout(container);
		}
		onFinished(container) {
			if (!this.scrollDistance) return;

			container.time = 0;
			this.anchors.TITLE_SCROLL.x = TITLE_SCROLL_INSET;
			this.anchors.TITLE_SCROLL_NEXT.x = TITLE_SCROLL_INSET + this.textWidth + TITLE_SCROLL_GAP;
			container.start();
		}
		onTimeChanged(container) {
			if (!this.scrollDistance) return;

			const label = this.anchors.TITLE_SCROLL;
			const next = this.anchors.TITLE_SCROLL_NEXT;
			const time = container.time;
			const scrollStart = TITLE_START_HOLD_MS;
			const scrollEnd = scrollStart + this.scrollDuration;
			let x;

			if (time < scrollStart) {
				x = TITLE_SCROLL_INSET;
			} else if (time < scrollEnd) {
				x = TITLE_SCROLL_INSET - Math.round((this.scrollDistance * (time - scrollStart)) / this.scrollDuration);
			} else {
				x = TITLE_SCROLL_INSET - this.scrollDistance;
			}
			label.x = x;
			next.x = x + this.textWidth + TITLE_SCROLL_GAP;
		}
		setTitle(container, title) {
			if (title === this.title) return;

			this.title = title;
			this.layout(container);
		}
		layout(container) {
			const center = this.anchors.TITLE_CENTER;
			const scroll = this.anchors.TITLE_SCROLL;
			const next = this.anchors.TITLE_SCROLL_NEXT;
			const title = this.title;
			const containerWidth = container.width;
			const textWidth = Math.ceil(Styles.title.measure(title).width);

			container.stop();
			container.time = 0;

			this.textWidth = textWidth;

			if (!containerWidth || textWidth <= containerWidth) {
				this.scrollDistance = 0;
				this.scrollDuration = 0;
				scroll.visible = false;
				next.visible = false;
				center.string = title;
				center.visible = true;
				return;
			}

			center.visible = false;
			scroll.string = title;
			next.string = title;
			scroll.width = textWidth + TITLE_SCROLL_INSET;
			next.width = textWidth + TITLE_SCROLL_INSET;
			scroll.x = TITLE_SCROLL_INSET;
			next.x = TITLE_SCROLL_INSET + textWidth + TITLE_SCROLL_GAP;
			scroll.visible = true;
			next.visible = true;
			this.scrollDistance = textWidth + TITLE_SCROLL_GAP;
			this.scrollDuration = Math.round((this.scrollDistance * 1000) / TITLE_SCROLL_PIXELS_PER_SECOND);
			container.duration = TITLE_START_HOLD_MS + this.scrollDuration + TITLE_END_HOLD_MS;
			container.start();
		}
	},
}));

const TrackInfo = Column.template(($) => ({
	contents: [TitleMarquee($), Label($, { anchor: "ARTIST", left: 0, right: 0, height: 18, style: Styles.mutedCenter })],
	Behavior: class extends Behavior {
		onCreate(_column, anchors) {
			this.anchors = anchors;
		}
		onModelChanged(_column, model) {
			const anchors = this.anchors;
			anchors.TITLE.delegate("setTitle", model.track.title);
			anchors.ARTIST.string = model.track.artist;
		}
	},
}));

export default TrackInfo;
