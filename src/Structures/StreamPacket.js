const {
  createAudioResource,
  StreamType,
  AudioPlayer,
  AudioResource,
  PlayerSubscription,
  getVoiceConnection,
} = require('@discordjs/voice');
const {
  User,
  Client,
  GuildMember,
  VoiceChannel,
  StageChannel,
} = require('discord.js');
const { suggestions } = require('youtube-suggest-gen');
const { FFmpeg } = require('prism-media');
const Player = require('../Handlers/Player');
const TracksGen = require('./Tracks');
const VoiceUtils = require('../Utilities/VoiceUtils');
const ClassUtils = require('../Utilities/ClassUtils');
const {
  DefaultExtractorStreamOptions,
  DefaultTrack,
  DefaultStream,
  DefaultChunk,
  DefaultModesType,
  DefaultModesName,
} = require('../types/interfaces');
const Queue = require('../Handlers/Queue');

/**
 * @private
 * @class StreamPacketGen -> Stream Packet Generator for Connection and Internal Workflows
 * Stream packet is meant to untouched by Users as it can distortion or runtime Bugs and errors during playing except when you are debugging them
 */

class StreamPacketGen {
  /**
   * @param {Client} Client Discord Client Instance
   * @param {String|Number} guildId Guild's ID for fetching Queue from Queue's Cache
   * @param {String|Number|Object|void} MetadataValue metadata value from user for Tracks|Queue
   * @param {String|Boolean|void} extractor extractor to be used as "play-dl" or "youtube-dl"
   * @param {DefaultExtractorStreamOptions} ExtractorStreamOptions Streaming options
   * @param {AudioPlayer} Player Audio-Player for playing Songs
   * @param {Boolean|void} IgnoreError IgnoreError or else throw on major bugs
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
      UserAgents: undefined,
    },
    Player = undefined,
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
     * @type {String|void}
     * @readonly
     */
    this.extractor = extractor;

    /**
     * searches User Readable Tracks
     * @type {DefaultTrack[]}
     * @readonly
     */
    this.searches = [];

    /**
     * Tracks Stream Datas from Extractors and then parent Data of searches
     * @type {DefaultStream[]}
     * @readonly
     */
    this.tracks = [];

    /**
     * Metadata Metadata value in Streampacket for Audio Resources
     * @type {any|void}
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
     * @type {DefaultExtractorStreamOptions|void}
     * @readonly
     */
    this.ExtractorStreamOptions = ExtractorStreamOptions = ClassUtils.stablizingoptions(
      ExtractorStreamOptions,
      DefaultExtractorStreamOptions,
    );

    /**
     * IgnoreError IgnoreError's true Value if its required
     * @type {Boolean|void}
     * @readonly
     */
    this.IgnoreError = !!IgnoreError ?? true;

    /**
     * Player's Instance for further operations
     * @type {Player}
     * @readonly
     */
    this.Player = Player;

    /**
     * volume Volume of the Music Player
     * @type {Number}
     * @readonly
     */
    this.volume = 0.095;

    /**
     * AudioResource Track's Audio Resource
     * @type {AudioResource|void}
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
     * @private
     * Private Cache of Modes using now
     * @type {Object}
     * @readonly
     */
    this.ExternalModes = {
      seek: { StartingPoint: undefined, EndingPoint: undefined },
      audioFilters: [],
      filtersUpdateChecks: false,
    };

    /**
     * @private
     * TimedoutId Queue Timedout ID value or undefined
     * @type {String|Number|void|Boolean}
     * @readonly
     */
    this.TimedoutId = undefined;

    /**
     * @private
     * TrackTimeStamp Track's Live Status and Storing Value of the Time
     * @type {Object}
     * @readonly
     */
    this.TrackTimeStamp = {
      Starting: undefined,
      Paused: undefined,
      Filtered: undefined,
    };

    /**
     * @private
     * MusicPlayerMode Music Player's Modes Cache Signal
     * @type {DefaultModesName}
     * @readonly
     */
    this.MusicPlayerMode = {
      Loop: undefined,
      Repeat: undefined,
      Autoplay: undefined,
    };

