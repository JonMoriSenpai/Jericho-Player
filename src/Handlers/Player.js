const EventEmitter = require('events')
const { FFmpeg } = require('prism-media')
const {
  Intents,
  Client,
  Message,
  Interaction,
  VoiceChannel,
  StageChannel,
  User,
} = require('discord.js')
const { getVoiceConnection, VoiceConnection } = require('@discordjs/voice')
const Queue = require('./Queue.js')
const ClassUtils = require('../Utilities/ClassUtils')
const TrackGenerator = require('../Structures/Tracks')
const { join, disconnect } = require('../Utilities/VoiceUtils')
const {
  DefaultJerichoPlayerOptions,
  DefaultQueueCreateOptions,
  DefaultSearchResults,
} = require('../types/interfaces')

/**
 * Jericho Player's Player Class
 * @extends {EventEmitter}
 */

class Player extends EventEmitter {
  /**
   * QueueCaches -> Caches of Queues for per "instanceof Player"
   * @type {Object}
   * @readonly
   * @private
   */
  static #QueueCaches = {}

  /**
   * Jericho Player Constructor
   * @param {Client} Client  Instanceof Discord.js Client
   * @param {DefaultJerichoPlayerOptions} JerichoPlayerOptions [options={}] Player Options for Stream Extraction and Voice Connection Moderation
   */

