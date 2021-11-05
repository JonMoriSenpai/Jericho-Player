const {
  createAudioResource,
  StreamType,
  AudioPlayer,
  AudioResource,
  PlayerSubscription,
} = require('@discordjs/voice');
const {
  User,
  Client,
  GuildMember,
  VoiceChannel,
  StageChannel,
  Guild,
} = require('discord.js');
const { Extractor } = require('playdl-music-extractor');
const { suggestions } = require('youtube-suggest-gen');
const JerichoPlayer = require('../Handlers/Player-Handler');
const TracksGen = require('./Tracks');
const VoiceUtils = require('../Utilities/Voice-Utils');
const ClassUtils = require('../Utilities/Class-Utils');
const {
  DefaultExtractorStreamOptions,
  DefaultTrack,
  DefaultStream,
  DefaultChunk,
  DefaultModesType,
  DefaultModesName,
} = require('../types/interfaces');
const Queue = require('../Handlers/Queue-Handler');

/**
 * @class StreamPacketGen -> Stream Packet Generator for Connection and Internal Workflows
 * Stream packet is meant to untouched by Users as it can distortion or runtime Bugs and errors during playing except when you are debugging them
 */

class StreamPacketGen {
  /**
   * @param {Client} Client Discord Client Instance
   * @param {String|Number} guildId Guild's ID for fetching Queue from Queue's Cache
   * @param {String|Number|Object|undefined} MetadataValue metadata value from user for Tracks|Queue
   * @param {String|Boolean|undefined} extractor extractor to be used as "play-dl" or "youtube-dl"
   * @param {DefaultExtractorStreamOptions<Object>} ExtractorStreamOptions Streaming options
   * @param {AudioPlayer} JerichoPlayer Audio-Player for playing Songs
   * @param {Boolean|undefined} IgnoreError IgnoreError or else throw on major bugs
   */
  constructor(
    Client,
    guildId,
    MetadataValue = null,
    extractor = 'play-dl',
    ExtractorStreamOptions = {
      Limit: 1,
      Quality: 'high',
      Cookies: undefined,
      ByPassYoutubeDLRatelimit: true,
      YoutubeDLCookiesFilePath: undefined,
      Proxy: undefined,
    },
    JerichoPlayer = undefined,
    IgnoreError = true,
  ) {
    /**
     * Client Discord Client Instance
     * @type {Client}
     * @readonly
     */
    this.Client = Client;

    /**
     * VoiceChannel Voice Channel Instance from Guild's Voice Channel
     * @type {VoiceChannel|StageChannel}
     * @readonly
     */
    this.VoiceChannel = null;

    /**
     * Extractor Extractor name as "play-dl" OR "youtube-dl"
     * @type {String|undefined}
     * @readonly
     */
    this.extractor = extractor;

    /**
     * searches User Readable Tracks
     * @type {Object[]}
     * @readonly
     */
    this.searches = [];

    /**
     * Tracks Stream Datas from Extractors and then parent Data of searches
     * @type {Object[]}
     * @readonly
     */
    this.tracks = [];

    /**
     * VoiceConnection Voice Connection Value designed by "@discordjs/voice"
     * @type {VoiceConnection|undefined}
     * @readonly
     */
    this.VoiceConnection = null;

    /**
     * Metadata Metadata value in Streampacket for Audio Resources
     * @type {Object|undefined}
     */
    this.metadata = MetadataValue;

    /**
     * subscription Player Subscription Socket to Subscribe or Subscription is ON
     * @type {PlayerSubscription}
     * @readonly
     */
    this.subscription = undefined;

    /**
     * Guild's id Object cached from new constructor's guild value
     * @type {String|Number}
     * @readonly
     */
    this.guildId = guildId;

    /**
     * ExtractorStreamOptions Extractor Fetching Options
     * @type {DefaultExtractorStreamOptions<Object>|undefined}
     * @readonly
     */
    this.ExtractorStreamOptions = ExtractorStreamOptions = ClassUtils.stablizingoptions(
      ExtractorStreamOptions,
      DefaultExtractorStreamOptions,
    );

    /**
     * IgnoreError IgnoreError's true Value if its required
     * @type {Boolean|undefined}
     * @readonly
     */
    this.IgnoreError = !!IgnoreError ?? true;

    /**
     * Player's Instance for further operations
     * @type {JerichoPlayer}
     * @readonly
     */
    this.JerichoPlayer = JerichoPlayer;

    /**
     * volume Volume of the Music Player
     * @type {Number}
     * @readonly
     */
    this.volume = 0.095;

    /**
     * AudioResource Track's Audio Resource
     * @type {AudioResource|undefined}
     * @readonly
     */
    this.AudioResource = undefined;

    /**
     * previousTracks Previous Tracks Cache
     * @type {Object[]}
     * @readonly
     */
    this.previousTracks = [];

    /**
     * TimedoutId Queue Timedout ID value or undefined
     * @type {String|Number|undefined|Boolean}
     * @readonly
     */
    this.TimedoutId = undefined;

    /**
     * TrackTimeStamp Track's Live Status and Storing Value of the Time
     * @type {Object}
     * @readonly
     */
    this.TrackTimeStamp = { Starting: undefined, Paused: undefined };

    /**
     * MusicPlayerMode Music Player's Modes Cache Signal
     * @type {DefaultModesName}
     * @readonly
     */
    this.MusicPlayerMode = {
      Loop: undefined,
      Repeat: undefined,
      Autoplay: undefined,
    };
  }

