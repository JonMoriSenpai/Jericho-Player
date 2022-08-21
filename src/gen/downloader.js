const { User } = require('discord.js');
const { playdl, playdlQuick } = require('playdl-music-extractor');
const player = require('../core/player');
const queue = require('../core/queue');
const { downloaderOptions } = require('../misc/enums');
const { scanDeps } = require('../utils/miscUtils');
const eventEmitter = require('../utils/eventEmitter');
const packets = require('./packets');

class downloader {
  /**
   * @constructor
   * @param {packets} packet Packet Instance for moderating backend manupulation and request handlers and handle massive functions and events
   * @param {downloaderOptions} options Downloader Options for extractor's scrapping Options
   */
  constructor(packet, options = downloaderOptions) {
    /**
     * Packet Instance for moderating backend manupulation and request handlers and handle massive functions and events
     * @type {packets}
     * @readonly
     */
    this.packet = packet;

    /**
     * Queue data for Guild Moderation with Voice Channels/Connections
     * @type {queue}
     * @readonly
     */
    this.queue = packet?.queue;

    /**
     * Actual Jericho-Player's Class Instance for sup=properties requirements and usage
     * @type {player}
     */
    this.player = packet?.player;

    /**
     * Event Emitters for Error Management and Event Emitting with proper meanings
     * @type {eventEmitter}
     */
    this.eventEmitter = packet?.eventEmitter;

    /**
     * options Downloader Options for extractor's scrapping Options
     * @type {downloaderOptions}
     * @readonly
     */
    this.options = options;

    /**
     * Play-dl Class Instance for making solid and proper tunneled request inter-exchange
     * @type {playdl}
     */
    this.playdl = new playdl(options);

    this.playdl.on('album', (playlist) => (playlist ? this.packet?.__playlistMod(playlist) : undefined));

    this.playdl.on(
      'track',
      async (extractor, playlist, rawTrack, extractorData, metadata) => await this.packet.__tracksMod(extractor, playlist, rawTrack, metadata),
    );
    if (scanDeps('video-extractor')) {
      const { youtubedl } = require('video-extractor');
      this.youtubedl = new youtubedl(options);
      this.youtubedl.on('album', (playlist) => (playlist ? this.packet?.__playlistMod(playlist) : undefined));

      this.youtubedl.on(
        'track',
        async (extractor, playlist, rawTrack, metadata) => await this.packet.__tracksMod(extractor, playlist, rawTrack, metadata),
      );
    }
  }

  /**
   * @method get Get Tracks Data or triggering track event for Tracks Mod
   * @param {string} rawQuery String Value for fetching/Parsing with the help of extractors
   * @param {User} requestedSource requested By Source Data for checks and avoid the further edits on it by some stranger to protect the integrity
   * @param {downloaderOptions} options options Downloader Options for extractor's scrapping Options
   * @returns {Promise<Boolean | undefined>} Returns Raw Extractor Data on completion of processing and extracting
   */
  async get(rawQuery, requestedSource, options = downloaderOptions) {
    if (!(rawQuery && typeof rawQuery === 'string' && rawQuery !== ''))
      return undefined;
    else if (options?.extractor?.toLowerCase()?.trim() === 'youtubedl')
      return await this.getYoutubedl(rawQuery, requestedSource, options);
    else return await this.getPlaydl(rawQuery, requestedSource, options);
  }

  /**
   * @method getPlaydl Play-dl extractor Function with repsect to internal functions to support the cause of usage
   * @param {string} rawQuery String Value for fetching/Parsing with the help of extractors
   * @param {User} requestedSource requested By Source Data for checks and avoid the further edits on it by some stranger to protect the integrity
   * @param {downloaderOptions} options options Downloader Options for extractor's scrapping Options
   * @returns {Promise<Boolean | undefined>} Returns Raw Extractor Data on completion of processing and extracting
   */

  async getPlaydl(rawQuery, requestedSource, options = downloaderOptions) {
    this.eventEmitter.emitDebug(
      'playdl - Extractor',
      'Making Request to playdl extractors for parsing and fetch required Track Data',
      {
        rawQuery,
        requestedSource,
        downloaderOptions: options,
      },
    );
    const extractorData = await this.playdl.exec(rawQuery, {
      ...options,
      playersCompatibility: true,
      waitForPromise: false,
      eventReturn: {
        ...options?.eventReturn,
        metadata: {
          ...options?.eventReturn?.metadata,
          __privateCaches: { downloaderOptions: options, requestedSource },
        },
      },
      streamDownload: true,
    });
    extractorData.on('tracks', (tracks, playlist, metadata) => this.packet.extractorDataManager(
      { rawTracks: tracks, playlist },
      'parseTracks',
    ));
    return true;
  }

