import { log, logUpdate } from "Logger";

class MusicPlayerService {
	constructor() {
		this.delegate = null;
		this.logScope = "service";
	}
	start() {
		throw new Error("MusicPlayerService.start must be implemented by a concrete service.");
	}
	stop() {
		throw new Error("MusicPlayerService.stop must be implemented by a concrete service.");
	}
	play() {
		throw new Error("MusicPlayerService.play must be implemented by a concrete service.");
	}
	pause() {
		throw new Error("MusicPlayerService.pause must be implemented by a concrete service.");
	}
	togglePlayPause() {
		throw new Error("MusicPlayerService.togglePlayPause must be implemented by a concrete service.");
	}
	nextTrack() {
		throw new Error("MusicPlayerService.nextTrack must be implemented by a concrete service.");
	}
	previousTrack() {
		throw new Error("MusicPlayerService.previousTrack must be implemented by a concrete service.");
	}
	seekTo(_seconds) {
		throw new Error("MusicPlayerService.seekTo must be implemented by a concrete service.");
	}
	setVolume(_volume) {
		throw new Error("MusicPlayerService.setVolume must be implemented by a concrete service.");
	}
	emit(update) {
		if (this.shouldLogUpdate(update)) logUpdate(this.logScope, "emit update", update);
		if (this.delegate) this.delegate.onServiceUpdate(update);
		else log(this.logScope, "update dropped because delegate is not attached");
	}
	shouldLogUpdate(update) {
		const track = update?.track;
		if (!track) return true;
		return (
			update.playerConnection !== undefined ||
			update.playback !== undefined ||
			update.volume !== undefined ||
			update.device !== undefined ||
			update.artwork !== undefined ||
			track.title !== undefined ||
			track.artist !== undefined ||
			track.album !== undefined ||
			track.duration !== undefined
		);
	}
}

export default MusicPlayerService;
