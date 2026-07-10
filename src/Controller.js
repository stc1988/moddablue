import ArtworkProvider, { createArtworkKey, DEFAULT_ALBUM_ART_SIZE } from "ArtworkProvider";
import { isElapsedOnlyUpdate, log, logUpdate } from "Logger";
import { applyModelUpdate, ConnectionState, PlaybackState } from "model";
import Timer from "timer";

class Controller {
	constructor(model, service) {
		this.model = model;
		this.service = service;
		this.artworkProvider = new ArtworkProvider();
		this.service.delegate = this;
		log("controller", "created", service.constructor.name);
	}
	attachView(view) {
		this.view = view;
		log("controller", "view attached");
		this.notifyView();
	}
	start() {
		log("controller", "start service");
		this.service.start();
	}
	stop() {
		log("controller", "stop service");
		this.stopProgressTimer();
		this.service.stop();
	}
	onServiceUpdate(update) {
		const silent = isElapsedOnlyUpdate(update);
		if (!silent) logUpdate("controller", "service update received", update);
		const shouldFetchArtwork = this.shouldFetchArtwork(update);
		applyModelUpdate(this.model, update);
		if (this.shouldClearArtworkRequest(update)) this.clearArtworkRequest();
		if (shouldFetchArtwork) this.fetchArtwork(this.model.track);
		this.syncProgressTimer();
		this.notifyView({ silent });
	}
	shouldFetchArtwork(update) {
		const track = update?.track;
		return track?.artist !== undefined || track?.album !== undefined;
	}
	shouldClearArtworkRequest(update) {
		if (update?.artwork === null) return true;
		if (!update?.track) return false;
		return !this.model.track.artist && !this.model.track.album && !this.model.track.title;
	}
	clearArtworkRequest() {
		this.artworkKey = null;
		this.artworkRequestID = (this.artworkRequestID || 0) + 1;
	}
	fetchArtwork(track) {
		const key = createArtworkKey(track);
		if (!track.artist || !track.album || this.artworkKey === key) return;

		this.artworkKey = key;
		this.artworkRequestID = (this.artworkRequestID || 0) + 1;
		const requestID = this.artworkRequestID;
		log("controller", "artwork request", key);
		applyModelUpdate(this.model, { artwork: { key, state: "loading" } });
		this.notifyView();

		this.artworkProvider
			.fetch(track, DEFAULT_ALBUM_ART_SIZE)
			.then((artwork) => {
				if (this.artworkRequestID !== requestID) {
					log("controller", "artwork response ignored", key);
					return;
				}
				applyModelUpdate(this.model, { artwork });
				this.notifyView();
			})
			.catch((error) => {
				if (this.artworkRequestID !== requestID) return;
				log("controller", "artwork request failed", error);
				applyModelUpdate(this.model, { artwork: { key, state: "error", error: `${error}` } });
				this.notifyView();
			});
	}
	onCommand(command) {
		log("controller", "command received", command);
		if (command === "previous") {
			log("controller", "dispatch previousTrack");
			this.service.previousTrack();
		} else if (command === "next") {
			log("controller", "dispatch nextTrack");
			this.service.nextTrack();
		} else if (command === "playpause") {
			log("controller", "dispatch togglePlayPause");
			this.service.togglePlayPause();
		} else {
			log("controller", "unknown command ignored", command);
		}
	}
	onSeekTo(seconds) {
		log("controller", "seek requested", seconds);
		this.service.seekTo(seconds);
	}
	onVolumeChange(volume) {
		log("controller", "volume requested", volume);
		this.service.setVolume(volume);
	}
	syncProgressTimer() {
		if (this.model.connection !== ConnectionState.CONNECTED || this.model.playback !== PlaybackState.PLAYING) {
			this.stopProgressTimer();
			return;
		}

		this.startProgressTimer();
	}
	startProgressTimer() {
		if (this.progressTimer) return;

		log("controller", "start progress timer");
		this.progressTimer = Timer.repeat(() => {
			const duration = this.model.track.duration || 0;
			const elapsed = this.model.track.elapsed || 0;
			if (duration && elapsed >= duration) {
				this.stopProgressTimer();
				return;
			}

			applyModelUpdate(this.model, {
				track: {
					elapsed: duration ? Math.min(elapsed + 1, duration) : elapsed + 1,
				},
			});
			this.notifyView({ silent: true });
		}, 1000);
	}
	stopProgressTimer() {
		if (!this.progressTimer) return;

		log("controller", "stop progress timer");
		Timer.clear(this.progressTimer);
		this.progressTimer = undefined;
	}
	notifyView(options) {
		if (!options?.silent) {
			log(
				"controller",
				"notify view",
				`connection=${this.model.connection} playback=${this.model.playback} title=${this.model.track.title}`,
			);
		}
		if (this.view) this.view.distribute("onModelChanged", this.model);
	}
}

Controller.ConnectionState = ConnectionState;
Controller.PlaybackState = PlaybackState;

export default Controller;
