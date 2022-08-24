const {
  AudioPlayerStatus,
  VoiceConnection,
  getVoiceConnection,
} = require('@discordjs/voice');
const {
  Client,
  VoiceChannel,
  Message,
  CommandInteraction,
  StageChannel,
} = require('discord.js');
const { Track, Options } = require('../misc/enums');
const packets = require('../gen/packets');
const eventEmitter = require('../utils/eventEmitter');
const player = require('./player');
const {
  destroyedQueue,
  invalidQuery,
  invalidTracksCount,
  notPlaying,
  noMemoryLeakModeError,
} = require('../misc/errorEvents');
const { watchDestroyed, readableTime } = require('../utils/miscUtils');

class queue {
  /**
   * @constructor
   * @param {string | number} guildId Discord Guild Id for queue creation
   * @param {Options} options Queue Creation/Destruction Options + packet,downlaoder Options and even more options for caching
   * @param {player} player Actual player Instance for bring forth sub properties cached with it
   */
  constructor(guildId, options = Options, player) {
    /**
     * Discord Guild Id for queue creation
     * @type {string | number}
     * @readonly
     */
    this.guildId = guildId;

    /**
     * Queue Creation/Destruction Options + packet,downlaoder Options and even more options for caching
     * @type {Options}
     * @readonly
     */
    this.options = options;

    /**
     * Actual player Instance for bring forth sub properties cached with it
     * @type {player}
     * @readonly
     */
    this.player = player;

    /**
     * Event Emitter Instance for Distributing Events based Info to the Users abou the Framework and Progress of certain Request
     * @type {eventEmitter}
     * @readonly
     */
    this.eventEmitter = player?.eventEmitter;

    /**
     * Discord Client Instance for Discord Bot for Interaction with Discord Api
     * @type {Client}
     * @readonly
     */
    this.discordClient = this.player?.discordClient;

    /**
     * Queue Destroyed Status for checking wheather progress or functions to flow or emit error
     * @type {Boolean}
     * @readonly
     */
    this.destroyed = false;

    /**
     * Packet Instance for moderating backend manupulation and request handlers and handle massive functions and events
     * @type {packets}
     * @readonly
     */
    this.packet = new packets(this, options?.packetOptions);
  }

  /**
   * @method play Play Method of Queue Class to play raw Query Info after processing and fetch from web using extractors
   * @param {string} rawQuery String Value for fetching/Parsing with the help of extractors
   * @param {string | number | VoiceChannel | StageChannel | Message} voiceSnowflake voice Channel Snowflake in terms of further resolving value using in-built resolvers to connect to play song on it
   * @param {string | number | Message | CommandInteraction } requestedSource requested By Source Data for checks and avoid the further edits on it by some stranger to protect the integrity
   * @param {Options} options queue/play Options for further requirements
   * @returns {Promise<Boolean | undefined>} Returns extractor Data based on progress or undefined
   */