  /**
   * create() Create Stream Packet for specific time for Queue
   * @param {String} Query Query like URls or Youtube Searches | Default Extractor accept 5 supported and big websites like youtube , spotify , soundcloud , retribution , facebook and for "youtube-dl" , it accept any follows official "youtube" searches
   * @param {VoiceChannel|StageChannel} VoiceChannel Voice Channel to connect Discord Client and getConnections
   * @param {DefaultExtractorStreamOptions<Object>} StreamCreateOptions Stream Options for TracksGen methods
   * @param {String|Boolean|undefined} extractor extractor to be used as "play-dl" or "youtube-dl"
   * @param {User|GuildMember|undefined} requestedBy user Data as who requested if given during insert or play method of Queue Instance
   * @returns {Promise<this|undefined>|undefined} Returns Stream-Packet with Updated values of tracks
   */

  async create(
    Query,
    VoiceChannel,
    StreamCreateOptions = {
      IgnoreError: true,
      ExtractorStreamOptions: {
        Limit: 1,
        Quality: 'high',
        Cookies: undefined,
        ByPassYoutubeDLRatelimit: true,
        YoutubeDLCookiesFilePath: undefined,
        Proxy: undefined,
      },
    },
    extractor = 'play-dl',
    requestedBy = undefined,
  ) {
    StreamCreateOptions.ExtractorStreamOptions = ClassUtils.stablizingoptions(
      StreamCreateOptions.ExtractorStreamOptions,
      this.ExtractorStreamOptions,
    );
    const Chunks = await TracksGen.fetch(
      Query,
      requestedBy ?? undefined,
      StreamCreateOptions,
      extractor,
      this.tracks.length > 0
        ? Number(this.tracks[this.tracks.length - 1].Id)
        : 0,
    );
    if (Chunks.error) {
      return void this.JerichoPlayer.emit(
        'error',
        Chunks.error,
        this.JerichoPlayer.GetQueue(this.guildId),
      );
    }
    this.searches = this.searches.concat(Chunks.tracks);
    this.tracks = this.tracks.concat(Chunks.streamdatas);
    Chunks.playlist === true || Chunks.playlist
      ? this.JerichoPlayer.emit(
        'playlistAdd',
        this.JerichoPlayer.GetQueue(this.guildId),
        Chunks.tracks,
      )
      : undefined;
    this.JerichoPlayer.emit(
      'tracksAdd',
      this.JerichoPlayer.GetQueue(this.guildId),
      Chunks.tracks,
    );
    if (VoiceChannel) {
      this.VoiceChannel = !this.VoiceChannel
        || !this.VoiceConnection
        || (this.VoiceChannel && VoiceChannel.id !== this.VoiceChannel.id)
        ? VoiceChannel
        : this.VoiceChannel;
      this.VoiceConnection = !this.VoiceChannel
        || !this.VoiceConnection
        || (this.VoiceChannel && VoiceChannel.id !== this.VoiceChannel.id)
        ? await VoiceUtils.join(this.Client, VoiceChannel, {
          force: true,
        })
        : this.VoiceConnection;
    } else if (!VoiceChannel && !this.VoiceChannel && !this.VoiceConnection) {
      return void this.JerichoPlayer.emit(
        'connectionError',
        'Invalid Voice Connection or Invalid Voice Channel Error',
        this.JerichoPlayer.GetQueue(this.guildId),
        this.VoiceConnection,
        this.guildId,
      );
    }

    return this;
  }