  /**
   * @method getYoutubedl Youtube-dl extractor Function with repsect to internal functions to support the cause of usage
   * @param {string} rawQuery String Value for fetching/Parsing with the help of extractors
   * @param {User} requestedSource requested By Source Data for checks and avoid the further edits on it by some stranger to protect the integrity
   * @param {downloaderOptions} options options Downloader Options for extractor's scrapping Options
   * @returns {Promise<Boolean | undefined>} Returns Raw Extractor Data on completion of processing and extracting
   */

  async getYoutubedl(rawQuery, requestedSource, options = downloaderOptions) {
    this.eventEmitter.emitDebug(
      'youtubedl - Extractor',
      'Making Request to youtubedl extractors for parsing and fetch required Track Data',
      {
        rawQuery,
        requestedSource,
        downloaderOptions: options,
      },
    );
    const extractorData = await this.youtubedl.exec(rawQuery, {
      ...options,
      playersCompatibility: true,
      waitForPromise: false,
      eventReturn: {
        ...options?.eventReturn,
        metadata: {
          ...options?.eventReturn?.metadata,
          __privateCaches: { downloaderOptions: options, requestedSource },
        },
      },
      streamDownload: true,
    });
    if (!extractorData?.tracks) {
      await this.playdl.exec(rawQuery, {
        ...options,
        playersCompatibility: true,
        waitForPromise: false,
        eventReturn: {
          ...options?.eventReturn,
          metadata: {
            ...options?.eventReturn?.metadata,
            __privateCaches: { downloaderOptions: options, requestedSource },
          },
        },
        streamDownload: true,
      });
    } else return undefined;
    return true;
  }

  static async getNonEventExtractor(
    rawQuery,
    metadataCaches = {},
    options = downloaderOptions,
  ) {
    if (!(rawQuery && typeof rawQuery === 'string' && rawQuery !== ''))
      return undefined;
    else if (
      options?.extractor?.toLowerCase()?.trim() === 'youtubedl' &&
      scanDeps('video-extractor')
    ) {
      const { youtubedlQuick } = require('video-extractor');
      return await youtubedlQuick.exec(rawQuery, {
        ...options,
        playersCompatibility: true,
        eventReturn: {
          ...options?.eventReturn,
          metadata: {
            ...options?.eventReturn?.metadata,
            __privateCaches: { ...metadataCaches, downloaderOptions: options },
          },
        },
        streamDownload: true,
      });
    } else
      return await playdlQuick.exec(rawQuery, {
        ...options,
        playersCompatibility: true,
        eventReturn: {
          ...options?.eventReturn,
          metadata: {
            ...options?.eventReturn?.metadata,
            __privateCaches: { ...metadataCaches, downloaderOptions: options },
          },
        },
        streamDownload: true,
      });
  }

  /**
   * @method __queryFilter Query Filter for the Song Urls checks
   * @param {String[]} fitlers Query checking Filters from the User
   * @returns {Boolean | false} Returns Boolean value as true
   */

  __queryFilter(rawQuery, filters = ['all']) {
    if (!(rawQuery && typeof rawQuery === 'string' && rawQuery !== ''))
      return undefined;
    const isValidUrl = (urlString) => {
      try {
        return Boolean(new URL(urlString));
      } catch (e) {
        return false;
      }
    };
    const isValidYoutube = (url) => {
      const p =
        /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
      return Boolean(url.match(p)?.[1]);
    };
    const isValidSpotify = (url) => {
      const p =
        /^(?:spotify:|(?:https?:\/\/(?:open|play)\.spotify\.com\/))(?:embed)?\/?(album|podcasts|track)(?::|\/)((?:[0-9a-zA-Z]){22})/;
    };
    if (filters?.includes('all')) return true;
    else if (filters?.includes('query') && !isValidUrl(rawQuery)) return true;
    else if (
      filters?.includes('youtube') &&
      isValidUrl(rawQuery) &&
      isValidYoutube(rawQuery)
    )
      return true;
    else if (
      filters?.includes('spotify') &&
      isValidUrl(rawQuery) &&
      isValidSpotify(rawQuery)
    )
      return true;
    else return false;
  }
}

module.exports = downloader;
