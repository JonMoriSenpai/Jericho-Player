const {
  createAudioPlayer,
  createAudioResource,
  StreamType,
  entersState,
  AudioPlayerStatus,
  getVoiceConnection,
  AudioPlayer,
  AudioPlayerState,
} = require('@discordjs/voice');

const {
  Message,
  CommandInteraction,
  VoiceChannel,
  StageChannel,
} = require('discord.js');

const queue = require('../core/queue');
const downloader = require('./downloader');
const {
  Track,
  Playlist,
  Options,
  packetOptions,
  packetPrivateCaches,
} = require('../misc/enums');
const {
  voiceResolver,
  messageResolver,
  interactionResolver,
} = require('../utils/snowflakes');
const player = require('../core/player');
const eventEmitter = require('../utils/eventEmitter');
const voiceMod = require('../utils/voiceMod');
const {
  invalidRequiredSource,
  invalidVoiceChannel,
} = require('../misc/errorEvents');

/**
 * @class packets -> Packets Class is for stream-packet of queue where it handles every backend request handlers without affecting the
 */
class packets {
  /**
   * @constructor
   * @param {queue} queue Actual Related or Source Queue Data for fetching sub-property infos
   * @param {packetOptions} options Options for backend stuffs
   */
  constructor(queue, options = Options.packetOptions) {
    /**
     * Actual Related or Source Queue Data for fetching sub-property infos
     * @type {queue}
     * @readonly
     */
    this.queue = queue;

    /**
     * Discord Guild Id Data for checks of voiceState Updates
     * @type {string | number}
     * @readonly
     */
    this.guildId = queue?.guildId;

    /**
     * Cached Options for backend stuffs
     * @type {packetOptions}
     * @readonly
     */
    this.options = options;

    /**
     * Actual Player for event Emitter and other sub-propeties works
     * @type {player}
     * @readonly
     */
    this.player = queue?.player;

    /**
     * Actual Event Emitter for emitting events based on better events handling
     * @type {eventEmitter}
     * @readonly
     */
    this.eventEmitter = queue?.eventEmitter;

    /**
     * Actual Voice Channel Moderator on better voice Connections handling
     * @type {voiceMod}
     * @readonly
     */
    this.voiceMod = queue?.voiceMod;

    /**
     * Actual Audio Player for subscription and play Audio Resource
     * @type {AudioPlayer}
     * @readonly
     */
    this.audioPlayer = createAudioPlayer();

    /**
     * Array of Tracks and Stream-Data for backend tracks usage
     * @type {object[]}
     * @readonly
     */
    this.tracksMetadata = [];

    /**
     * Comprise of private caches and settings for rare used stuff or misc stuff
     * @type {packetPrivateCaches}
     * @readonly
     */
    this.__privateCaches = packetPrivateCaches;

    /**
     * Downloader Class Instance for extractors works and fetching of tracks from raw Query and other stuff
     * @type {downloader}
     * @readonly
     */
    this.downloader = new downloader(this, options?.downloaderOptions);

    this.audioPlayer.on(
      'stateChange',
      async (oldState, newState) => await this.__audioPlayerStateMod(oldState, newState),
    );
  }

  /**
   * @method getQuery Fetching Tracks Data and Playlist Data Request from extractors using downloader class
   * @param {string} rawQuery String Value for fetching/Parsing with the help of extractors
   * @param {string | number | VoiceChannel | StageChannel | Message} voiceSnowflake voice Channel Snowflake in terms of further resolving value using in-built resolvers to connect to play song on it
   * @param {string | number | Message | CommandInteraction } requestedSource requested By Source Data for checks and avoid the further edits on it by some stranger to protect the integrity
   * @param {Options["packetOptions"]} options packets Options for further requirements
   * @returns {Promise<Boolean | undefined>} Returns Extractor Data from the defalt extractors
   */

  async getQuery(
    rawQuery,
    voiceSnowflake,
    requestedSource,
    options = Options?.packetOptions,
  ) {
    try {
      if (this.destroyed) return undefined;
      else if (!(rawQuery && typeof rawQuery === 'string' && rawQuery !== ''))
        return undefined;
      requestedSource =
        interactionResolver(this.player?.discordClient, requestedSource) ??
        (await messageResolver(this.player?.discordClient, requestedSource));
      if (
        !requestedSource ||
        (requestedSource &&
          (requestedSource?.user?.bot ||
            requestedSource?.author?.bot ||
            requestedSource?.member?.bot ||
            requestedSource?.member?.user?.bot))
      )
        throw new invalidRequiredSource();
      voiceSnowflake = await voiceResolver(
        this.queue?.discordClient,
        voiceSnowflake,
      );
      if (
        !voiceSnowflake ||
        (voiceSnowflake && requestedSource?.guildId !== voiceSnowflake?.guildId)
      )
        throw new invalidVoiceChannel();
      this.eventEmitter.emitDebug(
        'voiceChannel Resolver',
        'Resolving Voice Snowflake Value for actual Voice Channel Data for Audio Player and Voice Connection',
        {
          voiceSnowflake,
        },
      );
      await this.voiceMod?.connect(voiceSnowflake, requestedSource);
      this.eventEmitter.emitDebug(
        'Downloader',
        'Making Request to default extractors for parsing and fetch required Track Data',
        {
          rawQuery,
          downloaderOptions: options?.downloaderOptions,
        },
      );
      return await this.downloader.get(
        rawQuery,
        requestedSource,
        options?.downloaderOptions,
      );
    } catch (errorMetadata) {
      this.eventEmitter.emitError(
        errorMetadata,
        ' - Provide Correct Query or Voice Channel for Connection and Audio Processing\n - Provide Correct Raw Query for Songs like Url or Simple Query from Supported Platforms\n - Provide Correct User Data on requested By Data for resolve and internals Matters',
        'packets.generate()',
        {
          rawQuery,
          voiceSnowflake,
          options,
        },
        options?.eventOptions,
      );
      return undefined;
    }
  }

