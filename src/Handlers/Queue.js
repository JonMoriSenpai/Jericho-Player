const {
  createAudioPlayer,
  AudioPlayerStatus,
  entersState,
  NoSubscriberBehavior,
  AudioPlayer,
  getVoiceConnection,
} = require('@discordjs/voice')
const {
  User,
  Client,
  GuildMember,
  VoiceChannel,
  StageChannel,
  Message,
} = require('discord.js')
const StreamPacketGen = require('../Structures/StreamPacket')
const { disconnect } = require('../Utilities/VoiceUtils')
const Player = require('./Player')
const {
  DefaultQueueCreateOptions,
  DefaultProgressBar,
  DefaultTrack,
  DefaultModesName,
  DefaultPlayerMode,
  DefaultModesType,
  DefaultcurrentTimestamp,
  DefaultUserDrivenAudioFilters,
  DefaultSearchResults,
} = require('../types/interfaces')
const TrackGenerator = require('../Structures/Tracks')
const {
  HumanTimeConversion,
  AudioFiltersConverter,
  TimeWait,
  stablizingoptions,
  ResolverLTE,
} = require('../Utilities/ClassUtils')

/**
 * @class Queue -> Queue Class for Creating Queue Instances for Guild
 * Queue Instance for Making a Virtual Play Ground for handling all Requests in a static Area
 * @return New Queue Instance
 */

