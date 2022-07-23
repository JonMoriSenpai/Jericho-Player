const { AudioPlayerStatus } = require('@discordjs/voice');
const {
  Client,
  VoiceChannel,
  Message,
  CommandInteraction,
  StageChannel,
} = require('discord.js');
const { Track } = require('../misc/enums');
const packets = require('../gen/packets');
const eventEmitter = require('../utils/eventEmitter');
const { voiceResolver } = require('../utils/snowflakes');
const voiceMod = require('../utils/voiceMod');
const player = require('./player');
const {
  destroyedQueue,
  invalidQuery,
  invalidVoiceChannel,
  invalidTracksCount,
} = require('../misc/errorEvents');

/**
 * @class queue -> Queue Class for making virtual space for per Discord Guild for making a non-conflicting connectionsn and requests from various stuff and web intefs
 */
class queue {
  /**
   * @constructor
   * @param {string | number} guildId Discord Guild Id for queue creation
   * @param {object} options Queue Creation/Destruction Options + packet,downlaoder Options and even more options for caching
   * @param {player} player Actual player Instance for bring forth sub properties cached with it
   */
  constructor(guildId, options, player) {
    /**
     * @type {string | number} Discord Guild Id for queue creation
     * @readonly
     */
    this.guildId = guildId;

    /**
     * @type {object} Queue Creation/Destruction Options + packet,downlaoder Options and even more options for caching
     * @readonly
     */
    this.options = options;

    /**
     * @type {player} Actual player Instance for bring forth sub properties cached with it
     * @readonly
     */
    this.player = player;

    /**
     * @type {eventEmitter} Event Emitter Instance for Distributing Events based Info to the Users abou the Framework and Progress of certain Request
     * @readonly
     */
    this.eventEmitter = player?.eventEmitter;

    /**
     * @type {Client} Discord Client Instance for Discord Bot for Interaction with Discord Api
     * @readonly
     */
    this.discordClient = this.player?.discordClient;

    /**
     * @type {Boolean} Queue Destroyed Status for checking wheather progress or functions to flow or emit error
     * @readonly
     */
    this.destroyed = false;

    /**
     * @type {voiceMod} Voice Moderator for connecting and disconnecting from voice Channel
     * @readonly
     */
    this.voiceMod = new voiceMod(this, options?.voiceOptions);

    /**
     * @type {packets} Packet Instance for moderating backend manupulation and request handlers and handle massive functions and events
     * @readonly
     */
    this.packet = new packets(this, options?.packetOptions);
  }

  /**
   * @method play Play Method of Queue Class to play raw Query Info after processing and fetch from web using extractors
   * @param {string} rawQuery String Value for fetching/Parsing with the help of extractors
   * @param {string | number | VoiceChannel | StageChannel | Message} voiceSnowflake voice Channel Snowflake in terms of further resolving value using in-built resolvers to connect to play song on it
   * @param {string | number | Message | CommandInteraction } requestedSource requested By Source Data for checks and avoid the further edits on it by some stranger to protect the integrity
   * @param {object} options queue/play Options for further requirements
   * @returns {Promise<Boolean | undefined>} Returns extractor Data based on progress or undefined
   */

  async play(rawQuery, voiceSnowflake, requestedSource, options) {
    try {
      if (this.destroyed)
        throw new destroyedQueue('Queue has been destroyed already');
      else if (!(rawQuery && typeof rawQuery === 'string' && rawQuery !== ''))
        throw new invalidQuery();
      const voiceChannel = await voiceResolver(
        this.discordClient,
        voiceSnowflake,
      );
      if (!voiceChannel) throw new invalidVoiceChannel();
      this.eventEmitter.emitDebug(
        'Packet get Request',
        'Request for backend Work to be Handled by packet of Queue',
        {
          rawQuery,
          packet: this.packet,
        },
      );
      if (!(this.packet && this.packet?.destroyed))
        this.packet = new packets(
          this,
          options?.packetOptions ?? this.options?.packetOptions,
        );
      return await this.packet?.getQuery(
        rawQuery,
        voiceChannel,
        requestedSource,
        options?.packetOptions,
      );
    } catch (errorMetadata) {
      this.eventEmitter.emitError(
        errorMetadata,
        ' - Provide Correct Query or Voice Channel for Connection and Audio Processing\n - Provide Correct Raw Query for Songs like Url or Simple Query from Supported Platforms',
        'queue.play()',
        {
          rawQuery,
          voiceSnowflake,
          queue: this,
          options,
        },
        options?.eventOptions,
      );
      return undefined;
    }
  }

  /**
   * @method skip Skipping Current Track to specified Track-Counts or by-default on next song
   * @param {Boolean | false} forceSkip Forced Skip to even fast skip the ending silence paddings for smooth audio play
   * @param {Number | 1} trackCount Tracks Count to skip to in the queue.tracks array
   * @returns {Promise<Boolean | undefined>}  Returns Boolean or undefined on failure or success rate!
   */

