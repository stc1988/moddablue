import { Colors, Styles } from "assets";

const TITLE_HEIGHT = 24;
const TITLE_START_HOLD_MS = 1800;
const TITLE_END_HOLD_MS = 900;
const TITLE_LOOP_HOLD_MS = 1400;
const TITLE_SCROLL_PIXELS_PER_SECOND = 25;
const TITLE_SCROLL_INSET = 16;

const TitleScrollStyle = new Style({
	font: "semibold 18px Open Sans",
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
			container.start();
		}
		onTimeChanged(container) {
			if (!this.scrollDistance) return;

			const label = this.anchors.TITLE_SCROLL;
			const time = container.time;
			const scrollStart = TITLE_START_HOLD_MS;
			const scrollEnd = scrollStart + this.scrollDuration;

			if (time < scrollStart) {
				label.x = TITLE_SCROLL_INSET;
			} else if (time < scrollEnd) {
				label.x = TITLE_SCROLL_INSET - Math.round((this.scrollDistance * (time - scrollStart)) / this.scrollDuration);
			} else {
				label.x = TITLE_SCROLL_INSET - this.scrollDistance;
			}
		}
		setTitle(container, title) {
			if (title === this.title) return;

			this.title = title;
			this.layout(container);
		}
		layout(container) {
			const center = this.anchors.TITLE_CENTER;
			const scroll = this.anchors.TITLE_SCROLL;
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
				center.string = title;
				center.visible = true;
				return;
			}

			center.visible = false;
			scroll.string = title;
			scroll.width = textWidth + TITLE_SCROLL_INSET * 2;
			scroll.x = TITLE_SCROLL_INSET;
			scroll.visible = true;
			this.scrollDistance = scroll.width - containerWidth + TITLE_SCROLL_INSET;
			this.scrollDuration = Math.round((this.scrollDistance * 1000) / TITLE_SCROLL_PIXELS_PER_SECOND);
			container.duration = TITLE_START_HOLD_MS + this.scrollDuration + TITLE_END_HOLD_MS + TITLE_LOOP_HOLD_MS;
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