  /**
   * @private
   * @method __audioPlayerStateMod Audio Player Status Update Event Handler for further decision makings on queue.tracks
   * @param {AudioPlayerState} oldState Audio Player State for checkinga and take further decisons of if and else
   * @param {AudioPlayerState} newState Audio Player State for checkinga and take further decisons of if and else
   * @returns {Promise<Boolean | undefined>} Returns Boolean or undefined on failure or success rate!
   */

  async __audioPlayerStateMod(oldState, newState) {
    if (this.destroyed) return undefined;
    else if (newState?.status === AudioPlayerStatus.Idle) {
      this.eventEmitter.emitDebug(
        'AudioPlayerStatus Idle Status',
        'If Player went Idle on status Update event - changes required',
        {
          newState,
        },
      );
      this.eventEmitter.emitEvent(
        'trackEnd',
        'Previous Track has been Ended Now',
        {
          queue: this.queue,
          track: this.tracksMetadata?.[0]?.track,
          user: this.tracksMetadata?.[0]?.track?.user,
          remainingTracks: this.tracksMetadata?.slice(1) ?? [],
          requestedSource: this.tracksMetadata?.[0]?.track?.requestedSource,
        },
      );
      this.__cacheAndCleanTracks();
      if (this.tracksMetadata?.length > 0)
        return await this.__audioResourceMod();
      else if (this.tracksMetadata?.length === 0) {
        const lastTrack =
          this.__privateCaches?.completedTracksMetadata?.length > 1
            ? this.__privateCaches?.completedTracksMetadata?.[
              this.__privateCaches?.completedTracksMetadata?.length - 1
            ]
            : undefined;
        this.eventEmitter.emitEvent(
          'queueEnd',
          'Tracks Queue has been Ended with no Tracks left to play',
          {
            queue: this.queue,
            track: lastTrack,
            user: lastTrack?.user,
            previousTracks: this.__privateCaches?.completedTracksMetadata,
            requestedSource: lastTrack?.requestedSource,
          },
        );
        this.__privateCaches.completedTracksMetadata = [];
      }
      return undefined;
    } else return undefined;
  }

  /**
   * @method __cacheAndCleanTracks Cache and Clean Tracks on Track End event Trigger/Requirement
   * @param {object} trackOptions Track Cleaning Options with start and clean options , just like splice function arguments
   * @param {number | 1} preserveTracks Preserving Tracks in completedTracks Cache Data for further use like back or autoplay to avoid giving un-neccassay repeatitions
   * @returns {Boolean | undefined} Returns Boolean or undefined on failure or success rate!
   */
  __cacheAndCleanTracks(
    trackOptions = { startIndex: 0, cleanTracks: 1 },
    preserveTracks = 1,
  ) {
    if (this.destroyed) return undefined;
    else if (
      !this.tracksMetadata?.[0] ||
      trackOptions?.cleanTracks > this.tracksMetadata?.length
    )
      return undefined;
    this.eventEmitter.emitDebug(
      'Cleaning Track Request',
      'Cleaning Used/Processed Track for Audio Resource Mod to Process',
      {
        trackOptions,
      },
    );
    const leftOutTracks = this.tracksMetadata.splice(
      trackOptions?.startIndex,
      trackOptions?.cleanTracks,
    );
    if (!isNaN(Number(preserveTracks)) && Number(preserveTracks) === 1)
      this.__privateCaches.completedTracksMetadata.push(
        leftOutTracks?.[0]?.track,
      );
    else if (!isNaN(Number(preserveTracks)) && Number(preserveTracks) > 1)
      this.__privateCaches.completedTracksMetadata.push(
        leftOutTracks
          ?.slice(0, Number(preserveTracks))
          .map((ob) => ob?.track)
          ?.filter(Boolean),
      );
    else return undefined;
    return true;
  }

  /**
   * @private
   * @method __audioResourceMod Audio Resource Moderator for fetching and making of Audio Resource and play in on AudioPlayer and generate Player Subscription
   * @param {Track} rawTrackData Track Metadata consist of Track and Stream-Data to be precise for events and creation of audio resource
   * @returns {Promise<Boolean | undefined>} Returns Boolean or undefined on failure or success rate!
   */