  async play(rawQuery, voiceSnowflake, requestedSource, options = Options) {
    try {
      if (watchDestroyed(this))
        throw new destroyedQueue('Queue has been destroyed already');
      else if (!(rawQuery && typeof rawQuery === 'string' && rawQuery !== ''))
        throw new invalidQuery();

      this.eventEmitter.emitDebug(
        'Packet get Request',
        'Request for backend Work to be Handled by packet of Queue',
        {
          rawQuery,
          packet: this.packet,
        },
      );
      if (!(this.packet && !this.packet?.destroyed))
        this.packet = new packets(
          this,
          options?.packetOptions ?? this.options?.packetOptions,
        );

      return await this.packet?.getQuery(
        rawQuery,
        voiceSnowflake,
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
   * @param {Boolean | true} forceSkip Forced Skip to even fast skip the ending silence paddings for smooth audio play
   * @param {Number | 1} trackCount Tracks Count to skip to in the queue.tracks array
   * @returns {Promise<Boolean | undefined>}  Returns Boolean or undefined on failure or success rate!
   */

  async skip(forceSkip = true, trackCount = 1) {
    try {
      if (watchDestroyed(this)) throw new destroyedQueue();
      else if (!this.working) throw new notPlaying();
      else if (this.tracks?.length < 2) return undefined;
      else if (
        !(
          trackCount &&
          !isNaN(Number(trackCount)) &&
          Number(trackCount) <= this.tracks?.length
        )
      )
        throw new invalidTracksCount();
      else if (parseInt(trackCount) > 1)
        this.packet.__cacheAndCleanTracks(
          { startIndex: 0, cleanTracks: trackCount - 1 },
          trackCount,
        );
      return this.packet?.audioPlayer?.stop(Boolean(forceSkip) ?? true);
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
   * @param {Boolean | true} forceStop Forced Stop to even fast Stop the ending silence paddings for smooth audio play
   * @param {Boolean | false} preserveTracks Tracks to save even after Queue got stoppped for new packet
   * @returns {Promise<Boolean | undefined>} Returns Boolean or undefined on failure or success rate!
   */

  async stop(forceStop = true, preserveTracks = false) {
    try {
      if (watchDestroyed(this)) throw new destroyedQueue();
      else if (!this.current || !this.working) throw new notPlaying();
      this.packet.__cacheAndCleanTracks(
        { startIndex: 1, cleanTracks: this.tracks?.length },
        preserveTracks ? this.tracks?.length : 0,
      );
      this.packet?.audioPlayer?.stop((Boolean(forceStop) ?? true) || true);
      return true;
    } catch (errorMetadata) {
      this.eventEmitter.emitError(
        errorMetadata,
        ' - Please create new Queue for specific Guild if destroyed',
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
    if (watchDestroyed(this)) throw new destroyedQueue();
    else this.packet.extractorDataManager();
    const timeOutIdResidue = await this.packet?.voiceMod?.disconnect(
      this.guildId,
      {
        destroy: Boolean(destroyConnection),
        delayVoiceTimeout,
      },
      this.tracks?.find((t) => t.requestedSource)?.requestedSource,
    );
    this.eventEmitter?.emitEvent(
      'destroyedQueue',
      'Queue got Destroyed in the Player',
      {
        queue,
        timeOutId: timeOutIdResidue,
        requestedSource: this.tracks?.find((t) => t.requestedSource)
          ?.requestedSource,
      },
    );
    if (this.packet) {
      this.packet.__perfectClean();
      delete this.packet;
    }
    this.destroyed = timeOutIdResidue ?? true;
    return true;
  }

  /**
   * @method pause Pause Audio Player of the Queue
   * @returns {Boolean} Returns true for Success and false for Failure operation
   */

  pause() {
    try {
      if (watchDestroyed(this)) throw new destroyedQueue();
      else if (!(this.current && this.playing)) throw new notPlaying();
      else if (!this.paused) return undefined;
      return this.packet?.audioPlayer?.pause(true);
    } catch (errorMetadata) {
      this.eventEmitter.emitError(
        errorMetadata,
        undefined,
        'queue.pause()',
        {
          queue: this,
        },
        this.options?.eventOptions,
      );
      return undefined;
    }
  }

  /**
   * @method unpause Un-Pause Audio Player of the Queue
   * @returns {Boolean} Returns true for Success and false for Failure operation
   */

  unpause() {
    try {
      if (watchDestroyed(this)) throw new destroyedQueue();
      else if (!this.current) throw new notPlaying();
      else if (this.paused) return undefined;
      return this.packet?.audioPlayer?.unpause();
    } catch (errorMetadata) {
      this.eventEmitter.emitError(
        errorMetadata,
        undefined,
        'queue.unpause()',
        {
          queue: this,
        },
        this.options?.eventOptions,
      );
      return undefined;
    }
  }

  /**
   * @method setVolume Setting Volume of the Audio Player
   * @param {Number} volume Volume in Number in Audio Player
   * @returns {Number | undefined} Volume as residue or undefined on failure
   */

  setVolume(volume = 95) {
    try {
      if (watchDestroyed(this)) throw new destroyedQueue();
      else if (!this.working) throw new notPlaying();
      else if (!this.current) throw new notPlaying();
      else if (this.options?.packetOptions?.noMemoryLeakMode)
        throw new noMemoryLeakModeError();
      else if (
        !(
          this.current?.audioResource?.volume &&
          !isNaN(Number(volume)) &&
          Number(volume) >= 0 &&
          Number(volume) <= 100 &&
          this.volume !== Number(volume)
        )
      )
        return undefined;
      volume = ((parseInt(volume ?? 95) || 95) / 100) * 200;
      this.current.audioResource.volume.setVolume(parseInt(volume) / 1000);
      this.packet.voiceMod.volume = parseInt(volume);
      return volume;
    } catch (errorMetadata) {
      this.eventEmitter.emitError(
        errorMetadata,
        undefined,
        'queue.setVolume()',
        {
          queue: this,
          volume,
        },
        this.options?.eventOptions,
      );
      return undefined;
    }
  }

  /**
   * @method mute Mute the Music Player of the Queue
   * @returns {Boolean} Returns Boolean value on success or failure
   */

  mute() {
    const response = this.setVolume(0);
    if (response || response === 0) return true;
    else return false;
  }

  /**
   * @method unmute Un-Mute the Music Player of the Queue
   * @returns {Boolean} Returns Boolean value on success or failure
   */

  unmute() {
    const response = this.setVolume(100);
    if (response) return true;
    else return false;
  }

  /**
   * @method shuffle Shuffle Method for the Queue
   * @returns {Boolean} Returns Boolean Value on Success and failure
   */

  shuffle() {
    try {
      if (watchDestroyed(this)) throw new destroyedQueue();
      else if (!this.working) throw new notPlaying();
      else if (!this.current) throw new notPlaying();
      const shuffleFunc = (rawArray = []) => {
        for (let i = rawArray.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [rawArray[i], rawArray[j]] = [rawArray[j], rawArray[i]];
        }
        return rawArray;
      };
      return shuffleFunc(this.packet?.tracks);
    } catch (errorMetadata) {
      this.eventEmitter.emitError(
        errorMetadata,
        undefined,
        'queue.shuffle()',
        {
          queue: this,
        },
        this.options?.eventOptions,
      );
      return undefined;
    }
  }

  /**
   * clear() -> Clear Tracks from Queue and Stream Packet
   * @param {Number|String} tracksCount Tracks Count in Queue
   * @returns {Boolean} true if operation emits green signal or undefined for errors
   */

  clear(tracksCount = this.tracks?.length) {
    try {
      if (watchDestroyed(this)) throw new destroyedQueue();
      else if (!this.working) throw new notPlaying();
      else if (!this.current) throw new notPlaying();
      else if (!(tracksCount && typeof tracksCount === 'number'))
        return undefined;
      else if (
        parseInt(tracksCount) >= 1 &&
        parseInt(tracksCount) <= this.tracks?.length
      )
        this.packet.__cacheAndCleanTracks(
          { startIndex: 1, cleanTracks: tracksCount },
          tracksCount,
        );
      else return undefined;
      return true;
    } catch (errorMetadata) {
      this.eventEmitter.emitError(
        errorMetadata,
        undefined,
        'queue.back()',
        {
          queue: this,
          tracksCount,
        },
        this.options?.eventOptions,
      );
      return undefined;
    }
  }

  /**
   * @method back Back Method for the Queue
   * @param {Number | 1} tracksCount Tracks Count for the backing command of the Queue
   * @returns {Promise<Boolean>} Returns Boolean Value on Success and failure
   */

  async back(tracksCount = 1) {
    try {
      if (watchDestroyed(this)) throw new destroyedQueue();
      else if (!this.working) throw new notPlaying();
      else if (!this.current) throw new notPlaying();
      return await this.packet?.__trackMovementManager(tracksCount, 'back');
    } catch (errorMetadata) {
      this.eventEmitter.emitError(
        errorMetadata,
        undefined,
        'queue.back()',
        {
          queue: this,
          tracksCount,
        },
        this.options?.eventOptions,
      );
      return undefined;
    }
  }

  /**
   * Timestamps calculated for queue and tracks and other value for queue
   * @type {Object}
   * @readonly
   */

  get timeStamps() {
    try {
      if (watchDestroyed(this)) throw new destroyedQueue();
      else if (!this.working) throw new notPlaying();
      const timeStamp = {
        currentTrack: {
          total: parseInt(this.current?.duration?.ms ?? 0),
          now:
            parseInt(this.current?.duration?.ms ?? 0) -
            this.current?.audioResource?.playbackDuration,
        },
        previousTrack: {
          total: parseInt(this.previousTrack?.duration?.ms ?? 0),
        },
        nextTrack: { total: parseInt(this.tracks?.[1]?.duration?.ms ?? 0) },
        queue: {
          total: parseInt(
            this.tracks?.reduce(
              (total, current) => total + (current?.duration?.ms ?? 0),
              0,
            ) ?? 0,
          ),
          now:
            parseInt(this.current?.duration?.ms ?? 0) -
            this.current?.audioResource?.playbackDuration,
        },
        previousQueue: {
          total: parseInt(
            this.previousTracks?.reduce(
              (total, current) => total + (current?.duration?.ms ?? 0),
              0,
            ) ?? 0,
          ),
          now:
            parseInt(this.current?.duration?.ms ?? 0) -
            this.current?.audioResource?.playbackDuration +
            parseInt(
              this.previousTracks?.reduce(
                (total, current) => total + (current?.duration?.ms ?? 0),
                0,
              ) ?? 0,
            ),
        },
        totalQueue: {
          total: parseInt(
            [...this.previousTracks, ...this.tracks]?.reduce(
              (total, current) => total + (current?.duration?.ms ?? 0),
              0,
            ) ?? 0,
          ),
          now:
            parseInt(this.current?.duration?.ms ?? 0) -
            this.current?.audioResource?.playbackDuration +
            parseInt(
              this.previousTracks?.reduce(
                (total, current) => total + (current?.duration?.ms ?? 0),
                0,
              ) ?? 0,
            ),
        },
      };
      const generateReadableTime = (rawTimeStamp) => {
        const rawGarbageArray = Object.entries(rawTimeStamp);
        const garbageStructure = {};
        rawGarbageArray.map((data) => {
          garbageStructure[data?.[0]] = {
            ...data?.[1],
            readable: {
              total: data?.[1]?.total
                ? [
                  readableTime(parseInt(data?.[1]?.total ?? 0), 'colon'),
                  readableTime(parseInt(data?.[1]?.total ?? 0), 'big'),
                  readableTime(parseInt(data?.[1]?.total ?? 0), 'small'),
                ]
                : undefined,
              now: data?.[1]?.now
                ? [
                  readableTime(parseInt(data?.[1]?.now ?? 0), 'colon'),
                  readableTime(parseInt(data?.[1]?.now ?? 0), 'big'),
                  readableTime(parseInt(data?.[1]?.now ?? 0), 'small'),
                ]
                : undefined,
            },
          };
          return undefined;
        });
        return garbageStructure;
      };
      return generateReadableTime(timeStamp);
    } catch (errorMetadata) {
      this.eventEmitter.emitError(
        errorMetadata,
        undefined,
        'queue.timeStamps',
        {
          queue: this,
        },
        this.options?.eventOptions,
      );
      return undefined;
    }
  }

  /**
   * Previous Track Data | Same as Queue.current , But Data of previous track
   * @type {Track}
   * @readonly
   */

  get previousTrack() {
    try {
      if (watchDestroyed(this)) throw new destroyedQueue();
      else if (!this.working) throw new notPlaying();
      return this.packet?.previousTracks?.last();
    } catch (errorMetadata) {
      this.eventEmitter.emitError(
        errorMetadata,
        undefined,
        'queue.previousTrack',
        {
          queue: this,
        },
        this.options?.eventOptions,
      );
      return undefined;
    }
  }

  /**
   * Previous Tracks Data | Same as Queue.tracks , But Data of previous track
   * @type {Track[]}
   * @readonly
   */

  get previousTracks() {
    try {
      if (watchDestroyed(this)) throw new destroyedQueue();
      else if (!this.working) throw new notPlaying();
      return Array.from(this.packet?.previousTracks?.reverse()?.values());
    } catch (errorMetadata) {
      this.eventEmitter.emitError(
        errorMetadata,
        undefined,
        'queue.previousTracks',
        {
          queue: this,
        },
        this.options?.eventOptions,
      );
      return undefined;
    }
  }

  /**
   * Voice Connection of the Queue Synced
   * @type {VoiceConnection}
   * @readonly
   */

  get voiceConnection() {
    if (!this.guildId) return undefined;
    else return getVoiceConnection(this.guildId);
  }

  /**
   * Audio Player's Volume for the Queue
   * @type {Number}
   * @readonly
   */

  get volume() {
    if (watchDestroyed(this)) return undefined;
    return this.packet?.voiceMod?.volume ?? 95;
  }

  /**
   * Audio Player's Non-Idle/Activity's Status as Boolean
   * @type {Boolean}
   * @readonly
   */

  get working() {
    if (this.destroyed || !this?.packet?.audioPlayer?.state?.status)
      return false;
    else
      return this.packet?.audioPlayer?.state?.status !== AudioPlayerStatus.Idle;
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
      return (
        this.packet?.audioPlayer?.state?.status === AudioPlayerStatus.Playing
      );
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
        this.packet?.audioPlayer?.state?.status === AudioPlayerStatus.Paused ||
        this.packet?.audioPlayer?.state?.status === AudioPlayerStatus.AutoPaused
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
    if (this.destroyed || !this.packet?.tracks?.first()) return undefined;
    else return Array.from(this.packet?.tracks?.values());
  }
}

module.exports = queue;
