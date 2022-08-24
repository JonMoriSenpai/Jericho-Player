const { AudioResource } = require('@discordjs/voice');

class Playlist {
  #__raw = undefined;

  constructor(rawMetadata) {
    this.#__raw = {
      ...rawMetadata,
      metadata: rawMetadata?.metadata?.__privateCaches,
    };
    this.patch(rawMetadata);
  }

  patch(rawMetadata) {
    if (!rawMetadata || (rawMetadata && rawMetadata instanceof Boolean))
      rawMetadata = {};
    this.id = rawMetadata?.id ?? rawMetadata?.Id;
    this.name = rawMetadata?.title ?? rawMetadata?.name;
    this.url = rawMetadata?.url;
    this.thumbnail = rawMetadata?.thumbnail;
    this.views = rawMetadata?.views;
    this.tracksCount = rawMetadata?.tracksCount;
    this.author = rawMetadata?.author ?? rawMetadata?.channel;
    this.extractorData = rawMetadata?.extractorData;
  }

  get requestedSource() {
    return this.metadata?.requestedSource;
  }

  get metadata() {
    return this.#__raw?.metadata;
  }

  get user() {
    return (
      this.requestedSource?.user ??
      this.requestedSource?.author ??
      this.requestedSource?.member
    );
  }

  get raw() {
    return this.#__raw;
  }
}

class Track {
  #__raw = undefined;

  constructor(rawMetadata) {
    this.#__raw = {
      ...rawMetadata,
      metadata: rawMetadata?.metadata?.__privateCaches,
    };
    this.patch(rawMetadata);
  }

  patch(rawMetadata) {
    this.id = rawMetadata?.id ?? rawMetadata?.Id ?? rawMetadata?.trackId;
    this.videoId = rawMetadata?.videoId;
    this.playlistId = rawMetadata?.albumId ?? rawMetadata?.playlistId;
    this.title = rawMetadata?.title ?? rawMetadata?.name;
    this.url = rawMetadata?.url;
    this.description = rawMetadata?.description;
    this.author = rawMetadata?.author ?? rawMetadata?.channel;
    this.views =
      rawMetadata?.views ??
      rawMetadata?.view ??
      rawMetadata?.viewsCount ??
      rawMetadata?.viewCount;
    this.extractors = rawMetadata?.extractorModel;
    this.thumbnail = rawMetadata?.thumbnail;
    this.isLive = rawMetadata?.isLive ?? false;
    this.duration = rawMetadata?.duration;
    this.ratings = rawMetadata?.ratings ?? { likes: 0, dislikes: 0 };
    this.playlist =
      rawMetadata?.album || rawMetadata?.playlist
        ? new Playlist(rawMetadata?.album ?? rawMetadata?.playlist)
        : undefined;
    this.extractorData = rawMetadata?.extractorData;
    this.lyrics = rawMetadata?.lyrics;
  }

  __getStream(returnTrack = false) {
    if (!this.videoId || !this.raw?.stream?.buffer) return undefined;
    if (returnTrack) return { ...this, stream: this.raw?.stream };
    else return { stream: this.raw?.stream };
  }

  async __refresh(returnStream = true) {
    const { getNonEventExtractor } = require('../gen/downloader');
    const trackMetadata = await getNonEventExtractor(
      this.url,
      {
        requestedSource: this.requestedSource,
      },
      this.downloaderOptions,
    )?.tracks?.[0];
    if (trackMetadata) return undefined;
    this.patch(trackMetadata);
    if (returnStream) return this.__getStream();
    else return this;
  }

  get downloaderOptions() {
    return this.metadata?.downloaderOptions;
  }

  get requestedSource() {
    return this.metadata?.requestedSource;
  }

  get metadata() {
    return this.#__raw?.metadata;
  }

  get user() {
    return (
      this.requestedSource?.user ??
      this.requestedSource?.author ??
      this.requestedSource?.member
    );
  }

  set audioResource(resource) {
    this.#__raw.audioResource = resource;
  }

  /**
   * @returns {AudioResource} Audio Resource of respected Track
   */
  get audioResource() {
    return this.raw?.audioResource;
  }

  get raw() {
    return this.#__raw;
  }
}

const eventOptions = {
  ignoreCrash: true,
  emitPlayer: true,
  errorName: 'Error',
  debugRegister: true,
};

const downloaderOptions = {
  extractor: 'playdl',
  playersCompatibility: true,
  fetchLyrics: true,
  eventReturn: { metadata: undefined },
  ratelimit: 0,
  ignoreInternalError: true,
  fetchOptions: {
    tokens: {},
    fetchLimit: Infinity,
    streamQuality: 'high',
    rawCookies: undefined,
    proxies: undefined,
    cookiesFile: undefined,
    userAgents: undefined,
    skipalbumLimit: true,
  },
};

const voiceOptions = {
  eventOptions,
  delayTimeout: 0,
  leaveOn: {
    end: true,
    empty: true,
    bot: true,
  },
  anyoneCanMoveClient: true,
  altVoiceChannel: undefined,
  forceDestroy: false,
};

const packetOptions = {
  downloaderOptions,
  voiceOptions,
  songQueryFilters: ['all'],
  noMemoryLeakMode: false,
};

const Options = {
  eventOptions,
  packetOptions,
};

const packetPrivateCaches = {
  completedTracksMetadata: [],
  audioPlayerSubscription: undefined,
  customModes: { repeat: {}, loop: {}, autoplay: {} },
  timeMetadata: {},
  volumeMetadata: 95,
  extraDataCaches: [],
};

module.exports = {
  Track,
  Playlist,
  voiceOptions,
  eventOptions,
  packetOptions,
  downloaderOptions,
  Options,
  packetPrivateCaches,
};