  async __audioResourceMod(rawTrackData = this.tracksMetadata?.[0]) {
    try {
      if (this.destroyed) return undefined;
      const streamData = rawTrackData?.streamData;
      if (!streamData) return undefined;
      this.eventEmitter.emitDebug(
        'Audio Resource',
        'new Audio Resource will be Created for Audio Player to Play',
        {
          streamData,
        },
      );
      rawTrackData.track.audioResource = createAudioResource(
        streamData?.stream?.buffer,
        {
          inputType: streamData?.type ?? StreamType.Arbitrary,
        },
      );
      rawTrackData.track.audioResource.volume.setVolume(
        (this.__privateCaches.volumeMetadata ?? 95) / 1000,
      );
      this.audioPlayer.play(rawTrackData.track.audioResource);
      await entersState(this.audioPlayer, AudioPlayerStatus.Playing, 2e3);
      const voiceConnection = getVoiceConnection(this.guildId);
      this.eventEmitter.emitEvent(
        'trackStart',
        'Processed Track will be Played now within few seconds',
        {
          queue: this.queue,
          track: rawTrackData?.track,
          user: rawTrackData?.track?.user,
          requestedSource: rawTrackData?.track?.requestedSource,
        },
      );
      this.__privateCaches.audioPlayerSubscription = voiceConnection.subscribe(
        this.audioPlayer,
      );
      this.eventEmitter.emitDebug(
        'Subscription Created',
        'Player Susbcription has been Created and Discord Client started playing Songs in Voice Channel',
        {
          voiceConnection,
          streamData,
          queue: this.queue,
          packet: this,
        },
      );

      return true;
    } catch (errorMetadata) {
      this.eventEmitter.emitError(
        errorMetadata,
        undefined,
        {
          rawTrackData,
        },
        this.options?.eventOptions,
      );
      return undefined;
    }
  }

  /**
   * @method __playlistMod Playlist Moderator for events and parsing raw Playlist/Album Data
   * @param {object} playlist Playlist raw Data from extractors with tracks Data (if any)
   * @returns {Boolean} Returns Boolean or undefined on failure or success rate!
   */

  __playlistMod(playlist) {
    if (this.destroyed) return undefined;
    const parsedPlaylist = new Playlist(playlist);
    return this.eventEmitter.emitEvent(
      'playlistAdd',
      'Playlist has been recognised and related tracks will be slowly added to caches',
      {
        queue: this.queue,
        playlist: parsedPlaylist,
        user: parsedPlaylist?.user,
        requestedSource: parsedPlaylist?.requestedSource,
      },
    );
  }

  /**
   * @method __tracksMod Tracks Moderator for events and parsing raw Tracks Data from default extractors
   * @param {string} extractor Extractor Data's name for checking the source of the data
   * @param {Playlist} playlist Related Playlist Data from extractor
   * @param {Track} rawTrack Raw Track Data for Parsinga and fetched from extractors for audio Resource
   * @param {object} metadata Metadata Value to be repaired after getting operation object value
   * @returns {Promise<Boolean | undefined>} Returns Boolean or undefined on failure or success rate!
   */

  async __tracksMod(extractor, playlist, rawTrack, metadata) {
    try {
      if (this.destroyed) return undefined;
      this.eventEmitter.emitDebug(
        'Tracks Modification',
        'Tracks and Streams will be Modified for Audio Player',
        {
          rawTrack,
          playlist: new Playlist(playlist),
          extractor,
          metadata,
        },
      );
      const track = new Track(rawTrack);
      const streamData = track?.__getStream(true);
      this.tracksMetadata.push({ track, streamData });
      if (!track.playlistId)
        this.eventEmitter.emitEvent(
          'trackAdd',
          'Tracks has been Added to Cache for Further Modification',
          {
            queue: this.queue,
            track,
            playlist: new Playlist(playlist),
            user: track?.user,
            tracks: this.queue?.tracks,
            requestedSource: track?.requestedSource,
          },
        );
      if (this.tracksMetadata?.length === 1) await this.__audioResourceMod();
      return true;
    } catch (errorMetadata) {
      this.eventEmitter.emitError(
        errorMetadata,
        undefined,
        {
          extractor,
          playlist,
          rawTrack,
          metadata,
        },
        this.options?.eventOptions,
      );
      return undefined;
    }
  }

  /**
   * @method __perfectClean Perfect clean for avoiding Memory leak and release the tide with RAM usuage
   * @returns {Boolean | true} Returns Boolean value as true
   */
  __perfectClean() {
    delete this.audioPlayer;
    delete this.downloader;
    delete this.__privateCaches;
    delete this.tracksMetadata;
    return true;
  }

  /**
   * Boolean value related to queue.destroyed value
   * @type {Boolean | true}
   * @readonly
   */

  get destroyed() {
    return this.queue?.destroyed;
  }

  /**
   * Class Name for Type Value as "packet"
   * @type {string | "packet"}
   * @readonly
   */

  get type() {
    return 'packet';
  }
}

module.exports = packets;
