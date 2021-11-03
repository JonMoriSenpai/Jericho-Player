const {
  createAudioPlayer,
  AudioPlayerStatus,
  entersState,
  NoSubscriberBehavior,
  AudioPlayer,
} = require('@discordjs/voice');
const {
  User,
  Client,
  GuildMember,
  VoiceChannel,
  StageChannel,
  Message,
} = require('discord.js');
const StreamPacketGen = require('../Structures/Stream-Packet');
const ClassUtils = require('../Utilities/Class-Utils');
const { disconnect } = require('../Utilities/Voice-Utils');
const JerichoPlayer = require('./Player-Handler');
const {
  DefaultQueueCreateOptions,
  DefaultProgressBar,
  DefaultTrack,
  DefaultStreamPacket,
  DefaultModesName,
  DefaultPlayerMode,
  DefaultModesType,
} = require('../types/interfaces');
const TrackGenerator = require('../Structures/Tracks');

/**
 * @class Queue -> Queue Class for Creating Queue Instances for Guild
 * Queue Instance for Making a Virtual Play Ground for handling all Requests in a static Area
 * @return New Queue Instance
 */

class Queue {
  /**
   * @param {Client} Client Discord Client Instance
   * @param {Message} message Guild's Text Messsage
   * @param {DefaultQueueCreateOptions<Object>|undefined} QueueOptions Queue Create Options
   * @param {JerichoPlayer} JerichoPlayer Jericho Player Instance
   */
  constructor(
    Client,
    message,
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
      },
      IgnoreError: undefined,
      LeaveOnEmpty: undefined,
      LeaveOnEnd: undefined,
      LeaveOnBotOnly: undefined,
      LeaveOnEmptyTimedout: undefined,
      LeaveOnEndTimedout: undefined,
      LeaveOnBotOnlyTimedout: undefined,
    },
    JerichoPlayer = undefined,
  ) {
    /**
     * @param {Client} Client Discord Client Instance
     */
    this.Client = Client;

    // overwritting Queue Options with Default Queue Options Saved in Package
    /**
     * @param {DefaultQueueCreateOptions<Object>} QueueOptions Queue Default Options for Upcoming methods operations
     */
    this.QueueOptions = QueueOptions = ClassUtils.stablizingoptions(
      QueueOptions,
      DefaultQueueCreateOptions,
    );

    /**
     * @param {DefaultStreamPacket} StreamPacket Stream packet for Queue | Simply Handling Voice Connections and Tracks/Streams
     */
    this.StreamPacket = new StreamPacketGen(
      Client,
      message.guild.id,
      QueueOptions.metadata,
      QueueOptions.extractor,
      QueueOptions.ExtractorStreamOptions,
      JerichoPlayer,
    );

    /**
     * @param {Message} message Guild Text Channel's message instance
     */
    this.message = message;

    /**
     * @param {Object|undefined} metadata Metadata value in Queue for Audio Resources
     */
    this.metadata = QueueOptions.metadata;

    /**
     * @param {DefaultTrack[]|Object[]} tracks Queue.tracks[] holds all the Queue's tracks Cache
     */
    this.tracks = [];

    /**
     * @param {Guild["id"]|String|Number} guildId Guild's id Object cached from new constructor's guild value
     */
    this.guildId = message.guild.id;

    /**
     * @param {Boolean|Number} destroyed Queue has been destroyed with Queue.destroy() respond with Boolean or else in delay for destruction will return Timedout ID for clearInterval fucntion
     */
    this.destroyed = false;

    /**
     * @param {AudioPlayer} MusicPlayer New Music Player for the Queue Instance to carry out the Basic Stream Operations
     */
    this.MusicPlayer = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
      },
    });

    /**
     * @param {JerichoPlayer} JerichoPlayer Player's Instance for fetching Queue from Cache , Just in case it is required
     */
    this.JerichoPlayer = JerichoPlayer;

    /**
     * "statechange" Voice Event for Audio Player for quick filtered Decision making
     */
    this.MusicPlayer.on('stateChange', async (oldState, newState) => {
      if (newState.status === AudioPlayerStatus.Idle) {
        if (
          this.StreamPacket
          && this.tracks
          && this.tracks[0]
          && this.StreamPacket.AudioResource
        ) {
          this.StreamPacket.AudioResource = undefined;
          if (
            this.StreamPacket
            && !(await this.StreamPacket.__handleMusicPlayerModes(this))
          ) this.StreamPacket.previousTracks.push(this.StreamPacket.searches[0]);
          this.JerichoPlayer.emit('trackEnd', this, this.tracks[0]);
        }
        if (!this.destroyed) this.#__CleaningTrackMess();
        this.#__ResourcePlay();
      } else if (newState && newState.status === AudioPlayerStatus.Playing) {
        this.StreamPacket.TrackTimeStamp.Starting = new Date().getTime();
        this.StreamPacket.TimedoutId = undefined;
      }
    });
  }

  /**
   * @method play() ->  Play Options for Queue Instance , Accept any kind of URL if extractor is "youtube-dl" or set undefined | "play-dl" to fetch from custom extractor
   * @param {String} Query Query like URls or Youtube Searches | Default Extractor accept 5 supported and big websites like youtube , spotify , soundcloud , retribution , facebook and for "youtube-dl" , it accept any follows official "youtube" searches
   * @param {VoiceChannel|StageChannel} VoiceChannel Voice Channel from Discord.js
   * @param {User|GuildMember} User Guild Member or Guild User for requestedBy Object in track
   * @param {DefaultQueueCreateOptions<Object>} PlayOptions Play Options | Queue Create Options | Stream Options for Additional features
   * @returns {Promise<Boolean|undefined>|undefined} undefined on successfull attempt or Promise rejection | true if operation went good signal
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
      },
    },
  ) {
    // Watch for Queue.destroyed Property for ignoring Invalid operation and further un-wanted Errors
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    // Checks for Valid Voice Channel Type to avoid further meaningless operations
    if (
      !VoiceChannel
      || !(
        VoiceChannel
        && VoiceChannel.id
        && VoiceChannel.guild
        && VoiceChannel.guild.id
        && VoiceChannel.type
        && ['guild_voice', 'guild_stage_voice'].includes(
          VoiceChannel.type.toLowerCase().trim(),
        )
      )
    ) {
      return void this.JerichoPlayer.emit(
        'error',
        'Invalid Voice Channel',
        this,
      );
    }

    // Comparing and Placing Default Values if any
    PlayOptions = ClassUtils.stablizingoptions(PlayOptions, this.QueueOptions);

    // Stream Packet created if <Queue>.destroyed is true to create Voice Connection store Values
    this.StreamPacket = this.StreamPacket
      ? this.StreamPacket
      : new StreamPacketGen(
        this.Client,
        this.guildId,
        PlayOptions.metadata,
        PlayOptions.extractor,
        PlayOptions.ExtractorStreamOptions,
        this.JerichoPlayer,
      );

    // Dynamically | In-directly fetches Data about Query and store it as Stream-Packet
    this.StreamPacket = (await this.StreamPacket.create(
      Query,
      VoiceChannel,
      PlayOptions,
      PlayOptions.extractor,
      User ?? undefined,
    )) ?? this.StreamPacket;
    this.tracks = this.StreamPacket.searches;

    // __ResourcePlay() is quite powerfull and shouldbe placed after double checks as it is the main component for Playing Streams
    if (!this.playing && !this.paused && this.tracks && this.tracks[0]) await this.#__ResourcePlay();
    return true;
  }

  /**
   * @method skip() ->  Skips the Curren Song if Index is undefined | 0 , or else act as skipTo Type where Next song will play what has been Mentioned
   * @param {String|Number|undefined} TrackIndex Track's Index (0,1,2,..) To Skip to Specified Track or else undefined to skip current and play song now
   * @returns {Boolean|undefined} true if operation went signal Green or else undefined for error event triggers
   */

  skip(TrackIndex) {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (
      TrackIndex
      && !(typeof TrackIndex === 'number' || typeof TrackIndex === 'string')
    ) {
      return void this.JerichoPlayer.emit(
        'error',
        'Invalid Index',
        this,
        TrackIndex,
      );
    }
    if (!this.playing || (this.playing && !this.StreamPacket.tracks[1])) return void this.JerichoPlayer.emit('error', 'Empty Queue', this);
    if (Number(TrackIndex) <= 0 && Number(TrackIndex) >= this.tracks.length) {
      return void this.JerichoPlayer.emit(
        'error',
        'Invalid Index',
        this,
        Number(TrackIndex),
      );
    }

    // Lastly Cleaning of the Tracks if any

    TrackIndex
    && Number(TrackIndex) > 1
    && Number(TrackIndex) < this.tracks.length
      ? this.#__CleaningTrackMess(
        undefined,
        Number(TrackIndex) - 1 ?? undefined,
      )
      : undefined;
    this.MusicPlayer.stop();
    return true;
  }

  /**
   * @method stop() -> Stops the Player and Clean the Tracks
   * @returns {Boolean|undefined} true if operation emits green signal or undefined for errors
   */

  stop() {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (!this.playing) return void this.JerichoPlayer.emit('error', 'Not Playing', this);
    if (!this.StreamPacket.tracks[0]) return void this.JerichoPlayer.emit('error', 'Empty Queue', this);
    this.#__CleaningTrackMess(
      0,
      (this.StreamPacket.tracks.length > 1
        ? this.StreamPacket.tracks.length
        : undefined) ?? undefined,
    );

    // Extra Cleanup for Music Player to avoid certain leaks
    this.StreamPacket.subscription.unsubscribe();
    this.MusicPlayer.stop();
    return true;
  }

  /**
   * @method pause() -> pause the Player and freeze  Track Manulpulation and Stream tooo
   * @returns {Boolean|undefined} true if operation emits green signal or undefined for errors
   */

  pause() {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (!this.playing) return void this.JerichoPlayer.emit('error', 'Not Playing', this);
    if (!this.StreamPacket.tracks[0]) return void this.JerichoPlayer.emit('error', 'Empty Queue', this);
    if (this.MusicPlayer.pause(true)) {
      this.StreamPacket.TrackTimeStamp.Paused = new Date().getTime();
      return true;
    }
    return false;
  }

  /**
   * @method resume() -> Resume the Paused Player and Unfreeze Track's Functions in Queue/StreamPacket
   * @returns {Boolean|undefined} true if operation emits green signal or undefined for errors
   */

  resume() {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (!this.playing) return void this.JerichoPlayer.emit('error', 'Not Playing', this);
    if (!this.StreamPacket.tracks[0]) return void this.JerichoPlayer.emit('error', 'Empty Queue', this);
    if (!this.paused) return void this.JerichoPlayer.emit('error', 'Not Paused', this);
    if (this.MusicPlayer.unpause()) {
      this.StreamPacket.TrackTimeStamp.Starting
        += new Date().getTime() - this.StreamPacket.TrackTimeStamp.Paused;
      return true;
    }
    return true;
  }

  /**
   * @method insert() -> Insertion of Query into Track's Cache in Queue
   * @param {String} Query Query as URLs or Youtube Searches
   * @param {String | Number} TrackIndex Track Index Value to insert at any specific position
   * @param {GuildMember|User} User user Value for Track.requestedBy Object
   * @param {DefaultQueueCreateOptions<Object>|undefined} InsertOptions Stream Options for Query Processing | Same as Queue Creation and Play Method
   * @returns {Promise<Boolean|undefined>|undefined} true if operation emits green signal or undefined for errors
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
      },
    },
  ) {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (
      TrackIndex
      && !(typeof TrackIndex === 'number' || typeof TrackIndex === 'string')
    ) {
      return void this.JerichoPlayer.emit(
        'error',
        'Invalid Index',
        this,
        TrackIndex,
      );
    }

    // Stabilizing Insert Options with Insert Options to Create a Satisfied Options
    InsertOptions = ClassUtils.stablizingoptions(
      InsertOptions,
      this.QueueOptions,
    );

    // Create StreamPacket if any chance it got deleted or changed
    this.StreamPacket
      ? this.StreamPacket
      : new StreamPacketGen(
        this.Client,
        this.guildId,
        InsertOptions.metadata,
        InsertOptions.extractor,
        InsertOptions.ExtractorStreamOptions,
        this.JerichoPlayer,
      );
    this.StreamPacket = (await this.StreamPacket.insert(
      Number(TrackIndex) ?? -1,
      Query,
      InsertOptions.ExtractorStreamOptions,
      InsertOptions.extractor,
      User ?? undefined,
    )) ?? this.StreamPacket;
    this.tracks = this.StreamPacket.searches;
    return true;
  }

  /**
   * @method remove() -> Remove method to Remove Song/Track from Queue/Tracks Cache
   * @param {String|Number|undefined} Index Track Index to Remove from Queue.tracks
   * @param {Number|undefined} Amount Amount of Tracks to Remove from Queue OR Queue.tracks
   * @returns {Boolean|undefined} true if operation emits green signal or undefined for errors
   */

  remove(Index = -1, Amount = 1) {
    if (this.destroyed) {
      return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    }
    if (Number.isNaN(Index)) {
      return void this.JerichoPlayer.emit('error', 'Invalid Index', this, Index);
    }
    if (Number.isNaN(Amount)) {
      return void this.JerichoPlayer.emit(
        'error',
        'Invalid Amount',
        this,
        Amount,
      );
    }
    if (Number(Index) < -1 && Number(Index) >= this.tracks.length) {
      return void this.JerichoPlayer.emit(
        'error',
        'Invalid Index',
        this,
        Number(Index),
      );
    }

    // Called StreamPacket.remove() function to remove it completely internally and to avoid Messup Code Snippets
    this.StreamPacket = this.StreamPacket.remove(Number(Index), Number(Amount));
    return true;
  }

  /**
   * @method destroy() -> Destroy Queue | Also Destroy Connection with it , method is quite powerfull
   * @param {Number|undefined} connectionTimedout NodejsTimeout Number to destroy with a timer
   * @returns {Boolean|undefined} true if operation emits green signal or undefined for errors
   */

  destroy(connectionTimedout = 0) {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    this.StreamPacket.tracks = [];
    this.StreamPacket.searches = [];
    this.StreamPacket.volume = 0.095;
    this.StreamPacket.AudioResource = undefined;
    this.StreamPacket.previousTracks = [];
    this.StreamPacket.MusicPlayerMode = undefined;
    this.StreamPacket.TrackTimeStamp = {
      Starting: undefined,
      Paused: undefined,
    };

    /**
     * Timeout Session and Call for Voice Utils's disconnect method/function
     * Above , Cached Destruction Timeout ID , incase Queue got recovered before destruction to cancel out the destroy Timedout
     * Below is to completely Destroy Stream Packet
     */
    const NodeTimeoutId = connectionTimedout || connectionTimedout === 0
      ? disconnect(
        this.guildId,
        { destroy: true },
        Number(connectionTimedout) ?? 0,
        this,
      )
      : undefined;

    this.destroyed = NodeTimeoutId;

    // StreamPacket Destruction
    const Garbage = {};
    Garbage.container = this.StreamPacket;
    delete Garbage.container;
    this.StreamPacket = undefined;
    return NodeTimeoutId ?? undefined;
  }

  /**
   * @method mute() -> Mute Music Player
   * @returns {Boolean|undefined} true if operation emits green signal or undefined for errors
   */

  mute() {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (!this.playing) return void this.JerichoPlayer.emit('error', 'Not Playing', this);
    if (!this.StreamPacket.tracks[0]) return void this.JerichoPlayer.emit('error', 'Empty Queue', this);
    this.volume = 0;
    return true;
  }

  /**
   * @method unmute() -> Un-Mute Music Player
   * @param {String|Number|undefined} Volume Volume of the Track or Music Player
   * @returns {Number|undefined} Returns Volume Value if operation went green or else , returns undefined if error occurs
   */

  unmute(Volume) {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (!this.playing) return void this.JerichoPlayer.emit('error', 'Not Playing', this);
    if (!this.StreamPacket.tracks[0]) return void this.JerichoPlayer.emit('error', 'Empty Queue', this);
    if (Volume && Number.isNaN(Volume)) {
      return void this.JerichoPlayer.emit(
        'error',
        'Invalid Volume',
        this,
        Volume,
      );
    }
    this.volume = Volume ? Number(Volume) : 95;
    return this.volume;
  }

  /**
   * @method clear() -> Clear Tracks from Queue and Stream Packet
   * @param {Number|String} TracksAmount Tracks Size in Queue
   * @returns {Boolean|undefined} true if operation emits green signal or undefined for errors
   */

  clear(TracksAmount = this.tracks.length - 1) {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (!this.playing) return void this.JerichoPlayer.emit('error', 'Not Playing', this);
    if (!this.StreamPacket.tracks[0] || !this.StreamPacket.tracks[1]) return void this.JerichoPlayer.emit('error', 'Empty Queue', this);
    if (TracksAmount && Number.isNaN(TracksAmount)) {
      return void this.JerichoPlayer.emit(
        'error',
        'Invalid TracksAmount',
        this,
        TracksAmount,
      );
    }
    if (
      Number(TracksAmount) < 1
      && Number(TracksAmount) >= this.tracks.length
    ) {
      return void this.JerichoPlayer.emit(
        'error',
        'Invalid Index',
        this,
        Number(TracksAmount),
      );
    }
    this.#__CleaningTrackMess(1, Number(TracksAmount));
    return true;
  }

  /**
   * @method back -> Playing Previous Songs from non-destroyed Queue
   * @param {String|Number} TracksBackwardIndex TrackIndex in PreviousTracks Stack to Play now or else recent ended song will be played
   * @param {User|GuildMember} User User Data if new User is using Back Command
   * @param {DefaultQueueCreateOptions<Object>} PlayOptions Stream Play Options , Same as Queue Create Options to add more into extraction and other properties
   * @param {Boolean|undefined} forceback if User wants to forceibly play previous Tracks without any delay or wait
   * @returns {Promise<Boolean|undefined>|undefined} true if operation emits green signal or undefined for errors
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
      },
    },
    forceback = true,
  ) {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (!this.previousTrack) {
      return void this.JerichoPlayer.emit(
        'error',
        'Empty Previous Tracks',
        this,
      );
    }
    if (TracksBackwardIndex && Number.isNaN(TracksBackwardIndex)) {
      return void this.JerichoPlayer.emit(
        'error',
        'Invalid Track Index',
        this,
        TracksBackwardIndex,
      );
    }
    if (
      Number(TracksBackwardIndex) < 0
      && Number(TracksBackwardIndex) > this.StreamPacket.previousTracks.length
    ) {
      return void this.JerichoPlayer.emit(
        'error',
        'Previous Track Limit Exceeding',
        this,
        Number(TracksBackwardIndex),
      );
    }
    PlayOptions = ClassUtils.stablizingoptions(PlayOptions, this.QueueOptions);
    return await this.StreamPacket.back(
      TracksBackwardIndex,
      User,
      PlayOptions,
      forceback,
    );
  }

  /**
   * @method createProgressBar() -> Create progress bar for Queue ,Tracks , PreviousTracks and current track(Track)
   * @param {String|undefined} Work  Queue ,Tracks , PreviousTracks and current track(Track) as its Value
   * @param {String|Number|undefined} DefaultType Default Type Value to create Progress bar Cache Types
   * @param {DefaultProgressBar<object>} Bar Progress bar Credentials or else ByDefault it will Create one
   * @returns {String|undefined} Progress Bar or else undefined if any error occurs
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
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (!this.StreamPacket) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (DefaultType && Number.isNaN(DefaultType)) {
      return void this.JerichoPlayer.emit(
        'error',
        'Invalid Default Type',
        this,
        DefaultType,
      );
    }
    switch (Work.toLowerCase().trim()) {
      case 'track':
        if (!this.StreamPacket.tracks[0]) return void this.JerichoPlayer.emit('error', 'Nothing Playing', this);
        return this.#__StructureProgressBar(
          Bar,
          Number(this.currentTimestamp.track_ms),
          Number(this.currentTimestamp.totaltrack_ms),
          DefaultType,
        );
      case 'queue':
        if (!this.StreamPacket.tracks[0]) return void this.JerichoPlayer.emit('error', 'Empty Queue', this);
        return this.#__StructureProgressBar(
          Bar,
          Number(this.currentTimestamp.queue_ms),
          Number(this.currentTimestamp.totalqueue_ms),
          DefaultType,
        );
      case 'tracks':
        if (!this.StreamPacket.tracks[0]) return void this.JerichoPlayer.emit('error', 'Empty Queue', this);
        return this.#__StructureProgressBar(
          Bar,
          Number(this.currentTimestamp.track_ms),
          Number(this.currentTimestamp.queue_ms),
          DefaultType,
        );
      case 'previousTracks':
        if (!this.previousTrack) {
          return void this.JerichoPlayer.emit(
            'error',
            'Empty Previous Tracks',
            this,
          );
        }
        return this.#__StructureProgressBar(
          Bar,
          Number(this.currentTimestamp.previoustracks_ms),
          Number(this.currentTimestamp.totalqueue_ms),
          DefaultType,
        );
      default:
        if (!this.StreamPacket.tracks[0]) return void this.JerichoPlayer.emit('error', 'Nothing Playing', this);
        return this.#__StructureProgressBar(
          Bar,
          Number(this.currentTimestamp.track_ms),
          Number(this.currentTimestamp.totaltrack_ms),
          DefaultType,
        );
    }
  }

  /**
   * @method loop() -> Loop Single Track or Queue
   * @param {DefaultModesType{}|undefined} Choice Mode Choice , like "track" | "queue" | "off"
   * @returns {Boolean|undefined} returns true for green signal operation and undefined for errors
   */

  loop(Choice = DefaultModesType.Track) {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (!this.StreamPacket) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    return this.StreamPacket.setMode(DefaultModesName.Loop, Choice);
  }

  /**
   * @method repeat() -> Repeat Track or Queue with "n" Times given by User
   * @param {DefaultModesType{}|String|undefined} Choice Mode Choice , like "track" | "queue" | "off"
   * @param {String|undefined} Times Number of Repeat Track or Queue with "n" Times given by User
   * @returns {Boolean|undefined} returns true for green signal operation and undefined for errors
   */

  repeat(Choice = DefaultModesType.Track, Times = 1) {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (!this.StreamPacket) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    return this.StreamPacket.setMode(
      DefaultModesName.Repeat,
      Choice,
      Number(Times) < 1 ? 1 : Number(Times),
    );
  }

  /**
   * @method autoplay() -> Autplay Songs with the help of last Played Track or Query given
   * @param {DefaultModesType{}|String|undefined} ChoiceORQuery Mode Choice , like "off" | OR else give Query or Url for autoplay songs with respect to specified query
   * @returns {Boolean|undefined} returns true for green signal operation and undefined for errors
   */

  autoplay(ChoiceORQuery = undefined) {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (!this.StreamPacket) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    return this.StreamPacket.setMode(DefaultModesName.Autoplay, ChoiceORQuery);
  }

  /**
   * @method search() -> Searching for Tracks of Query
   * @param {String} Query Query as URLs or Youtube Searches
   * @param {GuildMember|User} User user Value for Track.requestedBy Object
   * @param {DefaultQueueCreateOptions<Object>|undefined} SearchOptions Stream Options for Query Processing | Same as Queue Creation and Play Method
   * @returns {Promise<DefaultTrack[]|undefined>|undefined} Returns Tracks if operation emits green signal or undefined for errors
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
      },
    },
  ) {
    SearchOptions = ClassUtils.stablizingoptions(
      SearchOptions,
      this.QueueOptions,
    );
    SearchOptions = { ...SearchOptions, NoStreamif: true };
    const Chunks = await TrackGenerator.fetch(
      Query,
      User,
      SearchOptions,
      this.extractor,
      0,
    );
    if (Chunks.error) {
      return void this.JerichoPlayer.emit('error', Chunks.error, this);
    }
    return { playlist: Chunks.playlist, tracks: Chunks.tracks };
  }

  /**
   * Volume of the Music Player Currently OR to set new Volume for Music Player
   */

  get volume() {
    if (this.destroyed) return void null;
    return (this.StreamPacket.volume ?? 0.095) * 1000;
  }

  set volume(Volume = 0) {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (
      !(typeof Volume === 'number' || typeof Volume === 'string')
      && (Number(Volume) > 200 || Number(Volume) < 0)
    ) {
      return void this.JerichoPlayer.emit(
        'error',
        'Invalid Volume',
        this,
        Volume,
      );
    }
    this.StreamPacket.volume = Number(Volume) / 1000;
    if (this.tracks && this.tracks[0] && this.StreamPacket.AudioResource) this.StreamPacket.AudioResource.volume.setVolume(this.StreamPacket.volume);
    return this.StreamPacket.volume;
  }

  /**
   * pause Status of the Queue
   * @return {Boolean} MusicPlayer's Paused's Status as Boolean
   */
  get paused() {
    if (
      !(
        this.MusicPlayer
        && this.MusicPlayer.state
        && this.MusicPlayer.state.status
      )
    ) return false;
    return (
      this.MusicPlayer.state.status === AudioPlayerStatus.Paused
      || this.MusicPlayer.state.status === AudioPlayerStatus.AutoPaused
    );
  }

  /**
   * Playing/Activity Status of the Queue
   * @return {Boolean} MusicPlayer's Playing/Activity's Status as Boolean
   */

  get playing() {
    if (
      !(
        this.MusicPlayer
        && this.MusicPlayer.state
        && this.MusicPlayer.state.status
      )
    ) return false;
    return this.MusicPlayer.state.status !== AudioPlayerStatus.Idle;
  }

  /**
   * Returns Current Track Cached in Stream Packet or Queue.tracks
   * @returns {DefaultTrack|undefined} Track
   */
  get current() {
    if (!this.playing || this.destroyed) return undefined;
    return this.StreamPacket.searches[0];
  }

  /**
   * CurrentTimeStamp -> TimeStamp of tracks , queue and e.t.c in milliseconds and human readable format
   * @returns {String|Number|undefined} Time in milliseconds and Human Readable format
   */

  get currentTimestamp() {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (!this.StreamPacket.tracks[0]) return void this.JerichoPlayer.emit('error', 'Empty Queue', this);

    const TimeStamp = {
      track_ms: `${
        this.paused
          ? this.StreamPacket.TrackTimeStamp.Paused
            - this.StreamPacket.TrackTimeStamp.Starting
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
          : 0)
        + (this.StreamPacket.tracks && this.StreamPacket.tracks[0]
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
            ? this.StreamPacket.TrackTimeStamp.Paused
              - this.StreamPacket.TrackTimeStamp.Starting
            : new Date().getTime() - this.StreamPacket.TrackTimeStamp.Starting
          : 0)
        + (this.StreamPacket.tracks && this.StreamPacket.tracks[1]
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
          : 0)
        - (this.paused
          ? this.StreamPacket.TrackTimeStamp.Paused
            - this.StreamPacket.TrackTimeStamp.Starting
          : new Date().getTime() - this.StreamPacket.TrackTimeStamp.Starting)
      }`,
    };
    return {
      ...TimeStamp,
      human_track: ClassUtils.HumanTimeConversion(TimeStamp.track_ms),
      human_totaltrack: ClassUtils.HumanTimeConversion(TimeStamp.totaltrack_ms),
      human_previoustracks: ClassUtils.HumanTimeConversion(
        TimeStamp.previoustracks_ms,
      ),
      human_totalqueue: ClassUtils.HumanTimeConversion(TimeStamp.totalqueue_ms),
      human_saved_queue: ClassUtils.HumanTimeConversion(
        TimeStamp.saved_queue_ms,
      ),
      human_queue: ClassUtils.HumanTimeConversion(TimeStamp.queue_ms),
      human_remainqueue: ClassUtils.HumanTimeConversion(
        TimeStamp.remainqueue_ms,
      ),
    };
  }

  /**
   * Previous Track Data | Same as Queue.current , But Data of previous track
   * @returns {DefaultTrack|undefined} Track if present or undefined
   */

  get previousTrack() {
    if (this.destroyed) return void null;
    if (this.StreamPacket.previousTracks.length < 1) return void null;
    return this.StreamPacket.previousTracks[
      this.StreamPacket.previousTracks.length - 1
    ];
  }

  /**
   * Player Mode of Music Player like 'Loop','Repeat','AutoPlay'
   * @returns {DefaultPlayerMode|undefined} Returns Loop Mode in String
   */

  get playerMode() {
    if (this.destroyed) return void null;
    if (this.StreamPacket.previousTracks.length < 1) return void null;
    if (!this.StreamPacket.MusicPlayerMode) return void null;
    if (this.StreamPacket.MusicPlayerMode.Loop) {
      return {
        mode: DefaultModesName.Loop,
        value: this.StreamPacket.MusicPlayerMode.Loop,
      };
    }
    if (this.StreamPacket.MusicPlayerMode.Repeat) {
      return {
        mode: DefaultModesName.Repeat,
        value: this.StreamPacket.MusicPlayerMode.Repeat[0],
        times: this.StreamPacket.MusicPlayerMode.Repeat[1],
      };
    }
    if (this.StreamPacket.MusicPlayerMode.Autoplay) {
      return {
        mode: DefaultModesName.Autoplay,
        value: this.StreamPacket.MusicPlayerMode.Autoplay,
      };
    }
    return void null;
  }

  /**
   * Audio Resource or Management of Tracks in Queue
   * @private #__ResourcePlay() -> Resource Plays
   * @returns {undefined} Returns undefined , it just completes a one-go process
   */

  async #__ResourcePlay() {
    if (this.destroyed) return void null;
    if (
      this.StreamPacket
      && !(
        this.StreamPacket
        && this.StreamPacket.tracks
        && this.StreamPacket.tracks[0]
      )
      && !(await this.StreamPacket.__handleMusicPlayerModes(this))
    ) {
      this.StreamPacket.TimedoutId = this.#__QueueAudioPlayerStatusManager();
      return void this.JerichoPlayer.emit('queueEnd', this);
    }
    this.StreamPacket.TimedoutId = this.StreamPacket.TimedoutId
      ? clearTimeout(Number(this.StreamPacket.TimedoutId))
      : undefined;
    try {
      const AudioResource = this.StreamPacket.StreamAudioResourceExtractor(
        this.StreamPacket.tracks[0],
      );
      this.JerichoPlayer.emit('trackStart', this, this.tracks[0]);
      this.MusicPlayer.play(AudioResource);
      if (
        !this.StreamPacket.subscription
        && this.StreamPacket.VoiceConnection
      ) {
        this.StreamPacket.subscription = this.StreamPacket.VoiceConnection.subscribe(this.MusicPlayer)
          ?? undefined;
      }
      return void (await entersState(
        this.MusicPlayer,
        AudioPlayerStatus.Playing,
        5e3,
      ));
    } catch (error) {
      this.JerichoPlayer.emit(
        'connectionError',
        this,
        this.StreamPacket.VoiceConnection,
        this.guildId,
      );
      if (this.tracks[1]) return void this.MusicPlayer.stop();
      return void this.destroy();
    }
  }

  /**
   * @private #__CleaningTrackMess -> Cleaning Tracks from mentioned Starting Index and Delete Tracks Number
   * @param {Number|undefined} StartingTrackIndex Starting Track Index Number
   * @param {Number|undefined} DeleteTracksCount Delete Tracks Count Number
   * @returns {undefined} undefined as it's a One-Go Process
   */

  #__CleaningTrackMess(StartingTrackIndex = 0, DeleteTracksCount) {
    DeleteTracksCount
      ? this.StreamPacket.tracks.splice(
        StartingTrackIndex ?? 0,
        DeleteTracksCount,
      )
      : this.StreamPacket.tracks.shift();
    DeleteTracksCount
      ? this.StreamPacket.searches.splice(
        StartingTrackIndex ?? 0,
        DeleteTracksCount,
      )
      : this.StreamPacket.searches.shift();

    return void null;
  }

  /**
   * @private #__QueueAudioPlayerStatusManager -> Audio Player Manager as a part of End Event Handling
   * @returns {undefined} undefined as it's a One-Go Process
   */

  #__QueueAudioPlayerStatusManager() {
    if (this.destroyed) return void null;
    if (this.QueueOptions.LeaveOnEnd && !this.tracks[0]) {
      this.StreamPacket.TimedoutId
        ? clearTimeout(Number(this.StreamPacket.TimedoutId))
        : undefined;
      return (
        this.destroy(this.QueueOptions.LeaveOnEndTimedout ?? 0) ?? undefined
      );
    }
    return void null;
  }

  /**
   * @private #__StructureProgressBar() -> Progress bar Workload for Queue.createProgressBar() method
   * @param {Object} Credentials Credentials as Progress Bar work Data
   * @param {Number} FirstValue Starting Index of Requested Array
   * @param {Number} TotalValue End Index of Requested Array OR Total Counts
   * @param {String|Number|undefined} DefaultType Default Framework Slot Number to use
   * @returns {String|undefined} Progress Bar GUI in the form of string or errors on undefined
   */

  #__StructureProgressBar(Credentials, FirstValue, TotalValue, DefaultType) {
    if (DefaultType || DefaultType === 0) {
      switch (`${DefaultType}`) {
        case '1':
          Credentials.CompleteIcon = Credentials.CompleteIcon ?? '●';
          Credentials.TargetIcon = Credentials.TargetIcon ?? '●';
          Credentials.RemainingIcon = Credentials.RemainingIcon ?? '○';
          Credentials.StartingIcon = Credentials.StartingIcon
            ?? `${ClassUtils.HumanTimeConversion(undefined, {
              Time: FirstValue,
              ignore: ['milliseconds'],
            })} |  `;
          Credentials.EndIcon = Credentials.EndIcon
            ?? `  | ${ClassUtils.HumanTimeConversion(undefined, {
              Time: TotalValue,
              ignore: ['milliseconds'],
            })}`;
          break;
        case '2':
          Credentials.CompleteIcon = Credentials.CompleteIcon ?? '○';
          Credentials.TargetIcon = Credentials.TargetIcon ?? '●';
          Credentials.RemainingIcon = Credentials.RemainingIcon ?? '○';
          Credentials.StartingIcon = Credentials.StartingIcon
            ?? `${ClassUtils.HumanTimeConversion(undefined, {
              Time: FirstValue,
              ignore: ['milliseconds'],
            })} |  `;
          Credentials.EndIcon = Credentials.EndIcon
            ?? `  | ${ClassUtils.HumanTimeConversion(undefined, {
              Time: TotalValue,
              ignore: ['milliseconds'],
            })}`;
          break;
        case '3':
          Credentials.CompleteIcon = Credentials.CompleteIcon ?? '○';
          Credentials.TargetIcon = Credentials.TargetIcon ?? '◉';
          Credentials.RemainingIcon = Credentials.RemainingIcon ?? '○';
          Credentials.StartingIcon = Credentials.StartingIcon
            ?? `${ClassUtils.HumanTimeConversion(undefined, {
              Time: FirstValue,
              ignore: ['milliseconds'],
            })} |  `;
          Credentials.EndIcon = Credentials.EndIcon
            ?? `  | ${ClassUtils.HumanTimeConversion(undefined, {
              Time: TotalValue,
              ignore: ['milliseconds'],
            })}`;
          break;
        case '4':
          Credentials.CompleteIcon = Credentials.CompleteIcon ?? '■';
          Credentials.TargetIcon = Credentials.TargetIcon ?? '■';
          Credentials.RemainingIcon = Credentials.RemainingIcon ?? '□';
          Credentials.StartingIcon = Credentials.StartingIcon
            ?? `${ClassUtils.HumanTimeConversion(undefined, {
              Time: FirstValue,
              ignore: ['milliseconds'],
            })} |  `;
          Credentials.EndIcon = Credentials.EndIcon
            ?? `  | ${ClassUtils.HumanTimeConversion(undefined, {
              Time: TotalValue,
              ignore: ['milliseconds'],
            })}`;
          break;
        case '5':
          Credentials.CompleteIcon = Credentials.CompleteIcon ?? '◉';
          Credentials.TargetIcon = Credentials.TargetIcon ?? '◉';
          Credentials.RemainingIcon = Credentials.RemainingIcon ?? '○';
          Credentials.StartingIcon = Credentials.StartingIcon
            ?? `${ClassUtils.HumanTimeConversion(undefined, {
              Time: FirstValue,
              ignore: ['milliseconds'],
            })} |  `;
          Credentials.EndIcon = Credentials.EndIcon
            ?? `  | ${ClassUtils.HumanTimeConversion(undefined, {
              Time: TotalValue,
              ignore: ['milliseconds'],
            })}`;
          break;
        default:
          Credentials.CompleteIcon = Credentials.CompleteIcon ?? '▬';
          Credentials.TargetIcon = Credentials.TargetIcon ?? '🔘';
          Credentials.RemainingIcon = Credentials.RemainingIcon ?? '▬';
          Credentials.StartingIcon = Credentials.StartingIcon
            ?? `${ClassUtils.HumanTimeConversion(undefined, {
              Time: FirstValue,
              ignore: ['milliseconds'],
            })} |  `;
          Credentials.EndIcon = Credentials.EndIcon
            ?? `  | ${ClassUtils.HumanTimeConversion(undefined, {
              Time: TotalValue,
              ignore: ['milliseconds'],
            })}`;
          break;
      }
    }
    const Size = Math.floor(
      (
        parseFloat(parseInt(FirstValue * 100) / parseInt(TotalValue)) / 10
      ).toFixed(1),
    ) + 1;
    const ProgressBar = [];
    const TargetHit = undefined;
    for (let count = 0.7; count <= 10.5; count += 0.7) {
      if (count === 0.7) {
        ProgressBar.push(
          Credentials.StartingIcon
            ?? `${ClassUtils.HumanTimeConversion(undefined, {
              Time: FirstValue,
              ignore: ['milliseconds'],
            })} |  `,
        );
      }
      if (count <= Size && count >= Size - 0.7 && TargetHit) ProgressBar.push(Credentials.TargetIcon);
      else if (count < Size) ProgressBar.push(Credentials.CompleteIcon);
      else ProgressBar.push(Credentials.RemainingIcon);
    }
    if (Size >= 11) ProgressBar.push(Credentials.TargetIcon);
    ProgressBar.push(
      Credentials.EndIcon
        ?? `  | ${ClassUtils.HumanTimeConversion(undefined, {
          Time: TotalValue,
          ignore: ['milliseconds'],
        })}`,
    );
    return ProgressBar.join('').trim();
  }
}

module.exports = Queue;
