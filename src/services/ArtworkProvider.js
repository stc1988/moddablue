import { log } from "Logger";
import fetch from "fetch";

const DEFAULT_ALBUM_ART_SIZE = 128;
const ITUNES_SEARCH_ENDPOINT = "https://itunes.apple.com/search";

function normalize(value) {
	return value.trim().toLowerCase();
}

function validateRequest(artist, album, size) {
	if (!artist || !album) throw new TypeError("artist and album are required");
	if (!Number.isInteger(size) || size <= 0) throw new RangeError("size must be a positive integer");
}

function resizeArtworkUrl(url, size) {
	return url.replace(/100x100/, `${size}x${size}`);
}

function createArtworkKey(track) {
	return `${normalize(track.artist || "")}|${normalize(track.album || "")}`;
}

async function fetchAlbumArtUrl(artist, album, size = DEFAULT_ALBUM_ART_SIZE) {
	validateRequest(artist, album, size);

	const expectedArtist = normalize(artist);
	const expectedAlbum = normalize(album);
	const term = encodeURIComponent(`${artist} ${album}`);
	const url = `${ITUNES_SEARCH_ENDPOINT}?media=music&entity=album&term=${term}&limit=10`;
	const response = await fetch(url);
	if (!response.ok) throw new Error(`iTunes Search API returned HTTP ${response.status}`);

	const data = await response.json();
	const results = data.results ?? [];
	const result =
		results.find(
			(entry) =>
				entry.artworkUrl100 &&
				entry.artistName?.trim().toLowerCase() === expectedArtist &&
				entry.collectionName?.trim().toLowerCase() === expectedAlbum,
		) ?? results.find((entry) => entry.artworkUrl100);

	return result ? resizeArtworkUrl(result.artworkUrl100, size) : undefined;
}

async function fetchArtworkData(url) {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`artwork image returned HTTP ${response.status}`);
	return response.arrayBuffer();
}

class ArtworkProvider {
	constructor() {
		this.delegate = null;
	}
	async fetch(track, size = DEFAULT_ALBUM_ART_SIZE) {
		const key = createArtworkKey(track);
		log("artwork", "lookup start", key);
		const url = await fetchAlbumArtUrl(track.artist, track.album, size);
		if (!url) {
			log("artwork", "lookup empty", key);
			if (this.delegate) this.delegate.onArtworkUrl?.(undefined, track);
			return { key, state: "empty", url: undefined, data: undefined };
		}

		log("artwork", "download start", url);
		const downloadStarted = Date.now();
		const data = await fetchArtworkData(url);
		log("artwork", "download complete", `${key} bytes=${data.byteLength} ms=${Date.now() - downloadStarted}`);
		const artwork = { key, state: "loaded", url, data };
		if (this.delegate) this.delegate.onArtworkUrl?.(url, track);
		return artwork;
	}
	async fetchAlbumArtUrl(artist, album, size = DEFAULT_ALBUM_ART_SIZE) {
		return fetchAlbumArtUrl(artist, album, size);
	}
	cancel() {}
}

export { createArtworkKey, DEFAULT_ALBUM_ART_SIZE, fetchAlbumArtUrl };
export default ArtworkProvider;
