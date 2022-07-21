const { AudioPlayerStatus } = require('@discordjs/voice');
const { Track } = require('../enum/fetchRecords');
const packets = require('../gen/packets');
const { voiceResolver } = require('../utils/snowflakes');
const voiceMod = require('../utils/voiceMod');
const player = require('./player');

class queue {
  /**
   *
   * @param {string | number} guildId
   * @param {object<any>} options
   * @param {player} player
   */
  constructor(guildId, options, player) {
    this.guildId = guildId;
    this.options = options;
    this.player = player;
    this.eventEmitter = player?.eventEmitter;
    this.discordClient = this.player?.discordClient;
    this.destroyed = false;
    this.voiceMod = new voiceMod(player);
    this.packet = new packets(this, options?.packetOptions);

    this.discordClient.on('voiceStateUpdate', async (oldState, newState) => (oldState?.guild?.id !== this.guildId &&
      newState?.guild?.id !== this.guildId &&
      newState?.channelId !== oldState?.channelId
      ? await this.packet.__voiceHandler(
        oldState,
        newState,
        this.options?.voiceOptions,
      )
      : undefined));
  }

  async play(rawQuery, voiceSnowflake, requestedBy, options) {
    try {
      if (!(rawQuery && typeof rawQuery === 'string' && rawQuery !== ''))
        throw new TypeError(
          '[ Invalid Raw Query ] : Wrong Query for Songs is Detected for queue.play()',
        );
      const voiceChannel = await voiceResolver(
        this.discordClient,
        voiceSnowflake,
      );
      if (!voiceChannel)
        throw new TypeError(
          '[ Invalid Voice Channel ] : Wrong Voice Channel Snowflake/Resolve is Detected for queue.play()',
        );
      this.eventEmitter.emitDebug(
        'Packet get Request',
        'Request for backend Work to be Handled by packet of Queue',
        {
          rawQuery,
          packet: this.packet,
        },
      );
      this.packet =
        this.packet ??
        new packets(
          this,
          options?.packetOptions ?? this.options?.packetOptions,
        );
      return await this.packet?.getQuery(
        rawQuery,
        voiceChannel,
        requestedBy,
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

  async skip(forceSkip = false, trackCount = 1) {
    try {
      if (this.destroyed || !this?.packet?.audioPlayer?.state?.status)
        throw new Error('[Destroyed Queue] : Queue has been destroyed already');
      else if (
        !(
          trackCount &&
          !isNaN(Number(trackCount)) &&
          Number(trackCount) <= this.tracks?.length
        )
      )
        throw new Error(
          '[Invalid Track-Count] : Track Count has Invalid Counts to skip on queue.tracks',
        );
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

  async stop(forceStop = false, preserveTracks = false) {
    try {
      if (this.destroyed || !this?.packet?.audioPlayer?.state?.status)
        throw new Error('[Destroyed Queue] : Queue has been destroyed already');
      this.packet.__cacheAndCleanTracks(
        { startIndex: 0, cleanTracks: this.tracks?.length },
        preserveTracks ? this.tracks?.length : 0,
      );
      this.packet?.audioPlayer?.stop((Boolean(forceStop) ?? false) || false);
      return true;
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
