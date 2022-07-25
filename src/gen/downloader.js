const { User } = require('discord.js');
const { playdl } = require('playdl-music-extractor');
const player = require('../core/player');
const queue = require('../core/queue');
const { Options } = require('../misc/enums');
const eventEmitter = require('../utils/eventEmitter');
const packets = require('./packets');

/**
 * @class downloader -> Downloader Class for fetching Tracks and Playlist data (if any) from raw Query using user-defined extractors or default extractors
 */
class downloader {
  /**
   * @constructor
   * @param {packets} packet Packet Instance for moderating backend manupulation and request handlers and handle massive functions and events
   * @param {Options["packetOptions"]["downloaderOptions"]} options Downloader Options for extractor's scrapping Options
   */
  constructor(packet, options = Options.packetOptions.downloaderOptions) {
    /**
     * @type {packets} Packet Instance for moderating backend manupulation and request handlers and handle massive functions and events
     * @readonly
     */
    this.packet = packet;

    /**
     * @type {queue} Queue data for Guild Moderation with Voice Channels/Connections
     * @readonly
     */
    this.queue = packet?.queue;

    /**
     * @type {player} Actual Jericho-Player's Class Instance for sup=properties requirements and usage
     */
    this.player = packet?.player;

    /**
     * @type {eventEmitter} Event Emitters for Error Management and Event Emitting with proper meanings
     */
    this.eventEmitter = packet?.eventEmitter;

    /**
     * @type {Options["packetOptions"]["downloaderOptions"]} options Downloader Options for extractor's scrapping Options
     * @readonly
     */
    this.options = options;

    /**
     * @type {playdl} Play-dl Class Instance for making solid and proper tunneled request inter-exchange
     */
    this.playdl = new playdl(options);

    this.playdl.on('album', (playlist) => (playlist ? this.packet?.__playlistMod(playlist) : undefined));

    this.playdl.on(
      'track',
      async (extractor, playlist, rawTrack, metadata) => await this.packet.__tracksMod(extractor, playlist, rawTrack, metadata),
    );
  }

  /**
   * @method get Get Tracks Data or triggering track event for Tracks Mod
   * @param {string} rawQuery String Value for fetching/Parsing with the help of extractors
   * @param {User} requestedSource requested By Source Data for checks and avoid the further edits on it by some stranger to protect the integrity
   * @param {Options["packetOptions"]["downloaderOptions"]} options options Downloader Options for extractor's scrapping Options
   * @returns {Promise<Boolean | undefined>} Returns Raw Extractor Data on completion of processing and extracting
   */
  async get(
    rawQuery,
    requestedSource,
    options = Options.packetOptions.downloaderOptions,
  ) {
    if (!(rawQuery && typeof rawQuery === 'string' && rawQuery !== ''))
      return undefined;
    else
      return await this.getPlaydl(
        rawQuery,
        requestedSource,
        options?.playdlOptions,
      );
  }

  /**
   * @method getPlaydl Play-dl extractor Function with repsect to internal functions to support the cause of usage
   * @param {string} rawQuery String Value for fetching/Parsing with the help of extractors
   * @param {User} requestedSource requested By Source Data for checks and avoid the further edits on it by some stranger to protect the integrity
   * @param {Options["packetOptions"]["downloaderOptions"]} options options Downloader Options for extractor's scrapping Options
   * @returns {Promise<Boolean | undefined>} Returns Raw Extractor Data on completion of processing and extracting
   */

  async getPlaydl(
    rawQuery,
    requestedSource,
    options = Options.packetOptions.downloaderOptions,
  ) {
    this.eventEmitter.emitDebug(
      'playdl - Extractor',
      'Making Request to playdl extractors for parsing and fetch required Track Data',
      {
        rawQuery,
        requestedSource,
        downloaderOptions: options,
      },
    );
    await this.playdl.exec(rawQuery, {
      ...options,
      eventReturn: {
        metadata: { requestedSource },
      },
      streamDownload: true,
    });
    return true;
  }
}

module.exports = downloader;