    /**
     * @private
     * Tempdelay Queue Methods and Process Overload Fixes
     * @type {Object}
     * @readonly
     */
    this.Tempdelay = {
      Track: false,
      FilterUpdate: false,
    };
  }

  /**
   * create() Create Stream Packet for specific time for Queue
   * @param {String} Query Query like URls or Youtube Searches | Default Extractor accept 5 supported and big websites like youtube , spotify , soundcloud , retribution , facebook and for "youtube-dl" , it accept any follows official "youtube" searches
   * @param {VoiceChannel|StageChannel} VoiceChannel Voice Channel to connect Discord Client and getConnections
   * @param {DefaultExtractorStreamOptions} StreamCreateOptions Stream Options for TracksGen methods
   * @param {String|Boolean|void} extractor extractor to be used as "play-dl" or "youtube-dl"
   * @param {User|GuildMember|void} requestedBy user Data as who requested if given during insert or play method of Queue Instance
   * @returns {Promise<this|void>|void} Returns StreamPacket with Updated values of tracks
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
        UserAgents: undefined,
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
      return void this.Player.emit(
        'error',
        Chunks.error,
        this.Player.GetQueue(this.guildId),
      );
    }
    this.searches = this.searches.concat(Chunks.tracks);
    this.tracks = this.tracks.concat(Chunks.streamdatas);
    Chunks.playlist === true || Chunks.playlist
      ? this.Player.emit(
        'playlistAdd',
        this.Player.GetQueue(this.guildId),
        Chunks.tracks,
      )
      : undefined;
    this.Player.emit(
      'tracksAdd',
      this.Player.GetQueue(this.guildId),
      Chunks.tracks,
    );
    if (VoiceChannel) {
      this.VoiceChannel = !this.VoiceChannel
        || !getVoiceConnection(this.guildId)
        || (this.VoiceChannel && VoiceChannel.id !== this.VoiceChannel.id)
        ? await VoiceUtils.join(this.Client, VoiceChannel, {
          force: true,
        })
        : this.VoiceChannel;
    } else if (
      !VoiceChannel
      && !this.VoiceChannel
      && !getVoiceConnection(this.guildId)
    ) {
      return void this.Player.emit(
        'connectionError',
        'Invalid Voice Connection or Invalid Voice Channel Error',
        this.Player.GetQueue(this.guildId),
        getVoiceConnection(this.guildId),
        this.guildId,
      );
    }

    return this;
  }

  /**
   * remove() -> Remove Track from Tracks Cache
   * @param {String|Number|void} Index Tracks Remove Stream packet method but works internally
   * @param {String|Number|void} Amount Tracks Amount to Delete
   * @returns {this} Returns StreamPacket Class Instance
   */

  remove(Index = -1, Amount = 1) {
    this.tracks.splice(Index, Amount);
    this.searches.splice(Index, Amount);
    return this;
  }

  /**
   * insert() -> Insertion of Track in Tracks Cache with all workings of shifting
   * @param {Number|String|void} Index Track's Index where new Track will be inserted
   * @param {String} Query Query like URls or Youtube Searches | Default Extractor accept 5 supported and big websites like youtube , spotify , soundcloud , retribution , facebook and for "youtube-dl" , it accept any follows official "youtube" searches
   * @param {DefaultExtractorStreamOptions} StreamFetchOptions Streaming Options from extractor
   * @param {String|Boolean|void} extractor extractor to be used as "play-dl" or "youtube-dl"
   * @param {User|GuildMember|void} requestedBy User or GuildMember for requestedBy value for Track
   * @returns {Promise<this|void>} Returns StreamPacket Instance of the Queue
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
        UserAgents: undefined,
      },
    },
    extractor,
    requestedBy = undefined,
  ) {
    StreamFetchOptions.ExtractorStreamOptions = ClassUtils.stablizingoptions(
      StreamFetchOptions.ExtractorStreamOptions,
      this.ExtractorStreamOptions,
    );
    if (!this.VoiceChannel && !getVoiceConnection(this.guildId)) {
      return void this.Player.emit(
        'error',
        'Invalid Connection',
        getVoiceConnection(this.guildId),
        this.guildId,
      );
    }
    if (Number(Index) <= -1 && Number(Index) >= this.searches.length) {
      return void this.Player.emit(
        'error',
        'Invalid Index',
        this.Player.GetQueue(this.guildId),
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
      return void this.Player.emit(
        'error',
        Chunk.error,
        this.Player.GetQueue(this.guildId),
      );
    }
    Chunk.playlist === true || Chunk.playlist
      ? this.Player.emit(
        'playlistAdd',
        this.Player.GetQueue(this.guildId),
        Chunk.tracks,
        'insert',
      )
      : undefined;
    this.Player.emit(
      'tracksAdd',
      this.Player.GetQueue(this.guildId),
      Chunk.tracks,
      'insert',
    );
    this.#__HandleInsertion(Number(Index) ?? -1, Chunk);
    this.Player.emit(
      'tracksAdd',
      this.Player.GetQueue(this.guildId),
      Chunk.tracks,
    );
    return this;
  }

  /**
   * back() -> back command for Internal finishing of previous Tracks streaming
   * @param {String|Number|void} TracksBackwardIndex Track Index from previous Tracks Data
   * @param {User|GuildMember|void} requestedBy for changigng exisitng requestedBy Value
   * @param {DefaultExtractorStreamOptions} StreamCreateOptions Stream Create Optiosn from Track Class
   * @param {Boolen|void} forceback Forcefully skip to requested Track as true or false
   * @returns {Promise<Boolean|void>} true if operation went green or else undefined for errors
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
        UserAgents: undefined,
      },
    },
    forceback,
  ) {
    if (
      !this.Player.GetQueue(this.guildId)
      || (this.Player.GetQueue(this.guildId)
        && this.Player.GetQueue(this.guildId).destroyed)
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
      return void this.Player.emit(
        'error',
        Chunks.error,
        this.Player.GetQueue(this.guildId),
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
    forceback ? this.Player.GetQueue(this.guildId).skip() : undefined;
    return true;
  }
  /**
   * FFmpegArgsHandling() -> Ffmpeg Args handling for Audio Streaming Manupulations
   * @param {Number|undefined} SaveTrackIndex Cache Modernized Stream of the Current/Specified Track
   * @returns {Boolean|undefined} Returns true if operation went green or undefined
   */

  FFmpegArgsHandling(SaveTrackIndex = 0) {
    if (
      !(
        this.ExternalModes
        && ((this.ExternalModes.seek
          && (this.ExternalModes.seek.StartingPoint
            || this.ExternalModes.seek.EndingPoint))
          || (this.ExternalModes.audioFilters
            && this.ExternalModes.audioFilters[0]))
      )
      || !this.tracks[0]
    ) {
      this.ExternalModes = {
        seek: undefined,
        audioFilters: this.ExternalModes
          ? this.ExternalModes.audioFilters
          : undefined,
        filtersUpdateChecks: false,
      };
      return void null;
    }
    const ffmpegArgs = [
      '-analyzeduration',
      '0',
      '-loglevel',
      '0',
      '-acodec',
      'libopus',
      '-f',
      'opus',
      '-ar',
      '48000',
      '-ac',
      '2',
    ];
    if (
      this.ExternalModes.audioFilters
      && Array.isArray(this.ExternalModes.audioFilters)
      && this.ExternalModes.audioFilters[0]
    ) {
      if (
        this.ExternalModes.audioFilters.length === 1
        && this.ExternalModes.audioFilters[0] === 'off'
      ) {
        this.ExternalModes.audioFilters = undefined;
      } else ffmpegArgs.unshift('-af', this.ExternalModes.audioFilters.join(','));
    }
    ffmpegArgs.unshift('-i', this.tracks[0].stream_url);
    if (
      this.ExternalModes
      && this.ExternalModes.seek
      && this.ExternalModes.seek.EndingPoint
    ) {
      ffmpegArgs.unshift('-to', `${this.ExternalModes.seek.EndingPoint}`);
    }
    if (
      this.ExternalModes
      && this.ExternalModes.seek
      && this.ExternalModes.seek.StartingPoint
      && this.ExternalModes.seek.StartingPoint > 0
    ) {
      ffmpegArgs.unshift(
        '-ss',
        `${this.ExternalModes.seek.StartingPoint}`,
        '-accurate_seek',
      );
    }
    this.tracks[0].tampered = !!(
      this.ExternalModes && this.ExternalModes.filtersUpdateChecks
    );
    this.Tempdelay = {
      Track: !!this.Tempdelay.Track,
      FilterUpdate: !this.Tempdelay.FilterUpdate,
    };
    this.TrackTimeStamp.Filtered = this.ExternalModes
      && this.ExternalModes.seek
      && this.ExternalModes.seek.StartingPoint
      ? Number(this.ExternalModes.seek.StartingPoint) * 1000
      : 0;
    this.ExternalModes = {
      seek: !!(
        this.ExternalModes.seek
        && (this.ExternalModes.seek.StartingPoint
          || this.ExternalModes.seek.EndingPoint)
      ),
      audioFilters: this.ExternalModes
        ? this.ExternalModes.audioFilters
        : undefined,
      filtersUpdateChecks: false,
    };
    const FFmpegProcess = new FFmpeg({
      args: ffmpegArgs,
    });
    this.tracks[0].stream = FFmpegProcess ?? this.tracks[0].stream;
    this.tracks[0].stream_type = StreamType.OggOpus;
    SaveTrackIndex && Number(SaveTrackIndex) !== 0
      ? this.searches.splice(Number(SaveTrackIndex), 0, this.searches[0])
      : (this.searches[Number(SaveTrackIndex)] = this.searches[0]);
    SaveTrackIndex && Number(SaveTrackIndex) !== 0
      ? this.tracks.splice(Number(SaveTrackIndex), 0, this.tracks[0])
      : (this.tracks[Number(SaveTrackIndex)] = this.tracks[0]);
    return true;
  }

  /**
   * setMode() -> Set Mode of the Music Player between "loop","repeat","autoplay"
   * @param {String} ModeName Mode's Names for Setting Mode
   * @param {String|Boolean|void} ModeType Mode's Value for Setting which to operated
   * @param {String|Number|void} Times Extra Data from Queue.methods as Times
   * @returns {Boolean|void} returns true if operation went gree signal ro undefined on errors
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
   * @param {DefaultTrack} Track Track Credentials for Streaming value
   * @returns {AudioResource} Audio Resource from Stream of Tracks
   */

  StreamAudioResourceExtractor(Track) {
    try {
      const AudioResource = createAudioResource(Track.stream, {
        inputType: Track.stream_type ?? StreamType.Arbitrary,
        metadata: {
          metadata: this.metadata ?? undefined,
        },
        inlineVolume:
          this.Player.GetQueue(this.guildId)
          && this.Player.GetQueue(this.guildId).QueueOptions
          && !this.Player.GetQueue(this.guildId).QueueOptions.NoMemoryLeakMode
            ? true
            : undefined,
      });
      this.AudioResource = AudioResource;
      this.Player.GetQueue(this.guildId)
      && this.Player.GetQueue(this.guildId).QueueOptions
      && !this.Player.GetQueue(this.guildId).QueueOptions.NoMemoryLeakMode
        ? AudioResource.volume.setVolume(this.volume ?? 0.095)
        : undefined;
      return this.AudioResource;
    } catch (error) {
      this.AudioResource = undefined;
      return void this.Player.emit(
        'connectionError',
        `${error.message ?? error ?? 'Audio Resource Streaming Error'}`,
        this.Player.GetQueue(this.guildId),
        getVoiceConnection(this.guildId),
        this.guildId,
      );
    }
  }

  /**
   * __handleMusicPlayerModes() -> Private Method for Handling complex Music Player's Modes with internal tracks
   * @param {Queue} QueueInstance Queue Instance of per Guild
   * @returns {Boolean|void|Promise<Boolean|void>} returns true if operation went gree signal ro undefined on errors
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
        return void this.Player.emit(
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
        return void this.Player.emit(
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
        return void this.Player.emit('error', Chunks.error, QueueInstance);
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
   * @param {Number|void} Index Track Index to insert Tracks from spefic position
   * @param {DefaultChunk} Chunk Chunk value from Tracksgen.fetch() including tracks and streams value
   * @returns {void} as it's a One-go process
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