  /**
   * remove() -> Remove Track from Tracks Cache
   * @param {String|Number|undefined} Index Tracks Remove Stream packet method but works internally
   * @param {String|Number|undefined} Amount Tracks Amount to Delete
   * @returns {this} Returns StreamPacket Class Instance
   */

  remove(Index = -1, Amount = 1) {
    this.tracks.splice(Index, Amount);
    this.searches.splice(Index, Amount);
    return this;
  }

  /**
   * insert() -> Insertion of Track in Tracks Cache with all workings of shifting
   * @param {Number|String|undefined} Index Track's Index where new Track will be inserted
   * @param {String} Query Query like URls or Youtube Searches | Default Extractor accept 5 supported and big websites like youtube , spotify , soundcloud , retribution , facebook and for "youtube-dl" , it accept any follows official "youtube" searches
   * @param {DefaultExtractorStreamOptions<Object>} StreamFetchOptions Streaming Options from extractor
   * @param {String|Boolean|undefined} extractor extractor to be used as "play-dl" or "youtube-dl"
   * @param {User|GuildMember|undefined} requestedBy User or GuildMember for requestedBy value for Track
   * @returns {Promise<this|undefined>} Returns StreamPacket Instance of the Queue
   */

  async insert(
    Index = -1,
    Query,
    StreamFetchOptions = {
      IgnoreError: true,
      ExtractorStreamOptions: {
        Limit: 1,
        Quality: 'high',
        Cookies: undefined,
        ByPassYoutubeDLRatelimit: true,
        YoutubeDLCookiesFilePath: undefined,
        Proxy: undefined,
      },
    },
    extractor,
    requestedBy = undefined,
  ) {
    StreamFetchOptions.ExtractorStreamOptions = ClassUtils.stablizingoptions(
      StreamFetchOptions.ExtractorStreamOptions,
      this.ExtractorStreamOptions,
    );
    if (!this.VoiceChannel && !this.VoiceConnection) {
      return void this.JerichoPlayer.emit(
        'error',
        'Invalid Connection',
        this.VoiceConnection,
        this.guildId,
      );
    }
    if (Number(Index) <= -1 && Number(Index) >= this.searches.length) {
      return void this.JerichoPlayer.emit(
        'error',
        'Invalid Index',
        this.JerichoPlayer.GetQueue(this.guildId),
        Number(Index),
      );
    }
    const Chunk = await TracksGen.fetch(
      Query,
      requestedBy ?? undefined,
      StreamFetchOptions,
      extractor ?? this.extractor,
      this.tracks.length > 0
        ? Number(this.tracks[this.tracks.length - 1].Id)
        : 0,
    );
    if (Chunk.error) {
      return void this.JerichoPlayer.emit(
        'error',
        Chunk.error,
        this.JerichoPlayer.GetQueue(this.guildId),
      );
    }
    Chunk.playlist === true || Chunk.playlist
      ? this.JerichoPlayer.emit(
        'playlistAdd',
        this.JerichoPlayer.GetQueue(this.guildId),
        Chunk.tracks,
        'insert',
      )
      : undefined;
    this.JerichoPlayer.emit(
      'tracksAdd',
      this.JerichoPlayer.GetQueue(this.guildId),
      Chunk.tracks,
      'insert',
    );
    this.#__HandleInsertion(Number(Index) ?? -1, Chunk);
    this.JerichoPlayer.emit(
      'tracksAdd',
      this.JerichoPlayer.GetQueue(this.guildId),
      Chunk.tracks,
    );
    return this;
  }