class Queue {
  /**
   * @param {Client} Client Discord Client Instance
   * @param {String} GuildId Guild's Id
   * @param {DefaultQueueCreateOptions|void} QueueOptions Queue Create Options
   * @param {Player} Player Jericho Player Instance
   */
  constructor(
    Client,
    GuildId,
    QueueOptions = {
      extractor: undefined,
      metadata: null,
      ExtractorStreamOptions: {
        Limit: undefined,
        Quality: undefined,
        Cookies: undefined,
        ByPassYoutubeDLRatelimit: true,
        YoutubeDLCookiesFilePath: undefined,
        Proxy: undefined,
        UserAgents: undefined,
      },
      IgnoreError: undefined,
      LeaveOnEmpty: undefined,
      LeaveOnEnd: undefined,
      LeaveOnBotOnly: undefined,
      LeaveOnEmptyTimedout: undefined,
      LeaveOnEndTimedout: undefined,
      LeaveOnBotOnlyTimedout: undefined,
      NoMemoryLeakMode: undefined,
    },
    Player = undefined,
  ) {
    /**
     * Client Discord Client Instance
     * @type {Client} Client Discord Client Instance
     * @readonly
     */
    this.Client = Client

    /**
     * StreamPacket Stream packet for Queue | Simply Handling Voice Connections and Tracks/Streams
     * @type {StreamPacketGen}
     * @readonly
     */
    this.StreamPacket = new StreamPacketGen(
      Client,
      GuildId,
      QueueOptions.metadata,
      QueueOptions.extractor,
      QueueOptions.ExtractorStreamOptions,
      Player,
    )
    /**
     * Queue Options Cache for Future Refrences
     * @type {DefaultQueueCreateOptions}
     * @readonly
     */

    this.QueueOptions = QueueOptions

    /**
     * Metadata value in Queue for Audio Resources
     * @type {Object|void}
     */
    this.metadata = QueueOptions.metadata

    /**
     * Queue.tracks[] holds all the Queue's tracks Cache
     * @type {DefaultTrack[]}
     * @readonly
     */
    this.tracks = []

    /**
     * Guild's id Object cached from new constructor's guild value
     * @type {String|Number}
     * @readonly
     */
    this.guildId = GuildId

    /**
     * Queue has been destroyed with Queue.destroy() respond with Boolean or else in delay for destruction will return Timedout ID for clearInterval fucntion
     * @type {Boolean|Number}
     * @readonly
     */
    this.destroyed = false

    /**
     * MusicPlayer New Music Player for the Queue Instance to carry out the Basic Stream Operations
     * @type {AudioPlayer}
     * @readonly
     */
    this.MusicPlayer = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
      },
    })

    /**
     * Player Player's Instance for fetching Queue from Cache , Just in case it is required
     * @type {Player}
     * @readonly
     */
    this.Player = Player

    /**
     * "statechange" Voice Event for Audio Player for quick filtered Decision making
     */
    this.MusicPlayer.on('stateChange', async (oldState, newState) => {
      if (newState.status === AudioPlayerStatus.Idle) {
        if (
          this.StreamPacket &&
          this.tracks &&
          this.tracks[0] &&
          this.StreamPacket.AudioResource
        ) {
          this.StreamPacket.AudioResource = undefined
          if (
            !(
              this.StreamPacket.ExternalModes &&
              this.StreamPacket.ExternalModes.filtersUpdateChecks
            )
          ) {
            this.StreamPacket.previousTracks.push(this.StreamPacket.searches[0])
            !(
              this.playerMode && this.playerMode.type === DefaultModesType.Track
            )
              ? this.Player.emit('trackEnd', this, this.tracks[0])
              : undefined
          }
        }
        if (
          !this.destroyed &&
          !(
            this.StreamPacket.ExternalModes &&
            this.StreamPacket.ExternalModes.filtersUpdateChecks
          )
        )
          this.#__CleaningTrackMess()
        this.StreamPacket.FFmpegArgsHandling(0)
        this.#__ResourcePlay()
      } else if (newState && newState.status === AudioPlayerStatus.Playing) {
        this.StreamPacket.TrackTimeStamp.Starting =
          new Date().getTime() -
          (this.StreamPacket.TrackTimeStamp.Filtered ?? 0)
        this.StreamPacket.TrackTimeStamp.Filtered = undefined
        this.destroyed = false
      }
    })
  }

  /**
   * play() ->  Play Options for Queue Instance , Accept any kind of URL if extractor is "youtube-dl" or set undefined | "play-dl" to fetch from custom extractor
   * @param {String} Query Query like URls or Youtube Searches | Default Extractor accept 5 supported and big websites like youtube , spotify , soundcloud , retribution , facebook and for "youtube-dl" , it accept any follows official "youtube" searches
   * @param {VoiceChannel|StageChannel} VoiceChannel Voice Channel from Discord.js
   * @param {User|GuildMember} User Guild Member or Guild User for requestedBy Object in track
   * @param {DefaultQueueCreateOptions} PlayOptions Play Options | Queue Create Options | Stream Options for Additional features
   * @returns {Promise<Boolean|void>|void} undefined on successfull attempt or Promise rejection | true if operation went good signal
   */

  async play(
    Query,
    VoiceChannel,
    User,
    PlayOptions = {
      IgnoreError: true,
      extractor: undefined,
      metadata: this.metadata,
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
  ) {
    // Watch for Queue.destroyed Property for ignoring Invalid operation and further un-wanted Errors
    if (this.destroyed) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    // Voice Channel resolves if possible
    VoiceChannel = ResolverLTE(VoiceChannel, 'voicechannel')

    // Checks for Valid Voice Channel Type to avoid further meaningless operations
    if (
      !(
        (this.StreamPacket && this.StreamPacket.VoiceChannel) ||
        (VoiceChannel &&
          VoiceChannel.id &&
          VoiceChannel.guild &&
          VoiceChannel.guild.id &&
          VoiceChannel.type &&
          ['guild_voice', 'guild_stage_voice'].includes(
            VoiceChannel.type.toLowerCase().trim(),
          ))
      )
    ) {
      return void this.Player.emit('error', 'Invalid Voice Channel', this)
    }

    // Comparing and Placing Default Values if any
    PlayOptions = stablizingoptions(PlayOptions, this.QueueOptions)

    // Stream Packet created if <Queue>.destroyed is true to create Voice Connection store Values
    if (
      this.StreamPacket &&
      this.StreamPacket.Tempdelay &&
      this.StreamPacket.Tempdelay.Track
    )
      await TimeWait(1000)
    this.StreamPacket = this.StreamPacket
      ? this.StreamPacket
      : new StreamPacketGen(
        this.Client,
        this.guildId,
        PlayOptions.metadata,
        PlayOptions.extractor,
        PlayOptions.ExtractorStreamOptions,
        this.Player,
      )
    if (this.StreamPacket && this.StreamPacket.Tempdelay) {
      this.StreamPacket.Tempdelay = {
        Track: !this.StreamPacket.Tempdelay.Track,
        FilterUpdate: !!this.StreamPacket.Tempdelay.FilterUpdate,
      }
    }
    // Dynamically | In-directly fetches Data about Query and store it as StreamPacket
    await this.StreamPacket.create(
      Query,
      this.StreamPacket.VoiceChannel ?? VoiceChannel,
      PlayOptions,
      PlayOptions.extractor,
      User ?? undefined,
    )
    this.tracks = this.StreamPacket.searches
    // __ResourcePlay() is quite powerfull and shouldbe placed after double checks as it is the main component for Playing Streams
    if (!this.playing && !this.paused && this.tracks && this.tracks[0]) {
      await this.#__ResourcePlay()
    }
    return true
  }

  /**
   * playTracks() ->  PlayTracks Options for Queue Instance , Accept any kind of URL if extractor is "youtube-dl" or set undefined | "play-dl" to fetch from custom extractor
   * @param {String[]} QueryArray Array of Query like URls or Youtube Searches | Default Extractor accept 5 supported and big websites like youtube , spotify , soundcloud , retribution , facebook and for "youtube-dl" , it accept any follows official "youtube" searches
   * @param {VoiceChannel|StageChannel} VoiceChannel Voice Channel from Discord.js
   * @param {User|GuildMember} User Guild Member or Guild User for requestedBy Object in track
   * @param {DefaultQueueCreateOptions} PlayOptions Play Options | Queue Create Options | Stream Options for Additional features
   * @returns {Promise<Boolean|void>|void} undefined on successfull attempt or Promise rejection | true if operation went good signal
   */

  async playTracks(
    QueryArray,
    VoiceChannel,
    User,
    PlayOptions = {
      IgnoreError: true,
      extractor: undefined,
      metadata: this.metadata,
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
  ) {
    if (this.destroyed) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    // Voice Channel resolves if possible
    VoiceChannel = ResolverLTE(VoiceChannel, 'voicechannel')

    if (!(QueryArray && Array.isArray(QueryArray))) {
      return void this.Player.emit(
        'error',
        'Invalid Queries Type',
        this,
        QueryArray,
      )
    }
    QueryArray = QueryArray.filter(Boolean)
    if (!QueryArray[0]) {
      return void this.Player.emit('error', 'Invalid Queries', this, QueryArray)
    }
    // Checks for Valid Voice Channel Type to avoid further meaningless operations
    if (
      !(
        (this.StreamPacket && this.StreamPacket.VoiceChannel) ||
        (VoiceChannel &&
          VoiceChannel.id &&
          VoiceChannel.guild &&
          VoiceChannel.guild.id &&
          VoiceChannel.type &&
          ['guild_voice', 'guild_stage_voice'].includes(
            VoiceChannel.type.toLowerCase().trim(),
          ))
      )
    ) {
      return void this.Player.emit('error', 'Invalid Voice Channel', this)
    }

    // Comparing and Placing Default Values if any
    PlayOptions =
      PlayOptions !== this.QueueOptions
        ? stablizingoptions(PlayOptions, this.QueueOptions)
        : PlayOptions

    // Stream Packet created if <Queue>.destroyed is true to create Voice Connection store Values
    this.StreamPacket = this.StreamPacket
      ? this.StreamPacket
      : new StreamPacketGen(
        this.Client,
        this.guildId,
        PlayOptions.metadata,
        PlayOptions.extractor,
        PlayOptions.ExtractorStreamOptions,
        this.Player,
      )
    await Promise.all(
      QueryArray.map(async (Query) => {
        if (!(Query && typeof Query === 'string')) {
          this.Player.emit('error', 'Invalid Query is Detected', this, Query)
        } else {
          if (
            this.StreamPacket &&
            this.StreamPacket.Tempdelay &&
            this.StreamPacket.Tempdelay.Track
          )
            await TimeWait(1000)

          if (this.StreamPacket && this.StreamPacket.Tempdelay) {
            this.StreamPacket.Tempdelay = {
              Track: !this.StreamPacket.Tempdelay.Track,
              FilterUpdate: !!this.StreamPacket.Tempdelay.FilterUpdate,
            }
          }
          // Dynamically | In-directly fetches Data about Query and store it as StreamPacket
          await this.StreamPacket.create(
            Query,
            this.StreamPacket.VoiceChannel ?? VoiceChannel,
            PlayOptions,
            PlayOptions.extractor,
            User ?? undefined,
          )
          this.tracks = this.StreamPacket.searches

          // __ResourcePlay() is quite powerfull and shouldbe placed after double checks as it is the main component for Playing Streams
          if (!this.playing && !this.paused && this.tracks && this.tracks[0]) {
            await this.#__ResourcePlay()
          }
        }
      }),
    )
    return true
  }

  /**
   * skip() ->  Skips the Curren Song if Index is undefined | 0 , or else act as skipTo Type where Next song will play what has been Mentioned
   * @param {String|Number|void} TrackIndex Track's Index (0,1,2,..) To Skip to Specified Track or else undefined to skip current and play song now
   * @returns {Boolean|void} true if operation went signal Green or else undefined for error event triggers
   */

  skip(TrackIndex) {
    if (this.destroyed) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    if (
      TrackIndex &&
      !(typeof TrackIndex === 'number' || typeof TrackIndex === 'string')
    ) {
      return void this.Player.emit('error', 'Invalid Index', this, TrackIndex)
    }
    if (
      (!this.playing ||
        (this.playing && !this.playerMode && !this.StreamPacket.tracks[1])) &&
      !(
        this.StreamPacket.ExternalModes &&
        this.StreamPacket.ExternalModes.filtersUpdateChecks
      )
    ) {
      return void this.Player.emit('error', 'Empty Queue', this)
    }
    if (Number(TrackIndex) <= 0 && Number(TrackIndex) >= this.tracks.length) {
      return void this.Player.emit(
        'error',
        'Invalid Index',
        this,
        Number(TrackIndex),
      )
    }

    // Lastly Cleaning of the Tracks if any

    TrackIndex &&
    Number(TrackIndex) > 1 &&
    Number(TrackIndex) < this.tracks.length
      ? this.#__CleaningTrackMess(
        undefined,
        Number(TrackIndex) - 1 ?? undefined,
      )
      : undefined
    this.MusicPlayer.stop()
    return true
  }

  /**
   * stop() -> Stops the Player and Clean the Tracks
   * @returns {Boolean|void} true if operation emits green signal or undefined for errors
   */

  stop() {
    if (this.destroyed) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    if (!this.playing) {
      return void this.Player.emit('error', 'Not Playing', this)
    }
    if (!this.StreamPacket.tracks[0]) {
      return void this.Player.emit('error', 'Empty Queue', this)
    }
    this.#__CleaningTrackMess(
      0,
      (this.StreamPacket.tracks.length > 1
        ? this.StreamPacket.tracks.length
        : undefined) ?? undefined,
    )

    // Extra Cleanup for Music Player to avoid certain leaks
    this.StreamPacket.subscription
      ? this.StreamPacket.subscription.unsubscribe()
      : undefined
    this.MusicPlayer.stop()
    return true
  }

  /**
   * pause() -> pause the Player and freeze  Track Manulpulation and Stream tooo
   * @returns {Boolean|void} true if operation emits green signal or undefined for errors
   */

  pause() {
    if (this.destroyed) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    if (!this.playing) {
      return void this.Player.emit('error', 'Not Playing', this)
    }
    if (!this.StreamPacket.tracks[0]) {
      return void this.Player.emit('error', 'Empty Queue', this)
    }
    if (this.MusicPlayer.pause(true)) {
      this.StreamPacket.TrackTimeStamp.Paused = new Date().getTime()
      return true
    }
    return false
  }

  /**
   * resume() -> Resume the Paused Player and Unfreeze Track's Functions in Queue/StreamPacket
   * @returns {Boolean|void} true if operation emits green signal or undefined for errors
   */

  resume() {
    if (this.destroyed) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    if (!this.playing) {
      return void this.Player.emit('error', 'Not Playing', this)
    }
    if (!this.StreamPacket.tracks[0]) {
      return void this.Player.emit('error', 'Empty Queue', this)
    }
    if (!this.paused) {
      return void this.Player.emit('error', 'Not Paused', this)
    }
    if (this.MusicPlayer.unpause()) {
      this.StreamPacket.TrackTimeStamp.Starting +=
        new Date().getTime() - this.StreamPacket.TrackTimeStamp.Paused
      return true
    }
    return true
  }

  /**
   * insert() -> Insertion of Query into Track's Cache in Queue
   * @param {String} Query Query as URLs or Youtube Searches
   * @param {String | Number} TrackIndex Track Index Value to insert at any specific position
   * @param {GuildMember|User} User user Value for Track.requestedBy Object
   * @param {DefaultQueueCreateOptions|void} InsertOptions Stream Options for Query Processing | Same as Queue Creation and Play Method
   * @returns {Promise<Boolean|void>|void} true if operation emits green signal or undefined for errors
   */
  async insert(
    Query,
    TrackIndex = -1,
    User,
    InsertOptions = {
      IgnoreError: true,
      extractor: undefined,
      metadata: this.metadata,
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
  ) {
    if (this.destroyed) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    if (
      TrackIndex &&
      !(typeof TrackIndex === 'number' || typeof TrackIndex === 'string')
    ) {
      return void this.Player.emit('error', 'Invalid Index', this, TrackIndex)
    }

    // Stabilizing Insert Options with Insert Options to Create a Satisfied Options
    InsertOptions = stablizingoptions(InsertOptions, this.QueueOptions)

    // Create StreamPacket if any chance it got deleted or changed
    this.StreamPacket
      ? this.StreamPacket
      : new StreamPacketGen(
        this.Client,
        this.guildId,
        InsertOptions.metadata,
        InsertOptions.extractor,
        InsertOptions.ExtractorStreamOptions,
        this.Player,
      )
    this.StreamPacket =
      (await this.StreamPacket.insert(
        Number(TrackIndex) ?? -1,
        Query,
        InsertOptions.ExtractorStreamOptions,
        InsertOptions.extractor,
        User ?? undefined,
      )) ?? this.StreamPacket
    this.tracks = this.StreamPacket.searches
    return true
  }

  /**
   * remove() -> Remove method to Remove Song/Track from Queue/Tracks Cache
   * @param {String|Number|void} Index Track Index to Remove from Queue.tracks
   * @param {Number|void} Amount Amount of Tracks to Remove from Queue OR Queue.tracks
   * @returns {Boolean|void} true if operation emits green signal or undefined for errors
   */

  remove(Index = -1, Amount = 1) {
    if (this.destroyed) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    if (Number.isNaN(Index)) {
      return void this.Player.emit('error', 'Invalid Index', this, Index)
    }
    if (Number.isNaN(Amount)) {
      return void this.Player.emit('error', 'Invalid Amount', this, Amount)
    }
    if (Number(Index) < -1 && Number(Index) >= this.tracks.length) {
      return void this.Player.emit(
        'error',
        'Invalid Index',
        this,
        Number(Index),
      )
    }

    // Called StreamPacket.remove() function to remove it completely internally and to avoid Messup Code Snippets
    this.StreamPacket = this.StreamPacket.remove(Number(Index), Number(Amount))
    return true
  }

  /**
   * destroy() -> Destroy Queue | Also Destroy Connection with it , method is quite powerfull
   * @param {Number|void} connectionTimedout NodejsTimeout Number to destroy with a timer
   * @returns {Boolean|Number|void} true if operation emits green signal or undefined for errors
   */

  destroy(connectionTimedout = 0) {
    if (this.destroyed) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    this.StreamPacket.tracks = []
    this.StreamPacket.searches = []
    this.StreamPacket.volume = 0.095
    this.StreamPacket.AudioResource = undefined
    this.StreamPacket.previousTracks = []
    this.StreamPacket.MusicPlayerMode = undefined
    this.StreamPacket.TrackTimeStamp = {
      Starting: undefined,
      Paused: undefined,
    }

    /*
     * - Timeout Session and Call for Voice Utils's disconnect method/function
     * - Above , Cached Destruction Timeout ID , incase Queue got recovered before destruction to cancel out the destroy Timedout
     * - Below is to completely Destroy Stream Packet
     */
    const NodeTimeoutId =
      connectionTimedout ||
      (!Number.isNaN(connectionTimedout) && Number(connectionTimedout) > 0)
        ? disconnect(
          this.guildId,
          {
            destroy: true,
            MusicPlayer: this.MusicPlayer,
            Subscription: this.StreamPacket.subscription,
            Player: this.Player,
          },
          Number(connectionTimedout) ?? 0,
        )
        : undefined

    this.destroyed =
      NodeTimeoutId && !Number.isNaN(NodeTimeoutId) && Number(NodeTimeoutId) > 0
        ? Number(NodeTimeoutId)
        : true

    // StreamPacket Destruction
    const Garbage = {}
    Garbage.container1 = this.StreamPacket.tracks
    Garbage.container2 = this.StreamPacket.searches
    Garbage.container3 = this.StreamPacket.previousTracks
    Garbage.container4 = this.StreamPacket
    delete Garbage.container1
    delete Garbage.container2
    delete Garbage.container3
    delete Garbage.container4
    return this.destroyed ?? undefined
  }

  /**
   * mute() -> Mute Music Player
   * @returns {Boolean|void} true if operation emits green signal or undefined for errors
   */

  mute() {
    if (this.destroyed) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    if (!this.playing) {
      return void this.Player.emit('error', 'Not Playing', this)
    }
    if (!this.StreamPacket.tracks[0]) {
      return void this.Player.emit('error', 'Empty Queue', this)
    }
    if (this.QueueOptions && this.QueueOptions.NoMemoryLeakMode) {
      return void this.Player.emit(
        'error',
        "You can't Alter Volume of the Stream if No-Memory-Leak-Mode is enabled",
        this,
        0.095,
      )
    }
    this.volume = 0
    return true
  }

  /**
   * unmute() -> Un-Mute Music Player
   * @param {String|Number|void} Volume Volume of the Track or Music Player
   * @returns {Number|void} Returns Volume Value if operation went green or else , returns undefined if error occurs
   */

  unmute(Volume) {
    if (this.destroyed) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    if (!this.playing) {
      return void this.Player.emit('error', 'Not Playing', this)
    }
    if (!this.StreamPacket.tracks[0]) {
      return void this.Player.emit('error', 'Empty Queue', this)
    }
    if (this.QueueOptions && this.QueueOptions.NoMemoryLeakMode) {
      return void this.Player.emit(
        'error',
        "You can't Alter Volume of the Stream if No-Memory-Leak-Mode is enabled",
        this,
        Volume,
      )
    }
    if (Volume && Number.isNaN(Volume)) {
      return void this.Player.emit('error', 'Invalid Volume', this, Volume)
    }
    this.volume = Volume ? Number(Volume) : 95
    return this.volume
  }

  /**
   * clear() -> Clear Tracks from Queue and Stream Packet
   * @param {Number|String} TracksAmount Tracks Size in Queue
   * @returns {Boolean|void} true if operation emits green signal or undefined for errors
   */

  clear(TracksAmount = this.tracks.length - 1) {
    if (this.destroyed) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    if (!this.playing) {
      return void this.Player.emit('error', 'Not Playing', this)
    }
    if (!this.StreamPacket.tracks[0] || !this.StreamPacket.tracks[1]) {
      return void this.Player.emit('error', 'Empty Queue', this)
    }
    if (TracksAmount && Number.isNaN(TracksAmount)) {
      return void this.Player.emit(
        'error',
        'Invalid TracksAmount',
        this,
        TracksAmount,
      )
    }
    if (
      Number(TracksAmount) < 1 &&
      Number(TracksAmount) >= this.tracks.length
    ) {
      return void this.Player.emit(
        'error',
        'Invalid Index',
        this,
        Number(TracksAmount),
      )
    }
    this.#__CleaningTrackMess(1, Number(TracksAmount))
    return true
  }

  /**
   * back -> Playing Previous Songs from non-destroyed Queue
   * @param {String|Number} TracksBackwardIndex TrackIndex in PreviousTracks Stack to Play now or else recent ended song will be played
   * @param {User|GuildMember} User User Data if new User is using Back Command
   * @param {DefaultQueueCreateOptions} PlayOptions Stream Play Options , Same as Queue Create Options to add more into extraction and other properties
   * @param {Boolean|void} forceback if User wants to forceibly play previous Tracks without any delay or wait
   * @returns {Promise<Boolean|void>|void} true if operation emits green signal or undefined for errors
   */

  async back(
    TracksBackwardIndex = 0,
    User = undefined,
    PlayOptions = {
      IgnoreError: true,
      extractor: undefined,
      metadata: this.metadata,
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
    forceback = true,
  ) {
    if (this.destroyed) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    if (!this.previousTrack) {
      return void this.Player.emit('error', 'Empty Previous Tracks', this)
    }
    if (TracksBackwardIndex && Number.isNaN(TracksBackwardIndex)) {
      return void this.Player.emit(
        'error',
        'Invalid Track Index',
        this,
        TracksBackwardIndex,
      )
    }
    if (
      Number(TracksBackwardIndex) < 0 &&
      Number(TracksBackwardIndex) > this.StreamPacket.previousTracks.length
    ) {
      return void this.Player.emit(
        'error',
        'Previous Track Limit Exceeding',
        this,
        Number(TracksBackwardIndex),
      )
    }
    PlayOptions = stablizingoptions(PlayOptions, this.QueueOptions)
    return await this.StreamPacket.back(
      TracksBackwardIndex,
      User,
      PlayOptions,
      forceback,
    )
  }

  /**
   * createProgressBar() -> Create progress bar for Queue ,Tracks , PreviousTracks and current track(Track)
   * @param {String|void} Work  Queue ,Tracks , PreviousTracks and current track(Track) as its Value
   * @param {String|Number|void} DefaultType Default Type Value to create Progress bar Cache Types
   * @param {DefaultProgressBar} Bar Progress bar Credentials or else ByDefault it will Create one
   * @returns {String|void} Progress Bar or else undefined if any error occurs
   */

  createProgressBar(
    Work = 'track',
    DefaultType = undefined,
    Bar = {
      CompleteIcon: '▬',
      TargetIcon: '🔘',
      RemainingIcon: '▬',
      StartingIcon: undefined,
      EndIcon: undefined,
    },
  ) {
    if (this.destroyed) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    if (!this.StreamPacket) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    if (DefaultType && Number.isNaN(DefaultType)) {
      return void this.Player.emit(
        'error',
        'Invalid Default Type',
        this,
        DefaultType,
      )
    }
    switch (Work.toLowerCase().trim()) {
      case 'track':
        if (!this.StreamPacket.tracks[0]) {
          return void this.Player.emit('error', 'Nothing Playing', this)
        }
        return this.#__StructureProgressBar(
          Bar,
          Number(this.currentTimestamp.track_ms),
          Number(this.currentTimestamp.totaltrack_ms),
          DefaultType,
        )
      case 'queue':
        if (!this.StreamPacket.tracks[0]) {
          return void this.Player.emit('error', 'Empty Queue', this)
        }
        return this.#__StructureProgressBar(
          Bar,
          Number(this.currentTimestamp.saved_queue_ms) -
            Number(this.currentTimestamp.remainqueue_ms) +
            Number(this.currentTimestamp.previoustracks_ms),
          Number(this.currentTimestamp.totalqueue_ms),
          DefaultType,
        )
      case 'tracks':
        if (!this.StreamPacket.tracks[0]) {
          return void this.Player.emit('error', 'Empty Queue', this)
        }
        return this.#__StructureProgressBar(
          Bar,
          Number(this.currentTimestamp.track_ms),
          Number(this.currentTimestamp.saved_queue_ms),
          DefaultType,
        )
      case 'previousTracks':
        if (!this.previousTrack) {
          return void this.Player.emit('error', 'Empty Previous Tracks', this)
        }
        return this.#__StructureProgressBar(
          Bar,
          Number(this.currentTimestamp.previoustracks_ms),
          Number(this.currentTimestamp.totalqueue_ms),
          DefaultType,
        )
      default:
        if (!this.StreamPacket.tracks[0]) {
          return void this.Player.emit('error', 'Nothing Playing', this)
        }
        return this.#__StructureProgressBar(
          Bar,
          Number(this.currentTimestamp.track_ms),
          Number(this.currentTimestamp.totaltrack_ms),
          DefaultType,
        )
    }
  }

  /**
   * loop() -> Loop Single Track or Queue
   * @param {String|void} Choice Mode Choice , like "track" | "queue" | "off"
   * @returns {Boolean|void} returns true for green signal operation and undefined for errors
   */

  loop(Choice = DefaultModesType.Track) {
    if (this.destroyed) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    if (!this.StreamPacket) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    return this.StreamPacket.setMode(DefaultModesName.Loop, Choice)
  }

  /**
   * repeat() -> Repeat Track or Queue with "n" Times given by User
   * @param {String|void} Choice Mode Choice , like "track" | "queue" | "off"
   * @param {String|void} Times Number of Repeat Track or Queue with "n" Times given by User
   * @returns {Boolean|void} returns true for green signal operation and undefined for errors
   */

  repeat(Choice = DefaultModesType.Track, Times = 1) {
    if (this.destroyed) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    if (!this.StreamPacket) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    return this.StreamPacket.setMode(
      DefaultModesName.Repeat,
      Choice,
      Number(Times) < 1 ? 1 : Number(Times),
    )
  }

  /**
   * autoplay() -> Autplay Songs with the help of last Played Track or Query given
   * @param {String|void} ChoiceORQuery Mode Choice , like "off" | OR else give Query or Url for autoplay songs with respect to specified query
   * @returns {Boolean|void} returns true for green signal operation and undefined for errors
   */

  autoplay(ChoiceORQuery = undefined) {
    if (this.destroyed) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    if (!this.StreamPacket) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    return this.StreamPacket.setMode(DefaultModesName.Autoplay, ChoiceORQuery)
  }

  /**
   * search() -> Searching for Tracks of Query
   * @param {String} Query Query as URLs or Youtube Searches
   * @param {GuildMember|User} User user Value for Track.requestedBy Object
   * @param {DefaultQueueCreateOptions|void} SearchOptions Stream Options for Query Processing | Same as Queue Creation and Play Method
   * @returns {Promise<DefaultSearchResults>|void} Returns Tracks if operation emits green signal or undefined for errors
   */
  async search(
    Query,
    User,
    SearchOptions = {
      IgnoreError: true,
      extractor: undefined,
      metadata: this.metadata,
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
  ) {
    SearchOptions = stablizingoptions(SearchOptions, this.QueueOptions)
    SearchOptions = { ...SearchOptions, NoStreamif: true }
    const Chunks = await TrackGenerator.fetch(
      Query,
      User,
      SearchOptions,
      this.extractor,
      0,
    )
    if (Chunks.error) {
      return void this.Player.emit('error', Chunks.error, this)
    }
    return { playlist: Chunks.playlist, tracks: Chunks.tracks }
  }

  /**
   * seek() -> Seek method for position commands
   * @param {Number|String} StartingPoint Starting point for Seek method as Milliseconds or hh:mm:ss format
   * @param {Number|String|undefined} EndingPoint by default its 0 to create a clip of the a single Track
   * @returns {boolean|undefined} Returns true if operation went without errors
   */

  seek(StartingPoint, EndingPoint = 0) {
    if (this.destroyed) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    if (!this.StreamPacket) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    if (!this.StreamPacket.tracks[0]) {
      return void this.Player.emit('error', 'Empty Queue', this)
    }
    if (
      !StartingPoint ||
      !(
        (StartingPoint && !Number.isNaN(StartingPoint)) ||
        (typeof StartingPoint === 'string' && StartingPoint.includes(':'))
      )
    ) {
      return void this.Player.emit(
        'error',
        'Invalid Starting Time | Try to give in milliseconds or hh:mm:ss format',
        this,
      )
    }
    if (
      EndingPoint &&
      !(
        !Number.isNaN(EndingPoint) ||
        (typeof EndingPoint === 'string' && EndingPoint.includes(':'))
      )
    ) {
      return void this.Player.emit(
        'error',
        'Invalid Ending Time | Try to give in milliseconds or hh:mm:ss format',
        this,
      )
    }
    EndingPoint = parseInt(
      EndingPoint &&
        typeof EndingPoint === 'string' &&
        EndingPoint.includes(':')
        ? HumanTimeConversion(undefined, undefined, EndingPoint)
        : EndingPoint,
    )
    StartingPoint = parseInt(
      StartingPoint &&
        typeof StartingPoint === 'string' &&
        StartingPoint.includes(':')
        ? HumanTimeConversion(undefined, undefined, StartingPoint)
        : StartingPoint,
    )
    if (
      StartingPoint >=
      Math.floor(Number(this.tracks[0].duration) / 1000) - 1
    ) {
      return void this.Player.emit(
        'error',
        "Invalid Seek Config | Try to Give less than track's Duration",
        this,
      )
    }
    if (
      StartingPoint + EndingPoint >=
      Math.floor(Number(this.tracks[0].duration) / 1000) - 1
    ) {
      return void this.Player.emit(
        'error',
        "Invalid Seek Config | Try to Give less than track's Computed End Duration",
        this,
      )
    }
    if (StartingPoint <= 0 || (EndingPoint !== 0 && EndingPoint < 0)) {
      return void this.Player.emit(
        'error',
        "Invalid Seek Config | Try to Give less than track's Duration",
        this,
      )
    }
    this.StreamPacket.ExternalModes = {
      seek: {
        StartingPoint,
        EndingPoint: EndingPoint !== 0 ? EndingPoint : undefined,
      },
      audioFilters: this.StreamPacket.ExternalModes
        ? this.StreamPacket.ExternalModes.audioFilters
        : [],
      filtersUpdateChecks: true,
    }
    this.skip()
    return true
  }

  /**
   * setFilters() -> Add or Remove Filters to Track and Audio
   * @param {DefaultUserDrivenAudioFilters|void} FilterStructure Filter Structure Value for filtering real values or undefined to remove all filters
   * @param {boolean|undefined} forceApply Force Skip Track now
   * @returns {Boolean|void} returns true for complete process or else undefined for errors
   */

  setFilters(FilterStructure = undefined, forceApply = false) {
    if (this.destroyed) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    if (!this.StreamPacket) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    if (!this.StreamPacket.tracks[0]) {
      return void this.Player.emit('error', 'Empty Queue', this)
    }
    this.StreamPacket.ExternalModes = {
      seek: forceApply
        ? {
          StartingPoint:
              Math.floor(Number(this.currentTimestamp.track_ms) / 1000) + 1,
        }
        : undefined,
      audioFilters: FilterStructure
        ? AudioFiltersConverter(FilterStructure) ?? []
        : ['off'],
      filtersUpdateChecks: !!forceApply,
    }
    forceApply ? this.skip() : undefined
    return true
  }

  /**
   * shuffle() -> Shuffling the Tracks in Cache Randomly
   * @returns {Boolean|void} Returns true for green signal operation or undefined for errors
   */

  shuffle() {
    if (this.destroyed) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    if (!this.StreamPacket) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    if (
      !(
        this.StreamPacket.tracks &&
        this.StreamPacket.tracks[0] &&
        this.StreamPacket.tracks.length > 2
      )
    ) {
      return void this.Player.emit('error', 'Less Tracks for Shuffling', this)
    }

    let Arraycount = this.StreamPacket.tracks.length
    let RandomIndex
    const Cache = { search: undefined, track: undefined }
    while (Arraycount > 2) {
      RandomIndex = Math.floor(Math.random() * (Arraycount - 3) + 3 || 3)
      Cache.track = this.StreamPacket.tracks[Arraycount]
      Cache.search = this.StreamPacket.searches[Arraycount]
      this.StreamPacket.tracks[Arraycount] = this.StreamPacket.tracks[
        RandomIndex
      ]
      this.StreamPacket.searches[Arraycount] = this.StreamPacket.searches[
        RandomIndex
      ]
      this.StreamPacket.tracks[RandomIndex] = Cache.track
      this.StreamPacket.searches[RandomIndex] = Cache.search
      Arraycount -= 1
    }
    this.StreamPacket.tracks.filter(Boolean)
    this.StreamPacket.searches.filter(Boolean)
    return true
  }

  /**
   * Volume of the Music Player Currently OR to set new Volume for Music Player
   * @type {Number|void}
   * @readonly
   */

  get volume() {
    if (this.destroyed) return void null
    if (this.QueueOptions && this.QueueOptions.NoMemoryLeakMode) return 100
    return (this.StreamPacket.volume ?? 0.095) * 1000
  }

  set volume(Volume = 0) {
    if (this.destroyed) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    if (this.QueueOptions && this.QueueOptions.NoMemoryLeakMode) {
      return void this.Player.emit(
        'error',
        "You can't Alter Volume of the Stream if No-Memory-Leak-Mode is enabled",
        this,
        Volume,
      )
    }
    if (
      !(typeof Volume === 'number' || typeof Volume === 'string') &&
      (Number(Volume) > 200 || Number(Volume) < 0)
    ) {
      return void this.Player.emit('error', 'Invalid Volume', this, Volume)
    }
    this.StreamPacket.volume = Number(Volume) / 1000
    if (this.tracks && this.tracks[0] && this.StreamPacket.AudioResource) {
      this.StreamPacket.AudioResource.volume.setVolume(this.StreamPacket.volume)
    }
    return this.StreamPacket.volume
  }

  /**
   * MusicPlayer's Paused's Status as Boolean
   * @type {Boolean|void}
   * @readonly
   */
  get paused() {
    if (
      !(
        this.MusicPlayer &&
        this.MusicPlayer.state &&
        this.MusicPlayer.state.status
      )
    ) {
      return false
    }
    return (
      this.MusicPlayer.state.status === AudioPlayerStatus.Paused ||
      this.MusicPlayer.state.status === AudioPlayerStatus.AutoPaused
    )
  }

  /**
   * MusicPlayer's Playing/Activity's Status as Boolean
   * @type {Boolean}
   * @readonly
   */

  get playing() {
    if (
      !(
        this.MusicPlayer &&
        this.MusicPlayer.state &&
        this.MusicPlayer.state.status
      )
    ) {
      return false
    }
    return this.MusicPlayer.state.status !== AudioPlayerStatus.Idle
  }

  /**
   * Returns Current Track Cached in Stream Packet or Queue.tracks
   * @type {DefaultTrack|void}
   * @readonly
   */
  get current() {
    if (this.destroyed || !(this.tracks && this.tracks[0])) return undefined
    return this.StreamPacket.searches[0]
  }

  /**
   * CurrentTimeStamp -> TimeStamp of tracks , queue and e.t.c in milliseconds and human readable format
   * @type {DefaultcurrentTimestamp|void}
   * @readonly
   */

  get currentTimestamp() {
    if (this.destroyed) {
      return void this.Player.emit('error', 'Destroyed Queue', this)
    }
    if (!this.StreamPacket.tracks[0]) {
      return void this.Player.emit('error', 'Empty Queue', this)
    }
    this.StreamPacket.A
    const TimeStamp = {
      track_ms: `${
        this.paused
          ? this.StreamPacket.TrackTimeStamp.Paused -
            this.StreamPacket.TrackTimeStamp.Starting
          : new Date().getTime() - this.StreamPacket.TrackTimeStamp.Starting
      }`,
      totaltrack_ms: `${this.StreamPacket.tracks[0].duration}`,
      previoustracks_ms: `${
        this.StreamPacket.previousTracks && this.StreamPacket.previousTracks[0]
          ? this.StreamPacket.previousTracks.reduce(
            (TotalValue, CurrentTrack) => TotalValue + CurrentTrack.duration,
            0,
          )
          : 0
      }`,
      totalqueue_ms: `${
        (this.StreamPacket.previousTracks && this.StreamPacket.previousTracks[0]
          ? this.StreamPacket.previousTracks.reduce(
            (TotalValue, CurrentTrack) => TotalValue + CurrentTrack.duration,
            0,
          )
          : 0) +
        (this.StreamPacket.tracks && this.StreamPacket.tracks[0]
          ? this.StreamPacket.tracks
            .slice(0, this.StreamPacket.tracks.length)
            .reduce(
              (TotalValue, CurrentTrack) => TotalValue + CurrentTrack.duration,
              0,
            )
          : 0)
      }`,
      saved_queue_ms:
        this.StreamPacket.tracks && this.StreamPacket.tracks[0]
          ? `${this.StreamPacket.tracks.reduce(
            (TotalValue, CurrentTrack) => TotalValue + CurrentTrack.duration,
            0,
          )}`
          : '0',
      queue_ms: `${
        (this.StreamPacket.tracks && this.StreamPacket.tracks[0]
          ? this.paused
            ? this.StreamPacket.TrackTimeStamp.Paused -
              this.StreamPacket.TrackTimeStamp.Starting
            : new Date().getTime() - this.StreamPacket.TrackTimeStamp.Starting
          : 0) +
        (this.StreamPacket.tracks && this.StreamPacket.tracks[1]
          ? this.StreamPacket.tracks
            .slice(1, this.StreamPacket.tracks.length)
            .reduce(
              (TotalValue, CurrentTrack) => TotalValue + CurrentTrack.duration,
              0,
            )
          : 0)
      }`,
      remainqueue_ms: `${
        (this.StreamPacket.tracks && this.StreamPacket.tracks[0]
          ? this.StreamPacket.tracks.reduce(
            (TotalValue, CurrentTrack) => TotalValue + CurrentTrack.duration,
            0,
          )
          : 0) -
        (this.paused
          ? this.StreamPacket.TrackTimeStamp.Paused -
            this.StreamPacket.TrackTimeStamp.Starting
          : new Date().getTime() - this.StreamPacket.TrackTimeStamp.Starting)
      }`,
    }
    return {
      ...TimeStamp,
      human_track: HumanTimeConversion(TimeStamp.track_ms),
      human_totaltrack: HumanTimeConversion(TimeStamp.totaltrack_ms),
      human_previoustracks: HumanTimeConversion(TimeStamp.previoustracks_ms),
      human_totalqueue: HumanTimeConversion(TimeStamp.totalqueue_ms),
      human_saved_queue: HumanTimeConversion(TimeStamp.saved_queue_ms),
      human_queue: HumanTimeConversion(TimeStamp.queue_ms),
      human_remainqueue: HumanTimeConversion(TimeStamp.remainqueue_ms),
    }
  }

  /**
   * Previous Track Data | Same as Queue.current , But Data of previous track
   * @type {DefaultTrack|void}
   * @readonly
   */

  get previousTrack() {
    if (this.destroyed) return void null
    if (this.StreamPacket.previousTracks.length < 1) return void null
    return this.StreamPacket.previousTracks[
      this.StreamPacket.previousTracks.length - 1
    ]
  }

  /**
   * Player Mode of Music Player like 'Loop','Repeat','AutoPlay'
   * @type {DefaultPlayerMode|void}
   * @readonly
   */

  get playerMode() {
    if (this.destroyed) return void null
    if (!this.StreamPacket) return void null
    if (this.StreamPacket.previousTracks.length < 1) return void null
    if (!this.StreamPacket.MusicPlayerMode) return void null
    if (this.StreamPacket.MusicPlayerMode.Loop) {
      return {
        mode: DefaultModesName.Loop,
        type: this.StreamPacket.MusicPlayerMode.Loop,
      }
    }
    if (this.StreamPacket.MusicPlayerMode.Repeat) {
      return {
        mode: DefaultModesName.Repeat,
        type: this.StreamPacket.MusicPlayerMode.Repeat[0],
        times: this.StreamPacket.MusicPlayerMode.Repeat[1],
      }
    }
    if (this.StreamPacket.MusicPlayerMode.Autoplay) {
      return {
        mode: DefaultModesName.Autoplay,
        type: this.StreamPacket.MusicPlayerMode.Autoplay,
      }
    }
    return void null
  }

  /**
   * Audio Filters Cached in Queue
   * @type {DefaultUserDrivenAudioFilters|void}
   * @readonly
   */

  get filters() {
    if (this.destroyed) return void null
    if (!this.StreamPacket) return void null
    if (
      !this.StreamPacket.ExternalModes ||
      !(
        this.StreamPacket.ExternalModes &&
        this.StreamPacket.ExternalModes.audioFilters &&
        this.StreamPacket.ExternalModes.audioFilters[0]
      )
    )
      return DefaultUserDrivenAudioFilters
    return (
      AudioFiltersConverter(this.StreamPacket.ExternalModes.audioFilters) ??
      DefaultUserDrivenAudioFilters
    )
  }

  /**
   * Enabled Audio Filters for Cached in Queue
   * @type {String[]|void}
   * @readonly
   */

  get enabledFilters() {
    if (this.destroyed) return void null
    if (!this.StreamPacket) return void null
    if (!this.filters) return void null

    const ObjectKeys = Object.keys(this.filters)
    const CachedEnabled = []
    for (let count = 0, len = ObjectKeys.length; count < len; ++count) {
      if (this.filters[`${ObjectKeys[count]}`])
        CachedEnabled.push(ObjectKeys[count])
    }
    return CachedEnabled
  }

  /**
   * Disabled Audio Filters for Cached in Queue
   * @type {String[]|void}
   * @readonly
   */

  get disabledFilters() {
    if (this.destroyed) return void null
    if (!this.StreamPacket) return void null
    if (!this.filters) return void null

    const ObjectKeys = Object.keys(this.filters)
    const CachedDisabled = []
    for (let count = 0, len = ObjectKeys.length; count < len; ++count) {
      if (!this.filters[`${ObjectKeys[count]}`])
        CachedDisabled.push(ObjectKeys[count])
    }
    return CachedDisabled
  }

  /**
   * Audio Resource or Management of Tracks in Queue
   * @private #__ResourcePlay() -> Resource Plays
   * @returns {Promise<void>} Returns undefined , it just completes a one-go process
   */

  async #__ResourcePlay() {
    const GarbagePlayerModeHandle = this.StreamPacket
      ? await this.StreamPacket.__handleMusicPlayerModes(this)
      : undefined
    if (this.destroyed) return void null
    if (
      this.StreamPacket &&
      !(
        this.StreamPacket &&
        this.StreamPacket.tracks &&
        this.StreamPacket.tracks[0]
      ) &&
      (!this.playerMode ||
        (this.playerMode &&
          (this.playerMode.type === DefaultModesType.Queue ||
            this.playerMode.mode === DefaultModesName.Autoplay) &&
          !GarbagePlayerModeHandle))
    ) {
      this.#__QueueAudioPlayerStatusManager()
      return void this.Player.emit('queueEnd', this)
    }
    if (!this.StreamPacket) return void null
    this.destroyed =
      this.destroyed && Number(this.destroyed) > 0
        ? clearTimeout(Number(this.destroyed))
        : undefined
    try {
      const AudioResource = this.StreamPacket.StreamAudioResourceExtractor(
        this.StreamPacket.tracks[0],
      )
      if (!(this.StreamPacket && this.StreamPacket.tracks[0].tampered))
        this.Player.emit('trackStart', this, this.tracks[0])
      this.MusicPlayer.play(AudioResource)
      if (!this.StreamPacket.subscription && getVoiceConnection(this.guildId)) {
        this.StreamPacket.subscription =
          getVoiceConnection(this.guildId).subscribe(this.MusicPlayer) ??
          undefined
      }
      return void (await entersState(
        this.MusicPlayer,
        AudioPlayerStatus.Playing,
        5e3,
      ))
    } catch (error) {
      this.Player.emit(
        'connectionError',
        `${error.message ?? error ?? 'Audio Resource Streaming Error'}`,
        this,
        getVoiceConnection(this.guildId),
        this.guildId,
      )
      if (this.tracks[1]) return void this.MusicPlayer.stop()
      return void this.destroy()
    }
  }

  /**
   * @private #__CleaningTrackMess -> Cleaning Tracks from mentioned Starting Index and Delete Tracks Number
   * @param {Number|void} StartingTrackIndex Starting Track Index Number
   * @param {Number|void} DeleteTracksCount Delete Tracks Count Number
   * @returns {void} undefined as it's a One-Go Process
   */

  #__CleaningTrackMess(StartingTrackIndex = 0, DeleteTracksCount) {
    if (
      !(
        this.StreamPacket &&
        this.StreamPacket.tracks &&
        this.StreamPacket.tracks[0] &&
        this.StreamPacket.searches[0]
      )
    ) {
      return void null
    }
    DeleteTracksCount
      ? this.StreamPacket.tracks.splice(
        StartingTrackIndex ?? 0,
        DeleteTracksCount,
      )
      : this.StreamPacket.tracks.shift()
    DeleteTracksCount
      ? this.StreamPacket.searches.splice(
        StartingTrackIndex ?? 0,
        DeleteTracksCount,
      )
      : this.StreamPacket.searches.shift()

    return void null
  }

  /**
   * @private #__QueueAudioPlayerStatusManager -> Audio Player Manager as a part of End Event Handling
   * @returns {void} undefined as it's a One-Go Process
   */

  #__QueueAudioPlayerStatusManager() {
    if (this.destroyed) return void null
    if (this.QueueOptions.LeaveOnEnd && !this.tracks[0]) {
      this.destroyed && Number(this.destroyed) > 0
        ? clearTimeout(Number(this.destroyed))
        : undefined
      return (
        this.destroy(this.QueueOptions.LeaveOnEndTimedout ?? 0) ?? undefined
      )
    }
    return void null
  }

  /**
   * @private #__StructureProgressBar() -> Progress bar Workload for Queue.createProgressBar() method
   * @param {Object} Credentials Credentials as Progress Bar work Data
   * @param {Number} FirstValue Starting Index of Requested Array
   * @param {Number} TotalValue End Index of Requested Array OR Total Counts
   * @param {String|Number|void} DefaultType Default Framework Slot Number to use
   * @returns {String|void} Progress Bar GUI in the form of string or errors on undefined
   */

  #__StructureProgressBar(Credentials, FirstValue, TotalValue, DefaultType) {
    if (DefaultType || DefaultType === 0) {
      switch (`${DefaultType}`) {
        case '1':
          Credentials.CompleteIcon = Credentials.CompleteIcon ?? '●'
          Credentials.TargetIcon = Credentials.TargetIcon ?? '●'
          Credentials.RemainingIcon = Credentials.RemainingIcon ?? '○'
          Credentials.StartingIcon =
            Credentials.StartingIcon ??
            `${HumanTimeConversion(undefined, {
              Time: FirstValue,
              ignore: ['milliseconds'],
            })} |  `
          Credentials.EndIcon =
            Credentials.EndIcon ??
            `  | ${HumanTimeConversion(undefined, {
              Time: TotalValue,
              ignore: ['milliseconds'],
            })}`
          break
        case '2':
          Credentials.CompleteIcon = Credentials.CompleteIcon ?? '○'
          Credentials.TargetIcon = Credentials.TargetIcon ?? '●'
          Credentials.RemainingIcon = Credentials.RemainingIcon ?? '○'
          Credentials.StartingIcon =
            Credentials.StartingIcon ??
            `${HumanTimeConversion(undefined, {
              Time: FirstValue,
              ignore: ['milliseconds'],
            })} |  `
          Credentials.EndIcon =
            Credentials.EndIcon ??
            `  | ${HumanTimeConversion(undefined, {
              Time: TotalValue,
              ignore: ['milliseconds'],
            })}`
          break
        case '3':
          Credentials.CompleteIcon = Credentials.CompleteIcon ?? '○'
          Credentials.TargetIcon = Credentials.TargetIcon ?? '◉'
          Credentials.RemainingIcon = Credentials.RemainingIcon ?? '○'
          Credentials.StartingIcon =
            Credentials.StartingIcon ??
            `${HumanTimeConversion(undefined, {
              Time: FirstValue,
              ignore: ['milliseconds'],
            })} |  `
          Credentials.EndIcon =
            Credentials.EndIcon ??
            `  | ${HumanTimeConversion(undefined, {
              Time: TotalValue,
              ignore: ['milliseconds'],
            })}`
          break
        case '4':
          Credentials.CompleteIcon = Credentials.CompleteIcon ?? '■'
          Credentials.TargetIcon = Credentials.TargetIcon ?? '■'
          Credentials.RemainingIcon = Credentials.RemainingIcon ?? '□'
          Credentials.StartingIcon =
            Credentials.StartingIcon ??
            `${HumanTimeConversion(undefined, {
              Time: FirstValue,
              ignore: ['milliseconds'],
            })} |  `
          Credentials.EndIcon =
            Credentials.EndIcon ??
            `  | ${HumanTimeConversion(undefined, {
              Time: TotalValue,
              ignore: ['milliseconds'],
            })}`
          break
        case '5':
          Credentials.CompleteIcon = Credentials.CompleteIcon ?? '◉'
          Credentials.TargetIcon = Credentials.TargetIcon ?? '◉'
          Credentials.RemainingIcon = Credentials.RemainingIcon ?? '○'
          Credentials.StartingIcon =
            Credentials.StartingIcon ??
            `${HumanTimeConversion(undefined, {
              Time: FirstValue,
              ignore: ['milliseconds'],
            })} |  `
          Credentials.EndIcon =
            Credentials.EndIcon ??
            `  | ${HumanTimeConversion(undefined, {
              Time: TotalValue,
              ignore: ['milliseconds'],
            })}`
          break
        default:
          Credentials.CompleteIcon = Credentials.CompleteIcon ?? '▬'
          Credentials.TargetIcon = Credentials.TargetIcon ?? '🔘'
          Credentials.RemainingIcon = Credentials.RemainingIcon ?? '▬'
          Credentials.StartingIcon =
            Credentials.StartingIcon ??
            `${HumanTimeConversion(undefined, {
              Time: FirstValue,
              ignore: ['milliseconds'],
            })} |  `
          Credentials.EndIcon =
            Credentials.EndIcon ??
            `  | ${HumanTimeConversion(undefined, {
              Time: TotalValue,
              ignore: ['milliseconds'],
            })}`
          break
      }
    }
    const Size =
      Math.floor(
        (
          parseFloat(parseInt(FirstValue * 100) / parseInt(TotalValue)) / 10
        ).toFixed(1),
      ) + 1
    const ProgressBar = []
    let TargetHit = true
    for (let count = 0.7; count <= 10.5; count += 0.7) {
      if (count === 0.7) {
        ProgressBar.push(
          Credentials.StartingIcon ??
            `${HumanTimeConversion(undefined, {
              Time: FirstValue,
              ignore: ['milliseconds'],
            })} |  `,
        )
      }
      if (count <= Size && count >= Size - 0.7 && TargetHit) {
        ProgressBar.push(Credentials.TargetIcon)
        TargetHit = false
      } else if (count < Size) ProgressBar.push(Credentials.CompleteIcon)
      else ProgressBar.push(Credentials.RemainingIcon)
    }
    if (Size >= 11) ProgressBar.push(Credentials.TargetIcon)
    ProgressBar.push(
      Credentials.EndIcon ??
        `  | ${HumanTimeConversion(undefined, {
          Time: TotalValue,
          ignore: ['milliseconds'],
        })}`,
    )
    return ProgressBar.join('').trim()
  }
}

module.exports = Queue
