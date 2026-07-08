import config from "mc/config";

const enabled = config.mediaPlayerTrace !== false;

function appendValue(parts, name, value) {
	if (value !== undefined) parts.push(`${name}=${value}`);
}

function describeUpdate(update) {
	if (!update) return "none";

	const parts = [];
	appendValue(parts, "connection", update.connection);
	appendValue(parts, "playback", update.playback);
	appendValue(parts, "volume", update.volume);
	if (update.device) {
		appendValue(parts, "device", update.device.name);
		appendValue(parts, "status", update.device.status);
	}
	if (update.track) {
		appendValue(parts, "title", update.track.title);
		appendValue(parts, "artist", update.track.artist);
		appendValue(parts, "album", update.track.album);
		appendValue(parts, "duration", update.track.duration);
		appendValue(parts, "elapsed", update.track.elapsed);
	}
	if ("artwork" in update) appendValue(parts, "artwork", update.artwork ? "available" : "none");

	return parts.length ? parts.join(" ") : "empty";
}

function isElapsedOnlyUpdate(update) {
	if (!update?.track) return false;
	if (
		update.connection !== undefined ||
		update.playback !== undefined ||
		update.volume !== undefined ||
		update.device !== undefined ||
		update.artwork !== undefined
	) {
		return false;
	}

	const track = update.track;
	return (
		track.elapsed !== undefined &&
		track.title === undefined &&
		track.artist === undefined &&
		track.album === undefined &&
		track.duration === undefined
	);
}

function log(scope, message, detail) {
	if (!enabled) return;
	trace(`[MediaPlayer:${scope}] ${message}`);
	if (detail !== undefined) trace(` ${detail}`);
	trace("\n");
}

function logUpdate(scope, message, update) {
	log(scope, message, describeUpdate(update));
}

export { describeUpdate, isElapsedOnlyUpdate, log, logUpdate };
