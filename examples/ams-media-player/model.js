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

function createInitialModel(initial = {}) {
	const model = {
		playerConnection: ConnectionState.DISCONNECTED,
		playback: PlaybackState.UNKNOWN,
		track: createEmptyTrack(),
		artwork: null,
		network: {
			connected: initial.network?.connected ?? false,
			ip: initial.network?.ip,
		},
		volume: 0.45,
		device: {
			name: "Apple Media Service",
			status: "Disconnected",
		},
	};
	log("model", "initial state created", `playerConnection=${model.playerConnection} playback=${model.playback}`);
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
	if ("playerConnection" in update) model.playerConnection = update.playerConnection;
	if ("playback" in update) model.playback = update.playback;
	if ("track" in update) mergeTrack(model.track, update.track);
	if ("artwork" in update) model.artwork = update.artwork;
	if ("network" in update) model.network = { ...model.network, ...update.network };
	if ("volume" in update) model.volume = update.volume;
	if ("device" in update) model.device = { ...model.device, ...update.device };
	if (shouldLog) {
		log(
			"model",
			"state changed",
			`playerConnection=${model.playerConnection} playback=${model.playback} title=${model.track.title}`,
		);
	}
	return model;
}

export { applyModelUpdate, ConnectionState, createEmptyTrack, createInitialModel, PlaybackState };
