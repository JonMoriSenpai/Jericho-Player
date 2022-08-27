const { AudioResource } = require('@discordjs/voice');
const trackModel = require('playdl-music-extractor').Track;

class Playlist {
  #raw = undefined;

  constructor(rawMetadata) {
    this.#raw = {
      ...{ ...rawMetadata },
      metadata: rawMetadata?.metadata?.__privateCaches,
    };
    this.patch(rawMetadata);
  }

  patch(rawMetadata) {
    if (!rawMetadata || (rawMetadata && rawMetadata instanceof Boolean))
      rawMetadata = {};
    this.id = rawMetadata?.id ?? rawMetadata?.Id;
    this.uniqueId = rawMetadata?.uniqueId ?? rawMetadata?.url;
    this.name = rawMetadata?.title ?? rawMetadata?.name;
    this.url = rawMetadata?.url;
    this.thumbnail = rawMetadata?.thumbnail;
    this.views = rawMetadata?.views;
    this.tracksCount = rawMetadata?.tracksCount;
    this.author = rawMetadata?.author ?? rawMetadata?.channel;
    this.extractorData = rawMetadata?.queue;
  }

  get requestedSource() {
    return this.metadata?.requestedSource;
  }

  get metadata() {
    return this.#raw?.metadata;
  }

  get user() {
    return (
      this.requestedSource?.user ??
      this.requestedSource?.author ??
      this.requestedSource?.member
    );
  }

  get raw() {
    return this.#raw;
  }
}

class Track {
  #raw = undefined;

  /**
   * @param {trackModel} rawMetadata
   */
  constructor(rawMetadata) {
    this.#raw = {
      track: rawMetadata,
      metadata: rawMetadata?.metadata?.__privateCaches,
    };
    this.patch(rawMetadata);
  }

  /**
   * @param {trackModel} rawMetadata
   */

  patch(rawMetadata) {
    this.id = rawMetadata?.id ?? rawMetadata?.Id ?? rawMetadata?.trackId;
    this.uniqueId = rawMetadata?.uniqueId ?? rawMetadata?.url;
    this.videoId = rawMetadata?.videoId;
    this.playlist = rawMetadata?.album ?? rawMetadata?.playlist;
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
    this.extractorData = rawMetadata?.queue;
  }

  async getStream() {
    if (!this.raw?.track) return undefined;
    else return await this.raw?.track?.getStream()?.catch(() => undefined);
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
    if (returnStream) return await this.getStream();
    else return this;
  }

  get downloaderOptions() {
    return this.metadata?.downloaderOptions;
  }

  get requestedSource() {
    return this.metadata?.requestedSource;
  }

  get playlistId() {
    return this.playlist?.id;
  }

  get metadata() {
    return this.#raw?.metadata;
  }

  get user() {
    return (
      this.requestedSource?.user ??
      this.requestedSource?.author ??
      this.requestedSource?.member
    );
  }

  set audioResource(resource) {
    this.#raw.audioResource = resource;
  }

  /**
   * @returns {AudioResource} Audio Resource of respected Track
   */
  get audioResource() {
    return this.raw?.audioResource;
  }

  get raw() {
    return this.#raw;
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
  forceDestroy: false,
};

const packetOptions = {
  downloaderOptions,
  voiceOptions,
  songQueryFilters: ['all'],
  noMemoryLeakMode: true,
  autoSweeper: ['previoustracks', 'tracks', 'extractordata'],
};

const Options = {
  eventOptions,
  packetOptions,
};

module.exports = {
  Track,
  Playlist,
  voiceOptions,
  eventOptions,
  packetOptions,
  downloaderOptions,
  Options,
};