  constructor(
    Client,
    JerichoPlayerOptions = {
      extractor: 'play-dl',
      ExtractorStreamOptions: {
        Limit: 1,
        Quality: 'high',
        Cookies: undefined,
        ByPassYoutubeDLRatelimit: true,
        YoutubeDLCookiesFilePath: undefined,
        Proxy: undefined,
        UserAgents: undefined,
      },
      IgnoreError: true,
      LeaveOnEmpty: true,
      LeaveOnEnd: true,
      LeaveOnBotOnly: true,
      LeaveOnEmptyTimedout: 0,
      LeaveOnEndTimedout: 0,
      LeaveOnBotOnlyTimedout: 0,
      NoMemoryLeakMode: false,
    },
  ) {
    super()

    this.#__buildsandDepschecks(Client)

    /**
     * Client Discord Client Instance
     * @type {Client}
     * @readonly
     */
    this.Client = Client

    /**
     * Jericho Player Default Options Saved for Class Utils Comparing and Fixing
     * @type {DefaultJerichoPlayerOptions}
     * @readonly
     */

    this.JerichoPlayerOptions = ClassUtils.stablizingoptions(
      JerichoPlayerOptions,
      DefaultJerichoPlayerOptions,
    )

    /**
     * - Voice Events will be Moderated from here Except "LeaveonEnd" Object Value it's Timedout Value
     * - Node js Timeout Id's as Number will be Cached for Clear Timeout here and in "Queue.#__QueueAudioPlayerStatusManager()"
     */

    this.Client.on('voiceStateUpdate', async (OldVoiceState, NewVoiceState) => {
      /**
       * - Player gets stop managing requests from invalid guild or channel to ignroe crashes
       */
      if (
        !NewVoiceState.guild ||
        !OldVoiceState.guild ||
        !(OldVoiceState.channel || NewVoiceState.channel)
      )
        return undefined

      /*
       * - QueueInstance Fetched from Private Raw Cache Fetching Method "Player.#QueueCacheFetch(guildId)"
       * - QueueIntance => will be used to filter Voice Events Related to our Queue or else return undefined for handling
       */

      const QueueInstance = Player.#QueueCacheFetch(
        (NewVoiceState && NewVoiceState.guild && NewVoiceState.guild.id
          ? NewVoiceState.guild.id
          : undefined) ??
          (OldVoiceState && OldVoiceState.guild && OldVoiceState.guild.id
            ? OldVoiceState.guild.id
            : undefined),
      )

      const clientchecks = (member) => member.id === this.Client.user.id

      // - QueueInstance checking if its related to Queue Voice Connection Events

      if (!NewVoiceState.channel && OldVoiceState.id === this.Client.user.id) {
        /**
         * - event "channelEmpty" and "botDisconnect" will trigger on bot leaving the VC | Timeout will be Handlerd in - "Queue.#__ResourcePlay()"
         * - events are in order to provide quick response with a minimal checks
         */

        if (
          QueueInstance &&
          OldVoiceState.channel &&
          OldVoiceState.channel.members &&
          ((OldVoiceState.channel.members.size === 1 &&
            OldVoiceState.channel.members.some(clientchecks)) ||
            OldVoiceState.channel.members.size === 0)
        ) {
          this.emit('channelEmpty', QueueInstance, OldVoiceState.channel)
        }
        if (QueueInstance && !QueueInstance.destroyed) {
          this.emit(
            'botDisconnect',
            QueueInstance,
            OldVoiceState.channel ?? undefined,
          )
        }
        return QueueInstance
          ? this.DeleteQueue(OldVoiceState.guild.id)
          : undefined
      }
      if (
        !QueueInstance ||
        (QueueInstance && QueueInstance.destroyed) ||
        (QueueInstance && !QueueInstance.playing) ||
        (NewVoiceState.channel &&
          OldVoiceState.channel &&
          OldVoiceState.channel.id === NewVoiceState.channel.id)
      ) {
        return undefined
      }
      if (
        OldVoiceState.channel &&
        NewVoiceState.channel &&
        OldVoiceState.channel.id !== NewVoiceState.channel.id &&
        NewVoiceState.id === this.Client.user.id
      ) {
        /**
         * - getVoiceConnection(guildId) && QueueInstance.StreamPacket.VoiceChannel changed based on Client has been Moved to Different Channel
         * - Queue Voice Connection and Channel will be Changed with Resource Subscription will be Changed from the function "this.#__handleVoiceConnectionInterchange()"
         * - QueueInstance with new Refrence Value will be Cached to Player's Queue Caches
         */

        await this.#__handleVoiceConnectionInterchange(
          Player.#QueueCaches[NewVoiceState.guild.id],
          NewVoiceState.channel,
        )

        /**
         * - QueueInstance will check for "LeaveOnEmpty" && "LeaveOnBotOnly" state to filter the @discordjs/voice's Player's playing status for the Queue
         * - Function will return undefined and can take time depends on setTimeout value of if 0 or undefined
         */

        return this.#__playerVoiceConnectionMainHandler(
          Player.#QueueCaches[NewVoiceState.guild.id],
          NewVoiceState.channel,
        )
      }
      if (
        (!NewVoiceState.channel && OldVoiceState.id !== this.Client.user.id) ||
        (NewVoiceState.channel &&
          QueueInstance.StreamPacket &&
          QueueInstance.StreamPacket.VoiceChannel &&
          QueueInstance.StreamPacket.VoiceChannel.id ===
            NewVoiceState.channel.id &&
          NewVoiceState.id !== this.Client.user.id)
      ) {
        /**
         * - QueueInstance will check for "LeaveOnEmpty" && "LeaveOnBotOnly" state to filter the @discordjs/voice's Player's playing status for the Queue
         * - Function will return undefined and can take time depends on setTimeout value of if 0 or undefined
         * - On leave of Users from Voice Channel Player will check stricitly
         */

        return this.#__playerVoiceConnectionMainHandler(
          Player.#QueueCaches[OldVoiceState.guild.id],
          NewVoiceState.channel ?? OldVoiceState.channel,
        )
      }
      return undefined
    })

    /**
     * - Destroy Queue for Deleted Guild to avoid memory leaks and Free Memory for Unused Queue Caches
     */

    this.Client.on('guildDelete', (guild) => {
      if (!this.GetQueue(guild.id)) return undefined
      return void this.DeleteQueue(guild.id)
    })
  }

  /**
   * CreateQueue => Create Queue Instance for Player and per Guild
   * @param {String } GuildId Guild Id Only for getting info about guild and guildId
   * @param {DefaultQueueCreateOptions|void} QueueCreateOptions => Queue Create Options for Queue Instance ( for making ByDefault Values for Queue.<methods> )
   * @returns {Queue} Queue Instance => ( for Queue.<methods> like Queue.play() )
   */

  CreateQueue(
    GuildId,
    QueueCreateOptions = {
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
  ) {
    // Guild Id resolves if possible
    GuildId = ClassUtils.ResolverLTE(GuildId, 'guildid')

    // this.#__buildsandDepschecks() -> Checks for Invalid Client , Missing Dependencies with Missing Discord Client Voice Intents

    this.#__buildsandDepschecks(this.Client)
    if (!(GuildId && typeof GuildId === 'string')) {
      // Throw Error in Player Events as "error" event for Invalid Guild's Id

      return void this.emit('error', 'Invalid Guild Id', this, GuildId)
    }

    // Picking up valid and user defined options if any and comparing them with Player Default Options

    QueueCreateOptions = ClassUtils.stablizingoptions(QueueCreateOptions, {
      ...this.JerichoPlayerOptions,
      metadata: null,
    })

    // To Avoid excess use of memory and Space in Large bots , We will always Cache Queue and Create one if is Deleted by DeleteQueue() method
    const QueueInstance =
      Player.#QueueCacheFetch(GuildId, QueueCreateOptions) ??
      new Queue(this.Client, GuildId, QueueCreateOptions, this)
    return Player.#QueueCacheAdd(QueueInstance)
  }

  /**
   * DeleteQueue -> Delete's Cached Queue (forced way to erase Queue's Existence)
   * @param {String|Number} guildId Guild["id"] OR guild.id is required to fetch queue from the Cache
   * @returns {void} Returns "undefined"
   */

  DeleteQueue(guildId) {
    // Guild Id resolves if possible
    guildId = ClassUtils.ResolverLTE(guildId, 'guildid')

    if (
      guildId &&
      guildId.id &&
      (typeof guildId.id === 'string' || typeof guildId.id === 'number')
    ) {
      guildId = guildId.id
    } else if (
      !(guildId && (typeof guildId === 'string' || typeof guildId === 'number'))
    ) {
      return void this.emit('error', 'Invalid Guild Id', this, guildId)
    }
    // Checks for Queue in Cache doesn't matter if its Connection was destroyed | Cache only fetch its Existence to avoid excess CPU load
    if (Player.#QueueCacheFetch(guildId)) {
      return void Player.#QueueCacheRemove(guildId)
    }
    return void this.emit(
      'error',
      'Destroyed Queue',
      this,
      undefined,
      'Player Section #1',
    )
  }

  /**
   * GetQueue -> Fetch Queue (Instance) from Cache or else returns undefined
   * @param {String|Number} guildId Guild["id"] OR guild.id is required to fetch queue from the Cache
   * @returns {Queue|void} Returns Queue Instance or else "undefined"
   */
  GetQueue(guildId) {
    // Guild Id resolves if possible
    guildId = ClassUtils.ResolverLTE(guildId, 'guildid')
    if (
      guildId &&
      guildId.id &&
      (typeof guildId.id === 'string' || typeof guildId.id === 'number')
    ) {
      guildId = guildId.id
    }
    if (
      !(guildId && (typeof guildId === 'string' || typeof guildId === 'number'))
    ) {
      return void this.emit('error', 'Invalid Guild Id', this, guildId)
    }
    return Player.#QueueCacheFetch(guildId)
  }

  /**
   * search -> Search keywords or Title/Urls for List Related Videos
   * @param {String} Query Song Name or Song URL for search
   * @param {User|void} User Discord User Data for Request By or else undefined is accepted
   * @param {DefaultJerichoPlayerOptions|void} SearchOptions Search Options for Limitations and Restrictions
   * @returns {Promise<DefaultSearchResults | void>} Returns Track Data Extracted from Various Extractors
   */

  async search(
    Query,
    User,
    SearchOptions = {
      IgnoreError: true,
      extractor: undefined,
      metadata: null,
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
    SearchOptions = ClassUtils.stablizingoptions(
      SearchOptions,
      DefaultJerichoPlayerOptions,
    )
    SearchOptions = { ...SearchOptions, NoStreamif: true }
    const Chunks = await TrackGenerator.fetch(
      Query,
      User,
      SearchOptions,
      SearchOptions.extractor ?? 'play-dl',
      0,
    )
    if (Chunks.error) {
      return void this.emit('error', Chunks.error, this)
    }
    return { playlist: Chunks.playlist, tracks: Chunks.tracks }
  }

  /**
   * @type {Object | void}
   * @readonly
   * Jericho-Player Multiple Queue's Connections Data like Voice Connections and Playing Status and paused Status
   */

  get connections() {
    const objectEntries = Player.#QueueCaches
      ? Object.entries(Player.#QueueCaches)
      : []
    const cachedConnections = []
    const cachedplaying = []
    const cachedpaused = []
    for (let count = 0, len = objectEntries?.length; count < len; ++count) {
      if (objectEntries[count][1]?.playing)
        cachedplaying.push(objectEntries[count][1])
      if (objectEntries[count][1]?.paused)
        cachedpaused.push(objectEntries[count][1])
      cachedConnections.push(objectEntries[count][1]?.voiceConnection)
    }
    return {
      voiceConnection: cachedConnections ?? [],
      playing: cachedplaying ?? [],
      paused: cachedpaused ?? [],
    }
  }

  /**
   * @type {string}
   * @readonly
   * Jericho-Player Type Player | value -> "queue"
   */

  get type() {
    return 'player'
  }

  /**
   * @private Player Class Defined Method
   * #QueueCacheAdd -> Private Method for Player's Workload to Add Queue Cache Easily without using any Player's Instance
   * @param {Queue} QueueInstance Queue Instance made from "Queue" class to work around with many <Queue>.methods() for a guild
   * @returns {Queue} QueueInstance , To reperesnt the Work Complete Signal
   */

  static #QueueCacheAdd(QueueInstance) {
    Player.#QueueCaches[`${QueueInstance.guildId}`] = QueueInstance
    return QueueInstance
  }

  /**
   * @private Player Class Defined Method
   * #QueueCacheFetch -> Private Method for Player's Workload to Fetch Queue Cache Easily without using any Player's Instance
   * @param {String|Number} guildId Guild["id"] OR guild.id is required to fetch queue from the Cache
   * @param {DefaultQueueCreateOptions} QueueCreateOptions QueueCreateOptions for if Queue "connection" is destroyed , then it requires Options to remake whole infrastructure
   * @returns {Queue|void} QueueInstance , To reperesnt the Work Complete Signal
   */

  static #QueueCacheFetch(guildId, QueueCreateOptions = null) {
    // Guild Id resolves if possible
    guildId = ClassUtils.ResolverLTE(guildId, 'guildid')
    if (!guildId) return undefined
    const QueueInstance = Player.#QueueCaches[`${guildId}`]
    if (QueueCreateOptions && QueueInstance) {
      QueueInstance.QueueOptions = ClassUtils.stablizingoptions(
        QueueCreateOptions,
        QueueInstance.QueueOptions,
      )

      Player.#QueueCaches[`${guildId}`] = QueueInstance
    }
    return Player.#QueueCaches[`${guildId}`]
  }

  /**
   * Player Class Defined Method
   * #QueueCacheRemove -> Private Method for Player's Workload to Remove Queue Cache Easily without using any Player's Instance
   * @param {String|Number} guildId Guild["id"] OR guild.id is required to fetch queue from the Cache
   * @returns {void} undefined , To reperesnt the Work Complete Signal as Queue will be destroyed so , we can't return Queue
   * @private
   */

  static #QueueCacheRemove(guildId) {
    // Guild Id resolves if possible
    guildId = ClassUtils.ResolverLTE(guildId, 'guildid')
    if (!guildId) return false
    if (!this.#QueueCacheFetch(guildId)) return false
    let QueueInstance = Player.#QueueCaches[`${guildId}`]
    if (QueueInstance?.playing && !QueueInstance?.destroyed) {
      QueueInstance?.stop()
    }
    if (QueueInstance?.playing) {
      disconnect(guildId, {
        destroy: true,
        MusicPlayer: QueueInstance?.MusicPlayer,
        Subscription: QueueInstance?.StreamPacket?.subscription,
      })
    }
    if (!QueueInstance.destroyed) QueueInstance.destroy()
    else if (
      QueueInstance.destroyed &&
      (typeof QueueInstance.destroyed === 'number' ||
        !Number.isNaN(QueueInstance.destroyed))
    )
      clearTimeout(Number(QueueInstance.destroyed))

    const Garbage = {}
    QueueInstance = Player.#QueueCaches[`${guildId}`] = undefined
    Garbage.container1 = QueueInstance
    Garbage.container2 = Player.#QueueCaches[`${guildId}`]
    delete Garbage.container1
    delete Garbage.container2
    return undefined
  }

  /**
   * Player Class Defined Method
   * #__playerVoiceConnectionMainHandler -> Private Method for Player's Voice Connection "Manager" to Filter out Connection Decisions frpm Queue | Player 's Connection Options from User
   * @param {Queue} QueueInstance Queue Instance made from "Queue" class to work around
   * @param {VoiceChannel|StageChannel} VoiceChannel Simple Discord Voice Channel | Stage Channel Value
   * @returns {void} undefined, As these Private method only meant for Voice Handling with Options
   * @private
   */
  #__playerVoiceConnectionMainHandler(QueueInstance, VoiceChannel) {
    const clientchecks = (member) => member.user.id === this.Client.user.id
    const userchecks = (member) => !member.user.bot

    if (
      QueueInstance.QueueOptions.LeaveOnEmpty &&
      ((VoiceChannel.members.size === 1 &&
        VoiceChannel.members.some(clientchecks)) ||
        VoiceChannel.members.size === 0)
    ) {
      QueueInstance.destroyed &&
      !Number.isNaN(QueueInstance.destroyed) &&
      Number(QueueInstance.destroyed) > 0
        ? clearTimeout(Number(QueueInstance.destroyed))
        : undefined
      QueueInstance.destroyed =
        QueueInstance.destroy(
          QueueInstance.QueueOptions.LeaveOnEmptyTimedout ?? 0,
        ) ?? undefined
    }
    if (
      (QueueInstance.QueueOptions.LeaveOnBotOnly &&
        !VoiceChannel.members.some(userchecks) &&
        VoiceChannel.members.some(clientchecks) &&
        VoiceChannel.members.size > 1) ||
      (!VoiceChannel.members.some(userchecks) &&
        !VoiceChannel.members.some(clientchecks) &&
        VoiceChannel.members.size <= 1)
    ) {
      QueueInstance.destroyed &&
      !Number.isNaN(QueueInstance.destroyed) &&
      Number(QueueInstance.destroyed) > 0
        ? clearTimeout(Number(QueueInstance.destroyed))
        : undefined
      QueueInstance.destroyed =
        QueueInstance.destroy(
          QueueInstance.QueueOptions.LeaveOnBotOnlyTimedout ?? 0,
        ) ?? undefined
    }
    return undefined
  }

  /**
   * Player Class Defined Method
   * #__handleVoiceConnectionInterchange -> Private Method for Player's Voice Destroy Connection
   * @param {Queue} QueueInstance Queue Instance made from "Queue" class to work around
   * @param {VoiceChannel|StageChannel} VoiceChannel Simple Discord Voice Channel | Stage Channel Value
   * @returns {Promise<void>} undefined, As these Private method only meant for Voice Handling with Options
   * @private
   */

  async #__handleVoiceConnectionInterchange(QueueInstance, VoiceChannel) {
    await join(this.Client, VoiceChannel)
    QueueInstance.StreamPacket.VoiceChannel = VoiceChannel
    if (
      QueueInstance.playing &&
      !QueueInstance.paused &&
      QueueInstance.StreamPacket.subscription
    ) {
      QueueInstance.StreamPacket.subscription.unsubscribe()
      QueueInstance.StreamPacket.subscription = getVoiceConnection(
        QueueInstance.guildId,
      ).subscribe(QueueInstance.MusicPlayer)
    }
    Player.#QueueCaches[QueueInstance.guildId] = QueueInstance
    return undefined
  }

  /**
   * Player Class Defined Method
   * #__buildsandDepschecks -> Private Method for Checks for Dependencies , Intents to avoid Internal value errors or package bugs
   * @param {Client} Client Discord Client Instance for Operating as a Bot
   * @returns {void} undefined, As these Private method only meant for Voice Handling with Options
   * @private
   */

  #__buildsandDepschecks(Client) {
    let FmpeggGarbage
    let LibopusGarbage
    const MissingDeps = [' ']
    MissingDeps.push(
      '--[ Missing Dependencies from package.json | Do - "npm i packageName" ]--',
    )
    try {
      const GarbageInfo = FFmpeg.getInfo()
      FmpeggGarbage = !!`- version: ${GarbageInfo.version}`
      LibopusGarbage = !!`- libopus: ${
        GarbageInfo.output.includes('--enable-libopus') ? 'yes' : 'no'
      }`
    } catch (err) {
      LibopusGarbage = FmpeggGarbage = undefined
    }
    !ClassUtils.ScanDeps('@discordjs/voice')
      ? MissingDeps.push(`${MissingDeps.length - 1})  "@discordjs/voice"`)
      : undefined
    !ClassUtils.ScanDeps('prism-media')
      ? MissingDeps.push(`${MissingDeps.length - 1})  "prism-media"`)
      : undefined

    !ClassUtils.ScanDeps('@discordjs/opus') &&
    !ClassUtils.ScanDeps('opusscript')
      ? MissingDeps.push(
        `${MissingDeps.length - 1})  "@discordjs/opus" OR "opusscript"`,
      )
      : undefined

    !ClassUtils.ScanDeps('tweetnacl') &&
    !(ClassUtils.ScanDeps('libsodium-wrapper') && ClassUtils.ScanDeps('sodium'))
      ? MissingDeps.push(
        `${
          MissingDeps.length - 1
        })  "tweetnacl" OR ("libsodium-wrapper" And "sodium")`,
      )
      : undefined

    !ClassUtils.ScanDeps('ffmpeg-static') && !(LibopusGarbage && FmpeggGarbage)
      ? MissingDeps.push(
        `${
          MissingDeps.length - 1
        })  "ffmpeg-static" OR "Ffmpeg from [https://www.ffmpeg.org/download.html]"`,
      )
      : undefined

    !ClassUtils.ScanDeps('playdl-music-extractor') &&
    !ClassUtils.ScanDeps('video-extractor')
      ? MissingDeps.push(
        `${
          MissingDeps.length - 1
        })  "playdl-music-extractor" OR "video-extractor"`,
      )
      : undefined
    if (MissingDeps[2]) {
      setTimeout(() => {
        this.emit(
          'error',
          [
            '-'.repeat(50),
            ...MissingDeps,
            '--[ queue value will be undefined By-default as it will trigger as ->  player.on("error",errorMessage) => {} ]--',
            '-'.repeat(50),
          ].join('\n'),
        )
      }, 2 * 1000)
    }
    if (!Client) {
      throw Error(
        'Invalid Discord Client has been Detected! | And get some Voice and Channel Intents too',
      )
    } else if (
      !new Intents(Client.options.intents).has(
        Intents.FLAGS.GUILD_VOICE_STATES,
      ) &&
      !new Intents(Client.options.intents).has(Intents.FLAGS.GUILDS)
    ) {
      throw SyntaxError(
        'Missing Intents in Discord Client\n - GUILD_VOICE_STATES || Intents.FLAGS.GUILD_VOICE_STATES\n - - GUILDS || Intents.FLAGS.GUILDS',
      )
    } else if (
      !new Intents(Client.options.intents).has(Intents.FLAGS.GUILD_VOICE_STATES)
    ) {
      throw SyntaxError(
        'Missing Intents in Discord Client\n - GUILD_VOICE_STATES || Intents.FLAGS.GUILD_VOICE_STATES',
      )
    } else if (!new Intents(Client.options.intents).has(Intents.FLAGS.GUILDS)) {
      throw SyntaxError(
        'Missing Intents in Discord Client\n - GUILDS || Intents.FLAGS.GUILDS',
      )
    } else return undefined
  }
}

module.exports = Player