  /**
   * back() -> back command for Internal finishing of previous Tracks streaming
   * @param {String|Number|undefined} TracksBackwardIndex Track Index from previous Tracks Data
   * @param {User|GuildMember|undefined} requestedBy for changigng exisitng requestedBy Value
   * @param {DefaultExtractorStreamOptions<Object>} StreamCreateOptions Stream Create Optiosn from Track Class
   * @param {Boolen|undefined} forceback Forcefully skip to requested Track as true or false
   * @returns {Promise<Boolean|undefined>} true if operation went green or else undefined for errors
   */

  async back(
    TracksBackwardIndex = 0,
    requestedBy,
    StreamCreateOptions = {
      IgnoreError: true,
      ExtractorStreamOptions: {
        Limit: 1,
        Quality: 'high',
        Cookies: undefined,
        ByPassYoutubeDLRatelimit: true,
        YoutubeDLCookiesFilePath: undefined,
        Proxy: undefined,
      },
    },
    forceback,
  ) {
    if (
      !this.JerichoPlayer.GetQueue(this.guildId)
      || (this.JerichoPlayer.GetQueue(this.guildId)
        && this.JerichoPlayer.GetQueue(this.guildId).destroyed)
    ) return void null;
    StreamCreateOptions.ExtractorStreamOptions = ClassUtils.stablizingoptions(
      StreamCreateOptions.ExtractorStreamOptions,
      this.ExtractorStreamOptions,
    );
    const Chunks = await TracksGen.fetch(
      this.previousTracks[this.previousTracks.length - TracksBackwardIndex - 1]
        .url,
      requestedBy
        ?? this.previousTracks[
          this.previousTracks.length - TracksBackwardIndex - 1
        ].requestedBy
        ?? undefined,
      StreamCreateOptions,
      StreamCreateOptions.extractor,
      this.tracks.length > 0
        ? Number(this.tracks[this.tracks.length - 1].Id)
        : 0,
    );
    if (Chunks.error) {
      return void this.JerichoPlayer.emit(
        'error',
        Chunks.error,
        this.JerichoPlayer.GetQueue(this.guildId),
      );
    }

    this.tracks.splice(forceback ? 1 : 0, 0, Chunks.streamdatas[0]);
    this.searches.splice(forceback ? 1 : 0, 0, Chunks.tracks[0]);
    forceback ? this.searches.splice(2, 0, this.searches[0]) : undefined;
    forceback ? this.tracks.splice(2, 0, this.tracks[0]) : undefined;
    this.previousTracks.splice(
      this.previousTracks.length - TracksBackwardIndex - 1,
      1,
    );
    forceback ? this.JerichoPlayer.GetQueue(this.guildId).skip() : undefined;
    return true;
  }

  /**
   * setMode() -> Set Mode of the Music Player between "loop","repeat","autoplay"
   * @param {String} ModeName Mode's Names for Setting Mode
   * @param {String|Boolean|undefined} ModeType Mode's Value for Setting which to operated
   * @param {String|Number|undefined} Times Extra Data from Queue.methods as Times
   * @returns {Boolean|undefined} returns true if operation went gree signal ro undefined on errors
   */

  setMode(ModeName, ModeType, Times) {
    if (
      ModeName === DefaultModesName.Loop
      && (!ModeType || (ModeType && ModeType === DefaultModesType.Track))
    ) {
      this.MusicPlayerMode = {
        Loop: DefaultModesType.Track,
      };
      return true;
    }
    if (
      ModeName === DefaultModesName.Loop
      && ModeType
      && ModeType === DefaultModesType.Queue
    ) {
      this.MusicPlayerMode = {
        Loop: DefaultModesType.Queue,
      };
      return true;
    }
    if (
      ModeName === DefaultModesName.Loop
      && ModeType
      && ModeType === DefaultModesType.Off
    ) {
      this.MusicPlayerMode = {
        Loop: undefined,
      };
      return true;
    }
    if (
      ModeName === DefaultModesName.Repeat
      && (!ModeType || (ModeType && ModeType === DefaultModesType.Track))
    ) {
      this.MusicPlayerMode = {
        Repeat: [DefaultModesType.Track, Number(Times)],
      };
      return true;
    }
    if (
      ModeName === DefaultModesName.Repeat
      && ModeType
      && ModeType === DefaultModesType.Queue
    ) {
      this.MusicPlayerMode = {
        Repeat: [DefaultModesType.Queue, Number(Times)],
      };
      return true;
    }
    if (
      ModeName === DefaultModesName.Repeat
      && ModeType
      && ModeType === DefaultModesType.Off
    ) {
      this.MusicPlayerMode = {
        Repeat: undefined,
      };
      return true;
    }
    if (
      ModeName === DefaultModesName.Autoplay
      && ModeType
      && ModeType === DefaultModesType.Off
    ) {
      this.MusicPlayerMode = {
        Autoplay: undefined,
      };
      return true;
    }
    if (ModeName === DefaultModesName.Autoplay) {
      this.MusicPlayerMode = {
        Autoplay: ModeType ?? true,
      };
      return true;
    }

    return void null;
  }

