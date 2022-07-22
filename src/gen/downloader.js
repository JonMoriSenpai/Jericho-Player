const { User } = require('discord.js');
const { playdl } = require('playdl-music-extractor');
const player = require('../core/player');
const queue = require('../core/queue');
const eventEmitter = require('../utils/eventEmitter');
const packets = require('./packets');

/**
 * @class downloader -> Downloader Class for fetching Tracks and Playlist data (if any) from raw Query using user-defined extractors or default extractors
 */
class downloader {
  /**
   * @constructor
   * @param {packets} packet Packet Instance for moderating backend manupulation and request handlers and handle massive functions and events
   * @param {object} options Downloader Options for extractor's scrapping Options
   */
  constructor(packet, options) {
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
     * @type {object} options Downloader Options for extractor's scrapping Options
     * @readonly
     */
    this.options = options;

    /**
     * @type {playdl} Play-dl Class Instance for making solid and proper tunneled request inter-exchange
     */
    this.playdl = new playdl(options?.playdlOptions);

    this.playdl.on('album', (playlist) => (playlist ? this.packet?.__playlistMod(playlist) : undefined));

    this.playdl.on(
      'track',
      async (extractor, playlist, rawTrack, metadata) => await this.packet.__tracksMod(extractor, playlist, rawTrack, metadata),
    );
  }

  /**
   * @method get Get Tracks Data or triggering track event for Tracks Mod
   * @param {string} rawQuery String Value for fetching/Parsing with the help of extractors
   * @param {User} requestedBy requested By User Data for checks and avoid the further edits on it by some stranger to protect the integrity
   * @param {object} options options Downloader Options for extractor's scrapping Options
   * @returns {Promise<Boolean | undefined>} Returns Raw Extractor Data on completion of processing and extracting
   */
  async get(rawQuery, requestedBy, options) {
    if (!(rawQuery && typeof rawQuery === 'string' && rawQuery !== ''))
      return undefined;
    else
      return await this.getPlaydl(
        rawQuery,
        requestedBy,
        options?.playdlOptions,
      );
  }

  /**
   * @method getPlaydl Play-dl extractor Function with repsect to internal functions to support the cause of usage
   * @param {string} rawQuery String Value for fetching/Parsing with the help of extractors
   * @param {User} requestedBy requested By User Data for checks and avoid the further edits on it by some stranger to protect the integrity
   * @param {object} options options Downloader Options for extractor's scrapping Options
   * @returns {Promise<Boolean | undefined>} Returns Raw Extractor Data on completion of processing and extracting
   */

  async getPlaydl(rawQuery, requestedBy, options) {
    this.eventEmitter.emitDebug(
      'playdl - Extractor',
      'Making Request to playdl extractors for parsing and fetch required Track Data',
      {
        rawQuery,
        downloaderOptions: options,
      },
    );
    await this.playdl.exec(rawQuery, {
      ...options,
      eventReturn: {
        metadata: { requestedBy },
      },
      streamDownload: true,
    });
    return true;
  }
}

module.exports = downloader;
