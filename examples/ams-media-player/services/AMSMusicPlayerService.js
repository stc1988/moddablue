import { log } from "Logger";
import MusicPlayerService from "MusicPlayerService";
import { AMSClient, RemoteCommandID } from "moddablue/ams/client";
import AMSPairingServer from "moddablue/ams/pairing-server";
import { ConnectionState, createEmptyTrack, PlaybackState } from "model";

const AMS_PLAYBACK_STATE = Object.freeze({
	PAUSED: 0,
	PLAYING: 1,
	REWINDING: 2,
	FAST_FORWARDING: 3,
});

function mapPlaybackState(state) {
	if (state === AMS_PLAYBACK_STATE.PLAYING) return PlaybackState.PLAYING;
	if (state === AMS_PLAYBACK_STATE.PAUSED) return PlaybackState.PAUSED;
	return PlaybackState.UNKNOWN;
}

function applyChanged(target, name, value) {
	if (value === undefined || target[name] === value) return false;
	target[name] = value;
	return true;
}

class AMSMusicPlayerService extends MusicPlayerService {
	constructor() {
		super();
		this.logScope = "ams-service";
	}
	start() {
		log("ams-service", "start pairing");
		this.lastEmitted = {
			track: {},
		};
		this.emit({
			playerConnection: ConnectionState.CONNECTING,
			playback: PlaybackState.UNKNOWN,
			track: createEmptyTrack(),
			artwork: null,
			device: { name: "Apple Media Service", status: "Pairing" },
		});
		this.client = new AMSClient(this);
		this.pairingServer = new AMSPairingServer({
			onPaired: (address) => {
				log("ams-service", "paired", address);
				this.emit({
					playerConnection: ConnectionState.CONNECTING,
					device: { name: "Apple Media Service", status: "Connecting" },
				});
				this.client.connect(address);
			},
		});
	}
	stop() {
		log("ams-service", "stop");
		this.emit({
			playerConnection: ConnectionState.DISCONNECTED,
			playback: PlaybackState.STOPPED,
			track: createEmptyTrack(),
			artwork: null,
			device: { status: "Stopped" },
		});
	}
	play() {
		log("ams-service", "remote command", "PLAY");
		this.client?.remoteCommand(RemoteCommandID.PLAY);
	}
	pause() {
		log("ams-service", "remote command", "PAUSE");
		this.client?.remoteCommand(RemoteCommandID.PAUSE);
	}
	togglePlayPause() {
		log("ams-service", "remote command", "TOGGLE_PLAY_PAUSE");
		this.client?.remoteCommand(RemoteCommandID.TOGGLE_PLAY_PAUSE);
	}
	nextTrack() {
		log("ams-service", "remote command", "NEXT_TRACK");
		this.client?.remoteCommand(RemoteCommandID.NEXT_TRACK);
	}
	previousTrack() {
		log("ams-service", "remote command", "PREVIOUS_TRACK");
		this.client?.remoteCommand(RemoteCommandID.PREVIOUS_TRACK);
	}
	seekTo(seconds) {
		log("ams-service", "seekTo unsupported by AMS remote command", seconds);
	}
	setVolume(volume) {
		const current = this.client?.sample()?.player?.volume;
		if (current === undefined) {
			log("ams-service", "setVolume skipped because current volume is unknown", volume);
			return;
		}

		const target = Math.max(0, Math.min(1, volume || 0));
		const delta = target - current;
		const command = delta > 0 ? RemoteCommandID.VOLUME_UP : RemoteCommandID.VOLUME_DOWN;
		const count = Math.min(8, Math.ceil(Math.abs(delta) / 0.0625));
		log("ams-service", "remote volume adjustment", `current=${current} target=${target} steps=${count}`);
		for (let i = 0; i < count; i++) this.client?.remoteCommand(command);
	}
	onAMSConnected() {
		log("ams-service", "connected");
		this.emit({
			playerConnection: ConnectionState.CONNECTED,
			device: { name: "Apple Media Service", status: "Connected" },
		});
	}
	onAMSDeviceNameChanged(name) {
		log("ams-service", "device name", name);
		this.emit({
			device: { name, status: "Connected" },
		});
	}
	onAMSError(error) {
		log("ams-service", "error", error);
		this.emit({
			playerConnection: ConnectionState.DISCONNECTED,
			playback: PlaybackState.UNKNOWN,
			track: createEmptyTrack(),
			artwork: null,
			device: { status: `${error}` },
		});
	}
	onAMSStateChanged(state) {
		const update = {};
		if (!this.lastEmitted) this.lastEmitted = { track: {} };
		const last = this.lastEmitted;
		const playback = mapPlaybackState(state.playback.state);

		if (state.playback.state !== undefined && applyChanged(last, "playback", playback)) update.playback = playback;
		if (applyChanged(last, "volume", state.player.volume)) update.volume = state.player.volume;

		if (!last.track) last.track = {};
		if (applyChanged(last.track, "elapsed", state.playback.elapsed))
			update.track = { ...update.track, elapsed: state.playback.elapsed };
		if (applyChanged(last.track, "artist", state.track.artist))
			update.track = { ...update.track, artist: state.track.artist };
		if (applyChanged(last.track, "album", state.track.album))
			update.track = { ...update.track, album: state.track.album };
		if (applyChanged(last.track, "title", state.track.title))
			update.track = { ...update.track, title: state.track.title };
		if (applyChanged(last.track, "duration", state.track.duration)) {
			update.track = { ...update.track, duration: state.track.duration };
		}

		if (!("playback" in update) && !("volume" in update) && !update.track) return;
		log("ams-service", "state changed");
		this.emit(update);
	}
}

export default AMSMusicPlayerService;