  async skip(forceSkip = false, trackCount = 1) {
    try {
      if (this.destroyed || !this?.packet?.audioPlayer?.state?.status)
        throw new destroyedQueue();
      else if (
        !(
          trackCount &&
          !isNaN(Number(trackCount)) &&
          Number(trackCount) <= this.tracks?.length
        )
      )
        throw new invalidTracksCount();
      this.packet.__cacheAndCleanTracks(
        { startIndex: 0, cleanTracks: trackCount },
        1,
      );
      this.packet?.audioPlayer?.stop((Boolean(forceSkip) ?? false) || false);
      return true;
    } catch (errorMetadata) {
      this.eventEmitter.emitError(
        errorMetadata,
        ' - Please create new Queue for specific Guild if destroyed\n - Check if trackIndex is correct based/under on actual queue.tracks length',
        'queue.skip()',
        { forceSkip, trackCount, queue: this },
        this.options?.eventOptions,
      );
      return undefined;
    }
  }

  /**
   * @method stop Stopping Current Track along side with Queue to a complete silence with cleaning
   * @param {Boolean | false} forceStop Forced Stop to even fast Stop the ending silence paddings for smooth audio play
   * @param {Boolean | false} preserveTracks Tracks to save even after Queue got stoppped for new packet
   * @returns {Promise<Boolean | undefined>} Returns Boolean or undefined on failure or success rate!
   */

  async stop(forceStop = false, preserveTracks = false) {
    try {
      if (this.destroyed || !this?.packet?.audioPlayer?.state?.status)
        throw new destroyedQueue();
      this.packet.__cacheAndCleanTracks(
        { startIndex: 0, cleanTracks: this.tracks?.length },
        preserveTracks ? this.tracks?.length : 0,
      );
      this.packet?.audioPlayer?.stop((Boolean(forceStop) ?? false) || false);
      return await this.destroy();
    } catch (errorMetadata) {
      this.eventEmitter.emitError(
        errorMetadata,
        ' - Please create new Queue for specific Guild if destroyed\n - Check if trackIndex is correct based/under on actual queue.tracks length',
        'queue.stop()',
        {
          forceStop,
          preserveTracks,
          queue: this,
        },
        this.options?.eventOptions,
      );
      return undefined;
    }
  }

  /**
   * @method destroy Destroy packet and internal workings of queue register/caches and with a complete clearence and even clear backend caches to remove all connections from every request or handlers (if any)
   * @param {Number | 0} delayVoiceTimeout Delay Timeout for delaying after the destruction of queue of voice Connection from voice Channel
   * @param {Boolean | false} destroyConnection Destroy Voice Connection properly in @discordjs/voice Package
   * @returns {Promise<Boolean | undefined>} Returns Boolean or undefined on failure or success rate!
   */
  async destroy(delayVoiceTimeout = 0, destroyConnection = false) {
    if (this.destroyed) throw new destroyedQueue();
    const timeOutIdResidue = await this.voiceMod.disconnect(
      this.guildId,
      {
        destroy: Boolean(destroyConnection),
        delayVoiceTimeout,
      },
      this.tracks?.find((t) => t.requestedSource)?.requestedSource,
    );
    this.packet.__perfectClean();
    delete this.packet;
    this.destroyed = timeOutIdResidue;
    return true;
  }

  /**
   * Audio Player's Playing/Activity's Status as Boolean
   * @type {Boolean}
   * @readonly
   */

  get playing() {
    if (this.destroyed || !this?.packet?.audioPlayer?.state?.status)
      return false;
    else
      return this.packet?.audioPlayer?.state?.status !== AudioPlayerStatus.Idle;
  }

  /**
   * Audio Player's Paused's Status as Boolean
   * @type {Boolean}
   * @readonly
   */
  get paused() {
    if (!this.packet?.audioPlayer?.state?.status) return false;
    else
      return (
        this.packet?.audioPlayer.state.status === AudioPlayerStatus.Paused ||
        this.packet?.audioPlayer.state.status === AudioPlayerStatus.AutoPaused
      );
  }
  /**
   * Returns Current Track Cached in Packet or Queue.tracks
   * @type {Track}
   * @readonly
   */

  get current() {
    if (this.destroyed || !this.tracks?.[0]) return undefined;
    else return this.tracks?.[0];
  }

  /**
   * Returns Tracks Cached Metadata from packet
   * @type {Track[]}
   * @readonly
   */
  get tracks() {
    if (this.destroyed || !this.packet?.tracksMetadata?.[0]?.track)
      return undefined;
    else return this.packet?.tracksMetadata?.map((ob) => ob?.track);
  }
}

module.exports = queue;
