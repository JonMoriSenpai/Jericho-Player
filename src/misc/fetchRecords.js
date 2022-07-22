class Playlist {
  #__raw = undefined;

  constructor(rawMetadata, requestedBy) {
    this.#__raw = { ...rawMetadata, user: requestedBy };
    this.patch(rawMetadata, requestedBy);
  }

  patch(rawMetadata, requestedBy) {
    if (!rawMetadata || (rawMetadata && rawMetadata instanceof Boolean))
      rawMetadata = {};
    this.id = rawMetadata?.id ?? rawMetadata?.Id;
    this.name = rawMetadata?.title ?? rawMetadata?.name;
    this.url = rawMetadata?.url;
    this.thumbnail = rawMetadata?.thumbnail;
    this.views = rawMetadata?.views;
    this.tracksCount = rawMetadata?.tracksCount;
    this.author = rawMetadata?.author ?? rawMetadata?.channel;
    this.metadata = rawMetadata?.customMetadata;
    this.user = requestedBy;
  }
}

class Track {
  #__raw = undefined;

  constructor(rawMetadata, requestedBy) {
    this.#__raw = { ...rawMetadata, user: requestedBy };
    this.patch(rawMetadata, requestedBy);
  }

  patch(rawMetadata) {
    this.id = rawMetadata?.id ?? rawMetadata?.videoId ?? rawMetadata?.Id;
    this.playlistId = rawMetadata?.albumId ?? rawMetadata?.playlistId;
    this.title = rawMetadata?.title ?? rawMetadata?.name;
    this.url = rawMetadata?.url;
    this.description = rawMetadata?.description;
    this.author = rawMetadata?.author ?? rawMetadata?.channel;
    this.views = rawMetadata?.views;
    this.extractors = rawMetadata?.extractorModel;
    this.thumbnail = rawMetadata?.thumbnail;
    this.isLive = rawMetadata?.isLive ?? false;
    this.duration = rawMetadata?.duration;
    this.ratings = rawMetadata?.ratings ?? { likes: 0, dislikes: 0 };
    this.playlist =
      rawMetadata?.album || rawMetadata?.playlist
        ? new Playlist(rawMetadata?.album ?? rawMetadata?.playlist)
        : undefined;
    this.lyrics = rawMetadata?.lyrics;
    this.user = rawMetadata?.requestedBy;
  }

  __getStream(returnTrack = false) {
    if (!this.id || !this.raw?.stream?.buffer) return undefined;
    if (returnTrack) return { ...this, stream: this.raw?.stream };
    else return { stream: this.raw?.stream };
  }

  get raw() {
    return this.#__raw;
  }
}

module.exports = { Track, Playlist };
