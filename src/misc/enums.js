const { AudioResource } = require('@discordjs/voice');
const { getNonEventPlaydl } = require('../gen/downloader');

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
    this.id = rawMetadata?.id ?? rawMetadata?.videoId ?? rawMetadata?.Id;
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
    this.lyrics = rawMetadata?.lyrics;
  }

  __getStream(returnTrack = false) {
    if (!this.id || !this.raw?.stream?.buffer) return undefined;
    if (returnTrack) return { ...this, stream: this.raw?.stream };
    else return { stream: this.raw?.stream };
  }

  async __refresh(returnStream = true) {
    const trackMetadata = await getNonEventPlaydl(
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
  debugRegister: true,
};

const downloaderOptions = {
  fetchLyrics: true,
  eventReturn: { metadata: undefined },
  ratelimit: 0,
  ignoreInternalError: true,
  fetchOptions: {
    fetchLimit: Infinity,
    streamQuality: 'high',
    rawCookies: undefined,
    userAgents: undefined,
    skipalbumLimit: false,
  },
};

const voiceOptions = {
  eventOptions,
  delayTimeout: 0,
  leaveOn: {
    end: false,
    empty: false,
    bot: false,
  },
  anyoneCanMoveClient: true,
  altVoiceChannel: undefined,
  forceDestroy: false,
};

const packetOptions = {
  downloaderOptions,
  voiceOptions,
  songQueryFilters: ['all'],
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
