import { isElapsedOnlyUpdate, log, logUpdate } from "Logger";

const ConnectionState = Object.freeze({
	DISCONNECTED: "disconnected",
	CONNECTING: "connecting",
	CONNECTED: "connected",
});

const PlaybackState = Object.freeze({
	UNKNOWN: "unknown",
	STOPPED: "stopped",
	PAUSED: "paused",
	PLAYING: "playing",
});

function createInitialModel() {
	const model = {
		connection: ConnectionState.DISCONNECTED,
		playback: PlaybackState.UNKNOWN,
		track: createEmptyTrack(),
		artwork: null,
		volume: 0.45,
		device: {
			name: "Apple Media Service",
			status: "Disconnected",
		},
	};
	log("model", "initial state created", `connection=${model.connection} playback=${model.playback}`);
	return model;
}

function createEmptyTrack() {
	return {
		title: "",
		artist: "",
		album: "",
		duration: 0,
		elapsed: 0,
	};
}

function mergeTrack(target, source) {
	if (!source) return;
	target.title = source.title ?? target.title;
	target.artist = source.artist ?? target.artist;
	target.album = source.album ?? target.album;
	target.duration = source.duration ?? target.duration;
	target.elapsed = source.elapsed ?? target.elapsed;
}

function applyModelUpdate(model, update) {
	if (!update) return model;
	const shouldLog = !isElapsedOnlyUpdate(update);
	if (shouldLog) logUpdate("model", "apply update", update);
	if ("connection" in update) model.connection = update.connection;
	if ("playback" in update) model.playback = update.playback;
	if ("track" in update) mergeTrack(model.track, update.track);
	if ("artwork" in update) model.artwork = update.artwork;
	if ("volume" in update) model.volume = update.volume;
	if ("device" in update) model.device = { ...model.device, ...update.device };
	if (shouldLog) {
		log(
			"model",
			"state changed",
			`connection=${model.connection} playback=${model.playback} title=${model.track.title}`,
		);
	}
	return model;
}

export { applyModelUpdate, ConnectionState, createEmptyTrack, createInitialModel, PlaybackState };