  /**
   * StreamAudioResourceExtractor() -> Fetch Audio Resource to Stream in Music Player for Jericho Player
   * @param {DefaultTrack<Object>} Track Track Credentials for Streaming value
   * @returns {AudioResource} Audio Resource from Stream of Tracks
   */

  StreamAudioResourceExtractor(Track) {
    try {
      const AudioResource = createAudioResource(Track.stream, {
        inputType: Track.stream_type ?? StreamType.Arbitrary,
        metadata: {
          metadata: this.metadata,
          Track,
        },
        inlineVolume: true,
      });
      this.AudioResource = AudioResource;
      AudioResource.volume.setVolume(this.volume ?? 0.095);
      return this.AudioResource;
    } catch (error) {
      this.AudioResource = undefined;
      return void this.JerichoPlayer.emit(
        'connectionError',
        `${error.message ?? error ?? 'Audio Resource Streaming Error'}`,
        this.JerichoPlayer.GetQueue(this.guildId),
        this.VoiceConnection,
        this.guildId,
      );
    }
  }

  /**
   * __handleMusicPlayerModes() -> Private Method for Handling complex Music Player's Modes with internal tracks
   * @param {Queue} QueueInstance Queue Instance of per Guild
   * @returns {Boolean|undefined|Promise<Boolean|undefined>} returns true if operation went gree signal ro undefined on errors
   */
  async __handleMusicPlayerModes(QueueInstance) {
    if (!QueueInstance.playerMode) return void null;
    const ModeName = QueueInstance.playerMode.mode;
    const ModeType = QueueInstance.playerMode.type;
    const ModeTimes = Number(QueueInstance.playerMode.times ?? 0);
    let CacheTracks = [];
    if (
      ModeName === DefaultModesName.Loop
      && (!ModeType || (ModeType && ModeType === DefaultModesType.Track))
    ) {
      const Chunks = await TracksGen.fetch(
        QueueInstance.previousTrack.url,
        QueueInstance.previousTrack.requestedBy,
        this.ExtractorStreamOptions,
        this.extractor ?? 'play-dl',
        Number(QueueInstance.previousTrack.Id ?? 0) - 1,
      );
      this.previousTracks.splice(this.previousTracks.length - 1, 1);
      this.tracks.splice(0, 0, Chunks.streamdatas[0]);
      this.searches.splice(0, 0, Chunks.tracks[0]);
      return true;
    }
    if (
      ModeName === DefaultModesName.Loop
      && ModeType
      && ModeType === DefaultModesType.Queue
    ) {
      await Promise.all(
        this.previousTracks.map(async (previousTrack) => {
          const Chunks = await TracksGen.fetch(
            previousTrack.url,
            previousTrack.requestedBy,
            this.ExtractorStreamOptions,
            this.extractor ?? 'play-dl',
            Number(previousTrack.Id ?? 0) - 1,
          );
          this.tracks.push(Chunks.streamdatas[0]);
          this.searches.push(Chunks.tracks[0]);
        }),
      );
      this.previousTracks = [];
      return true;
    }
    if (
      ModeName === DefaultModesName.Repeat
      && (!ModeType || (ModeType && ModeType === DefaultModesType.Track))
    ) {
      const Chunks = await TracksGen.fetch(
        QueueInstance.previousTrack.url,
        QueueInstance.previousTrack.requestedBy,
        this.ExtractorStreamOptions,
        this.extractor ?? 'play-dl',
        Number(QueueInstance.previousTrack.Id ?? 0) - 1,
      );
      this.previousTracks.splice(this.previousTracks.length - 1, 1);
      this.tracks.splice(0, 0, Chunks.streamdatas[0]);
      this.searches.splice(0, 0, Chunks.tracks[0]);
      this.MusicPlayerMode.Repeat = ModeTimes && ModeTimes > 1 ? [ModeType, ModeTimes - 1] : undefined;
      return true;
    }
    if (
      ModeName === DefaultModesName.Repeat
      && ModeType
      && ModeType === DefaultModesType.Queue
    ) {
      CacheTracks = [...this.previousTracks].reverse();
      await Promise.all(
        CacheTracks.map(async (previousTrack) => {
          const Chunks = await TracksGen.fetch(
            previousTrack.url,
            previousTrack.requestedBy,
            this.ExtractorStreamOptions,
            this.extractor ?? 'play-dl',
            Number(previousTrack.Id ?? 0) - 1,
          );
          this.tracks.push(Chunks.streamdatas[0]);
          this.searches.push(Chunks.tracks[0]);
        }),
      );
      this.MusicPlayerMode.Repeat = ModeTimes && ModeTimes > 1 ? [ModeType, ModeTimes - 1] : undefined;
      this.previousTracks = [];
      return true;
    }
    if (
      ModeName === DefaultModesName.Autoplay
      && QueueInstance.tracks.length === 0
    ) {
      const SearchResults = typeof this.MusicPlayerMode.Autoplay === 'string'
        ? await QueueInstance.search(
          this.MusicPlayerMode.Autoplay,
          QueueInstance.previousTrack.requestedBy,
          this.ExtractorStreamOptions,
          this.extractor ?? 'play-dl',
          Number(QueueInstance.previousTrack.Id ?? 0) - 1,
        )
        : undefined;
      if (SearchResults && SearchResults.error) {
        return void this.JerichoPlayer.emit(
          'error',
          SearchResults.error,
          QueueInstance,
        );
      }
      const GarbageSuggestion = await suggestions(
        (SearchResults && SearchResults.tracks
          ? SearchResults.tracks[0].title
          : undefined) ?? QueueInstance.previousTrack.title,
      );
      if (
        !(
          GarbageSuggestion
          && GarbageSuggestion[0]
          && GarbageSuggestion[0].title
        )
      ) {
        return void this.JerichoPlayer.emit(
          'error',
          'No AutoPlay Track Result',
          QueueInstance,
        );
      }
      const Chunks = await TracksGen.fetch(
        GarbageSuggestion[0].title,
        QueueInstance.previousTrack.requestedBy,
        this.ExtractorStreamOptions,
        this.extractor ?? 'play-dl',
        Number(QueueInstance.previousTrack.Id ?? 0) - 1,
      );
      if (Chunks && Chunks.error) {
        return void this.JerichoPlayer.emit(
          'error',
          Chunks.error,
          QueueInstance,
        );
      }
      this.tracks.push(Chunks.streamdatas[0]);
      this.searches.push(Chunks.tracks[0]);
      QueueInstance.tracks[0] = Chunks.tracks[0];

      return true;
    }
    return void null;
  }

  /**
   * @private #__HandleInsertion -> Private Method for handling Insertion correctly without distrubing other tracks
   * @param {Number|undefined} Index Track Index to insert Tracks from spefic position
   * @param {DefaultChunk<Object>} Chunk Chunk value from Tracksgen.fetch() including tracks and streams value
   * @returns {undefined} as it's a One-go process
   */

  #__HandleInsertion(Index = -1, Chunk) {
    if (!Index || (Index && Index < 0)) {
      this.searches = this.searches.concat(Chunk.tracks);
      this.tracks = this.tracks.concat(Chunk.streamdatas);
    } else {
      let GarbageFirstPhase = this.searches.splice(0, Index);
      let GarbageSecondPhase = GarbageFirstPhase.concat(Chunk.tracks);
      this.searches = GarbageSecondPhase.concat(this.searches);
      GarbageFirstPhase = this.tracks.splice(0, Index);
      GarbageSecondPhase = GarbageFirstPhase.concat(Chunk.streamdatas);
      this.tracks = GarbageSecondPhase.concat(this.tracks);
    }
    return void null;
  }
}

module.exports = StreamPacketGen;
