const {
  createAudioPlayer,
  createAudioResource,
  StreamType,
  entersState,
  AudioPlayerStatus,
  getVoiceConnection,
} = require('@discordjs/voice');

const queue = require('../core/queue');
const downloader = require('./downloader');
const { Track, Playlist } = require('../enum/fetchRecords');
const { voiceResolver } = require('../utils/snowflakes');

class packets {
  /**
   *
   * @param {queue} queue
   * @param {object<any>} options
   */
  constructor(queue, options) {
    this.queue = queue;
    this.guildId = queue?.guildId;
    this.options = options;
    this.player = queue?.player;
    this.eventEmitter = queue?.eventEmitter;
    this.voiceMod = queue?.voiceMod;
    this.audioPlayer = createAudioPlayer();
    this.tracksMetadata = [];

    this.__privateCaches = {
      completedTracksMetadata: [],
      conditions: {},
      timeMetadata: {},
    };

    this.downloader = new downloader(this, options?.downloaderOptions);

    this.audioPlayer.on(
      'stateChange',
      async (oldState, newState) => await this.__audioPlayerStateMod(oldState, newState),
    );
  }

  async getQuery(rawQuery, voiceSnowflake, requestedBy, options) {
    try {
      if (!(rawQuery && typeof rawQuery === 'string' && rawQuery !== ''))
        return undefined;
      const voiceChannel = await voiceResolver(
        this.queue?.discordClient,
        voiceSnowflake,
      );
      this.eventEmitter.emitDebug(
        'voiceChannel Resolver',
        'Resolving Voice Snowflake Value for actual Voice Channel Data for Audio Player and Voice Connection',
        {
          voiceSnowflake,
        },
      );
      await this.voiceMod?.connect(voiceChannel, options?.voiceOptions);
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
        requestedBy,
        options?.downloaderOptions,
      );
    } catch (errorMetadata) {
      this.eventEmitter.emitError(
        errorMetadata,
        ' - Provide Correct Query or Voice Channel for Connection and Audio Processing\n - Provide Correct Raw Query for Songs like Url or Simple Query from Supported Platforms',
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

  async __audioPlayerStateMod(oldState, newState) {
    if (newState?.status === AudioPlayerStatus.Idle) {
      this.eventEmitter.emitDebug(
        'AudioPlayerStatus Idle Status',
        'If Player went Idle on status Update event - changes required',
        {
          newState,
        },
      );
      this.__cacheAndCleanTracks();
      if (this.tracksMetadata?.length > 0)
        return await this.__audioResourceMod();
      else return undefined;
    } else return undefined;
  }

  // async __voiceHandler(oldState, newState, options) {}

  __cacheAndCleanTracks(
    trackOptions = { startIndex: 0, cleanTracks: 1 },
    preserveTracks = 1,
  ) {
    if (
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

  async __audioResourceMod(rawTrackData = this.tracksMetadata?.[0]) {
    try {
      const streamData = rawTrackData?.streamData;
      if (!streamData) return undefined;
      this.eventEmitter.emitEvent('trackPlay', 'Track will be Played now', {
        track: rawTrackData?.track,
        queue: this.queue,
        packet: this,
      });
      this.eventEmitter.emitDebug(
        'Audio Resource',
        'new Audio Resource will be Created for Audio Player to Play',
        {
          streamData,
        },
      );
      const loadedAudioResource = createAudioResource(
        streamData?.stream?.buffer,
        {
          inputType: streamData?.type ?? StreamType.Arbitrary,
        },
      );
      this.audioPlayer.play(loadedAudioResource);
      await entersState(this.audioPlayer, AudioPlayerStatus.Playing, 2e3);
      const voiceConnection = getVoiceConnection(this.guildId);
      voiceConnection.subscribe(this.audioPlayer);
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

  __playlistMod(playlist) {
    return this.eventEmitter.emitEvent(
      'playlistAdd',
      'Playlist has been recognised and related tracks will be slowly added to caches',
      {
        playlist: new Playlist(playlist),
        queue: this.queue,
        packet: this,
      },
    );
  }

  async __tracksMod(extractor, playlist, rawTrack, metadata) {
    try {
      this.eventEmitter.emitDebug(
        'Tracks Modification',
        'Tracks and Streams will be Modified for Audio Player',
        {
          rawTrack,
          playlist,
          extractor,
          metadata,
        },
      );
      if (this.queue?.destroyed) return undefined;
      const track = new Track(rawTrack);
      const streamData = track?.__getStream(true);
      this.eventEmitter.emitEvent(
        'trackAdd',
        'Tracks has been Added to Cache for Further Modification',
        {
          track: rawTrack,
          playlist,
          extractor,
          metadata,
          tracks: this.tracksMetadata,
        },
      );
      this.tracksMetadata.push({ track, streamData });
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
}

module.exports = packets;
