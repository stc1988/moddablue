import { log } from "Logger";
import MusicPlayerService from "MusicPlayerService";
import { ConnectionState, PlaybackState } from "model";
import Timer from "timer";

const TRACKS = Object.freeze([
	{
		title: "Blinding Lights Extended Marquee Test Version",
		artist: "The Weeknd",
		album: "After Hours",
		duration: 200,
		initialElapsed: 53,
	},
	{
		title: "Get Lucky",
		artist: "Daft Punk",
		album: "Random Access Memories",
		duration: 369,
		initialElapsed: 0,
	},
	{
		title: "Style",
		artist: "Taylor Swift",
		album: "1989",
		duration: 231,
		initialElapsed: 0,
	},
	{
		title: "No Artwork Test",
		artist: "Moddable Mock Artist",
		album: "Album That Should Not Exist 404",
		duration: 180,
		initialElapsed: 0,
	},
]);

class MockMusicPlayerService extends MusicPlayerService {
	constructor() {
		super();
		this.logScope = "mock-service";
		this.trackIndex = 0;
		this.playing = false;
		this.elapsed = this.currentTrack.initialElapsed;
		this.duration = this.currentTrack.duration;
		this.volume = 0.45;
	}
	get currentTrack() {
		return TRACKS[this.trackIndex];
	}
	createTrackUpdate(elapsed = this.elapsed) {
		const track = this.currentTrack;
		return {
			title: track.title,
			artist: track.artist,
			album: track.album,
			duration: track.duration,
			elapsed,
		};
	}
	selectTrack(index) {
		this.trackIndex = (index + TRACKS.length) % TRACKS.length;
		this.elapsed = 0;
		this.duration = this.currentTrack.duration;
	}
	start() {
		log("mock-service", "start");
		this.emit({
			connection: ConnectionState.CONNECTED,
			playback: PlaybackState.PAUSED,
			track: this.createTrackUpdate(),
			volume: this.volume,
			device: {
				name: "Satoshi's iPhone",
				status: "Connected",
			},
		});
	}
	stop() {
		log("mock-service", "stop");
		this.clearTimer();
		this.emit({
			connection: ConnectionState.DISCONNECTED,
			playback: PlaybackState.STOPPED,
			device: { status: "Stopped" },
		});
	}
	play() {
		log("mock-service", "play");
		this.playing = true;
		this.emit({ playback: PlaybackState.PLAYING });
		this.startTimer();
	}
	pause() {
		log("mock-service", "pause");
		this.playing = false;
		this.clearTimer();
		this.emit({ playback: PlaybackState.PAUSED });
	}
	togglePlayPause() {
		log("mock-service", "togglePlayPause", this.playing ? "pause" : "play");
		if (this.playing) this.pause();
		else this.play();
	}
	nextTrack() {
		log("mock-service", "nextTrack");
		this.selectTrack(this.trackIndex + 1);
		this.emit({
			playback: this.playing ? PlaybackState.PLAYING : PlaybackState.PAUSED,
			track: this.createTrackUpdate(),
		});
	}
	previousTrack() {
		log("mock-service", "previousTrack");
		this.selectTrack(this.trackIndex - 1);
		this.emit({
			playback: this.playing ? PlaybackState.PLAYING : PlaybackState.PAUSED,
			track: this.createTrackUpdate(),
		});
	}
	seekTo(seconds) {
		this.elapsed = Math.max(0, Math.min(this.duration, Math.round(seconds || 0)));
		log("mock-service", "seekTo", this.elapsed);
		this.emit({ track: { elapsed: this.elapsed } });
	}
	setVolume(volume) {
		this.volume = Math.max(0, Math.min(1, volume || 0));
		log("mock-service", "setVolume", this.volume);
		this.emit({ volume: this.volume });
	}
	startTimer() {
		if (this.timer) return;
		log("mock-service", "start progress timer");
		this.timer = Timer.repeat(() => {
			this.elapsed += 1;
			if (this.elapsed > this.duration) this.elapsed = this.duration;
			this.emit({ track: { elapsed: this.elapsed } });
		}, 1000);
	}
	clearTimer() {
		if (!this.timer) return;
		log("mock-service", "clear progress timer");
		Timer.clear(this.timer);
		delete this.timer;
	}
}

export default MockMusicPlayerService;
