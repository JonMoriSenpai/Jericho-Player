const EventEmitter = require('events');
const { FFmpeg } = require('prism-media');
const {
  Intents,
  Client,
  Message,
  Interaction,
  GuildMember,
  VoiceChannel,
  StageChannel,
} = require('discord.js');
const Queue = require('./Queue-Handler.js');
const ClassUtils = require('../Utilities/Class-Utils');
const { join } = require('../Utilities/Voice-Utils');
var {
  DefaultJerichoPlayerOptions,
  DefaultQueueCreateOptions,
} = require('../types/interfaces');

class JerichoPlayer extends EventEmitter {
  /**
   * @private QueueCaches -> Caches of Queues for per "instanceof Player"
   * @type {Object}
   * @readonly
   */
  static #QueueCaches = {};

  /**
   * Jericho Player Constructor
   * @param {Client} Client  Instanceof Discord.js Client
   * @param {DefaultJerichoPlayerOptions}  JerichoPlayerOptions  Player Options for Stream Extraction and Voice Connection Moderation
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
      },
      IgnoreError: true,
      LeaveOnEmpty: true,
      LeaveOnEnd: true,
      LeaveOnBotOnly: true,
      LeaveOnEmptyTimedout: 0,
      LeaveOnEndTimedout: 0,
      LeaveOnBotOnlyTimedout: 0,
    },
  ) {
    super();

    this.#__buildsandDepschecks(Client);

    /**
     * Client Discord Client Instance
     * @type {Client}
     * @readonly
     */
    this.Client = Client;

    /**
     * Jericho Player Default Options Saved for Class Utils Comparing and Fixing
     * @type {DefaultJerichoPlayerOptions}
     * @readonly
     */

    this.JerichoPlayerOptions = ClassUtils.stablizingoptions(
      JerichoPlayerOptions,
      DefaultJerichoPlayerOptions,
    );

    /**
     * - Voice Events will be Moderated from here Except "LeaveonEnd" Object Value it's Timedout Value
     * - Node js Timeout Id's as Number will be Cached for Clear Timeout here and in "Queue.#__QueueAudioPlayerStatusManager()"
     */

    this.Client.on('voiceStateUpdate', async (OldVoiceState, NewVoiceState) => {
      /*
       * - QueueInstance Fetched from Private Raw Cache Fetching Method "JerichoPlayer.#QueueCacheFetch(guildId)"
       * - QueueIntance => will be used to filter Voice Events Related to our Queue or else return undefined for handling
       */

      var QueueInstance = JerichoPlayer.#QueueCacheFetch(
        (NewVoiceState ? NewVoiceState.guild.id : undefined)
          ?? (OldVoiceState ? OldVoiceState.guild.id : undefined),
      );

      var clientchecks = (member) => member.user.id === this.Client.user.id;

      // - QueueInstance checking if its related to Queue Voice Connection Events

      if (
        !QueueInstance
        || (QueueInstance && QueueInstance.destroyed)
        || (QueueInstance && !QueueInstance.playing)
        || (NewVoiceState.channel
          && OldVoiceState.channel
          && OldVoiceState.channel.id === NewVoiceState.channel.id)
        || !(
          (NewVoiceState.channel
            && QueueInstance.StreamPacket
            && QueueInstance.StreamPacket.VoiceChannel
            && QueueInstance.StreamPacket.VoiceChannel.id
              === NewVoiceState.channel.id)
          || (OldVoiceState.channel
            && QueueInstance.StreamPacket
            && QueueInstance.StreamPacket.VoiceChannel
            && QueueInstance.StreamPacket.VoiceChannel.id
              === OldVoiceState.channel.id)
        )
      ) {
        return void null;
      }
      if (
        OldVoiceState.channel
        && NewVoiceState.channel
        && OldVoiceState.channel.id !== NewVoiceState.channel.id
        && NewVoiceState.id === this.Client.user.id
      ) {
        /**
         * - QueueInstance.StreamPacket.VoiceConnection && QueueInstance.StreamPacket.VoiceChannel changed based on Client has been Moved to Different Channel
         * - Queue Voice Connection and Channel will be Changed with Resource Subscription will be Changed from the function "this.#__handleVoiceConnectionInterchange()"
         * - QueueInstance with new Refrence Value will be Cached to Player's Queue Caches
         */

        await this.#__handleVoiceConnectionInterchange(
          JerichoPlayer.#QueueCaches[NewVoiceState.guild.id],
          NewVoiceState.channel,
        );

        /**
         * - QueueInstance will check for "LeaveOnEmpty" && "LeaveOnBotOnly" state to filter the @discordjs/voice's Player's playing status for the Queue
         * - Function will return undefined and can take time depends on setTimeout value of if 0 or undefined
         */

        return this.#__playerVoiceConnectionMainHandler(
          JerichoPlayer.#QueueCaches[NewVoiceState.guild.id],
          NewVoiceState.channel,
        );
      }
      if (
        (!NewVoiceState.channel && OldVoiceState.id !== this.Client.user.id)
        || (NewVoiceState.channel
          && QueueInstance.StreamPacket
          && QueueInstance.StreamPacket.VoiceChannel
          && QueueInstance.StreamPacket.VoiceChannel.id
            === NewVoiceState.channel.id
          && NewVoiceState.id !== this.Client.user.id)
      ) {
        /**
         * - QueueInstance will check for "LeaveOnEmpty" && "LeaveOnBotOnly" state to filter the @discordjs/voice's Player's playing status for the Queue
         * - Function will return undefined and can take time depends on setTimeout value of if 0 or undefined
         * - On leave of Users from Voice Channel Player will check stricitly
         */

        return this.#__playerVoiceConnectionMainHandler(
          JerichoPlayer.#QueueCaches[OldVoiceState.guild.id],
          NewVoiceState.channel ?? OldVoiceState.channel,
        );
      }
      if (!NewVoiceState.channel && OldVoiceState.id === this.Client.user.id) {
        /**
         * - event "channelEmpty" and "botDisconnect" will trigger on bot leaving the VC | Timeout will be Handlerd in - "Queue.#__ResourcePlay()"
         * - events are in order to provide quick response with a minimal checks
         */
        if (
          OldVoiceState.channel
          && OldVoiceState.channel.members
          && ((OldVoiceState.channel.members.size === 1
            && OldVoiceState.channel.members.some(clientchecks))
            || OldVoiceState.channel.members.size === 0)
        ) {
          this.emit('channelEmpty', QueueInstance, OldVoiceState.channel);
        }
        this.emit(
          'botDisconnect',
          QueueInstance,
          OldVoiceState.channel ?? undefined,
        );
        return this.DeleteQueue(QueueInstance.guildId);
      }
      return void null;
    });
  }

  /**
   * CreateQueue => Create Queue Instance for Player and per Guild
   * @param {Message | Interaction} message Guild Message Only for getting info about guild and guildId
   * @param {DefaultQueueCreateOptions|undefined} QueueCreateOptions => Queue Create Options for Queue Instance ( for making ByDefault Values for Queue.<methods> )
   * @returns {Queue} Queue Instance => ( for Queue.<methods> like Queue.play() )
   */

  CreateQueue(
    message,
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
      },
      IgnoreError: undefined,
      LeaveOnEmpty: undefined,
      LeaveOnEnd: undefined,
      LeaveOnBotOnly: undefined,
      LeaveOnEmptyTimedout: undefined,
      LeaveOnEndTimedout: undefined,
      LeaveOnBotOnlyTimedout: undefined,
    },
  ) {
    // this.#__buildsandDepschecks() -> Checks for Invalid Client , Missing Dependencies with Missing Discord Client Voice Intents

    this.#__buildsandDepschecks(this.Client);
    if (
      !message
      || !(
        message
        && message.guild
        && message.guild.id
        && message.channel
        && message.channel.id
      )
    ) {
      // Throw Error in Player Events as "error" event for Invalid Guild's Message

      return void this.emit('error', 'Invalid Guild Message', this, message);
    }

    // Picking up valid and user defined options if any and comparing them with Player Default Options

    QueueCreateOptions = ClassUtils.stablizingoptions(
      QueueCreateOptions,
      this.JerichoPlayerOptions,
    );

    // To Avoid excess use of memory and Space in Large bots , We will always Cache Queue and Create one if is Deleted by DeleteQueue() method
    var QueueInstance = JerichoPlayer.#QueueCacheFetch(message.guild.id, QueueCreateOptions)
      ?? new Queue(this.Client, message, QueueCreateOptions, this);
    return JerichoPlayer.#QueueCacheAdd(QueueInstance);
  }

  /**
   * DeleteQueue -> Delete's Cached Queue (forced way to erase Queue's Existence)
   * @param {String|Number} guildId Guild["id"] OR guild.id is required to fetch queue from the Cache
   * @returns {undefined} Returns "undefined"
   */

  DeleteQueue(guildId) {
    if (
      !guildId
      || !(guildId && (typeof guildId === 'string' || typeof guildId === 'number'))
    ) {
      return void this.emit('error', 'Invalid Guild Id', this, guildId);
    }
    // Checks for Queue in Cache doesn't matter if its Connection was destroyed | Cache only fetch its Existence to avoid excess CPU load
    if (JerichoPlayer.#QueueCacheFetch(guildId)) {
      return void JerichoPlayer.#QueueCacheRemove(guildId);
    }
    return void this.emit('error', 'Destroyed Queue', undefined);
  }

  /**
   * GetQueue -> Fetch Queue (Instance) from Cache or else returns undefined
   * @param {String|Number} guildId Guild["id"] OR guild.id is required to fetch queue from the Cache
   * @returns {Queue|undefined} Returns Queue Instance or else "undefined"
   */
  GetQueue(guildId) {
    if (
      !guildId
      || !(guildId && (typeof guildId === 'string' || typeof guildId === 'number'))
    ) {
      return void this.emit('error', 'Invalid Guild Id', this, guildId);
    }
    return JerichoPlayer.#QueueCacheFetch(guildId);
  }

  /**
   * @private Player Class Defined Method
   * #QueueCacheAdd -> Private Method for Player's Workload to Add Queue Cache Easily without using any Player's Instance
   * @param {Queue} QueueInstance Queue Instance made from "Queue" class to work around with many <Queue>.methods() for a guild
   * @returns {Queue} QueueInstance , To reperesnt the Work Complete Signal
   */

  static #QueueCacheAdd(QueueInstance) {
    JerichoPlayer.#QueueCaches[`${QueueInstance.guildId}`] = QueueInstance;
    return QueueInstance;
  }

  /**
   * @private Player Class Defined Method
   * #QueueCacheFetch -> Private Method for Player's Workload to Fetch Queue Cache Easily without using any Player's Instance
   * @param {String|Number} guildId Guild["id"] OR guild.id is required to fetch queue from the Cache
   * @param {DefaultQueueCreateOptions} QueueCreateOptions QueueCreateOptions for if Queue "connection" is destroyed , then it requires Options to remake whole infrastructure
   * @returns {Queue|undefined} QueueInstance , To reperesnt the Work Complete Signal
   */

  static #QueueCacheFetch(guildId, QueueCreateOptions = null) {
    var QueueInstance = JerichoPlayer.#QueueCaches[`${guildId}`];
    if (QueueCreateOptions && QueueInstance) {
      QueueInstance.QueueOptions = ClassUtils.stablizingoptions(
        QueueCreateOptions,
        QueueInstance.QueueOptions,
      );
      if (typeof QueueInstance.destroyed !== 'boolean') clearTimeout(QueueInstance.destroyed);
      QueueInstance.destroyed = false;
      JerichoPlayer.#QueueCaches[`${guildId}`] = QueueInstance;
    }
    return JerichoPlayer.#QueueCaches[`${guildId}`];
  }

  /**
   * @private Player Class Defined Method
   * #QueueCacheRemove -> Private Method for Player's Workload to Remove Queue Cache Easily without using any Player's Instance
   * @param {String|Number} guildId Guild["id"] OR guild.id is required to fetch queue from the Cache
   * @returns {undefined} undefined , To reperesnt the Work Complete Signal as Queue will be destroyed so , we can't return Queue
   */

  static #QueueCacheRemove(guildId) {
    if (!this.#QueueCacheFetch(guildId)) return false;
    var QueueInstance = JerichoPlayer.#QueueCaches[`${guildId}`];
    if (JerichoPlayer.#QueueCaches[`${guildId}`].playing) {
      JerichoPlayer.#QueueCaches[`${guildId}`].stop();
    }
    if (!QueueInstance.destroyed) QueueInstance.destroy();
    const Garbage = {};
    Garbage.Structure = QueueInstance;
    delete Garbage.Structure;
    JerichoPlayer.#QueueCaches[`${guildId}`] = undefined;
    return void null;
  }

  /**
   * @private Player Class Defined Method
   * #__playerVoiceConnectionMainHandler -> Private Method for Player's Voice Connection "Manager" to Filter out Connection Decisions frpm Queue | Player 's Connection Options from User
   * @param {Queue} QueueInstance Queue Instance made from "Queue" class to work around
   * @param {VoiceChannel|StageChannel} VoiceChannel Simple Discord Voice Channel | Stage Channel Value
   * @returns {undefined} undefined, As these Private method only meant for Voice Handling with Options
   */
  #__playerVoiceConnectionMainHandler(QueueInstance, VoiceChannel) {
    const clientchecks = (member) => member.user.id === this.Client.user.id;
    const userchecks = (member) => !member.user.bot;

    if (
      QueueInstance.QueueOptions.LeaveOnEmpty
      && ((VoiceChannel.members.size === 1
        && VoiceChannel.members.some(clientchecks))
        || VoiceChannel.members.size === 0)
    ) {
      QueueInstance.StreamPacket.TimedoutId
        ? clearTimeout(Number(QueueInstance.StreamPacket.TimedoutId))
        : undefined;
      QueueInstance.StreamPacket.TimedoutId = QueueInstance.destroy(
        QueueInstance.QueueOptions.LeaveOnBotOnlyTimedout ?? 0,
      ) ?? undefined;
    }
    if (
      (QueueInstance.QueueOptions.LeaveOnBotOnly
        && !VoiceChannel.members.some(userchecks)
        && VoiceChannel.members.some(clientchecks)
        && VoiceChannel.members.size > 1)
      || (!VoiceChannel.members.some(userchecks)
        && !VoiceChannel.members.some(clientchecks)
        && VoiceChannel.members.size <= 1)
    ) {
      QueueInstance.StreamPacket.TimedoutId
        ? clearTimeout(Number(QueueInstance.StreamPacket.TimedoutId))
        : undefined;
      QueueInstance.StreamPacket.TimedoutId = QueueInstance.destroy(
        QueueInstance.QueueOptions.LeaveOnBotOnlyTimedout ?? 0,
      ) ?? undefined;
    }
    return void null;
  }

  /**
   * @private Player Class Defined Method
   * #__handleVoiceConnectionInterchange -> Private Method for Player's Voice Destroy Connection
   * @param {Queue} QueueInstance Queue Instance made from "Queue" class to work around
   * @param {VoiceChannel|StageChannel} VoiceChannel Simple Discord Voice Channel | Stage Channel Value
   * @returns {undefined} undefined, As these Private method only meant for Voice Handling with Options
   */

  async #__handleVoiceConnectionInterchange(QueueInstance, VoiceChannel) {
    QueueInstance.StreamPacket.VoiceConnection = await join(
      this.Client,
      VoiceChannel,
    );
    QueueInstance.StreamPacket.VoiceChannel = VoiceChannel;
    if (
      QueueInstance.playing
      && !QueueInstance.paused
      && QueueInstance.StreamPacket.subscription
    ) {
      QueueInstance.StreamPacket.subscription.unsubscribe();
      QueueInstance.StreamPacket.subscription = QueueInstance.StreamPacket.VoiceConnection.subscribe(
        QueueInstance.MusicPlayer,
      );
    }
    JerichoPlayer.#QueueCaches[QueueInstance.guildId] = QueueInstance;
    return void null;
  }

  /**
   * @private Player Class Defined Method
   * #__buildsandDepschecks -> Private Method for Checks for Dependencies , Intents to avoid Internal value errors or package bugs
   * @param {Client} Client Discord Client Instance for Operating as a Bot
   * @returns {undefined} undefined, As these Private method only meant for Voice Handling with Options
   */

  #__buildsandDepschecks(Client) {
    let FmpeggGarbage;
    let LibopusGarbage;
    const MissingDeps = [' '];
    MissingDeps.push(
      '--[ Missing Dependencies from package.json | Do - "npm i packageName" ]--',
    );
    try {
      const GarbageInfo = FFmpeg.getInfo();
      FmpeggGarbage = !!`- version: ${GarbageInfo.version}`;
      LibopusGarbage = !!`- libopus: ${
        GarbageInfo.output.includes('--enable-libopus') ? 'yes' : 'no'
      }`;
    } catch (err) {
      LibopusGarbage = FmpeggGarbage = undefined;
    }
    !ClassUtils.ScanDeps('@discordjs/voice')
      ? MissingDeps.push(`${MissingDeps.length - 1})  "@discordjs/voice"`)
      : undefined;
    !ClassUtils.ScanDeps('prism-media')
      ? MissingDeps.push(`${MissingDeps.length - 1})  "prism-media"`)
      : undefined;

    !ClassUtils.ScanDeps('@discordjs/opus')
    && !ClassUtils.ScanDeps('opusscript')
      ? MissingDeps.push(
        `${MissingDeps.length - 1})  "@discordjs/opus" OR "opusscript"`,
      )
      : undefined;

    !ClassUtils.ScanDeps('tweetnacl')
    && !(ClassUtils.ScanDeps('libsodium-wrapper') && ClassUtils.ScanDeps('sodium'))
      ? MissingDeps.push(
        `${
          MissingDeps.length - 1
        })  "tweetnacl" OR ("libsodium-wrapper" And "sodium")`,
      )
      : undefined;

    !ClassUtils.ScanDeps('ffmpeg-static') && !(LibopusGarbage && FmpeggGarbage)
      ? MissingDeps.push(
        `${
          MissingDeps.length - 1
        })  "ffmpeg-static" OR "Ffmpeg from [https://www.ffmpeg.org/download.html]"`,
      )
      : undefined;

    !ClassUtils.ScanDeps('playdl-music-extractor')
    && !ClassUtils.ScanDeps('video-extractor')
      ? MissingDeps.push(
        `${
          MissingDeps.length - 1
        })  "playdl-music-extractor" OR "video-extractor"`,
      )
      : undefined;
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
        );
      }, 2 * 1000);
    }
    if (!Client) {
      throw Error(
        'Invalid Discord Client has been Detected! | And get some Voice and Channel Intents too',
      );
    } else if (
      !new Intents(Client.options.intents).has(
        Intents.FLAGS.GUILD_VOICE_STATES,
      )
      && !new Intents(Client.options.intents).has(Intents.FLAGS.GUILDS)
    ) {
      throw SyntaxError(
        'Missing Intents in Discord Client\n - GUILD_VOICE_STATES || Intents.FLAGS.GUILD_VOICE_STATES\n - - GUILDS || Intents.FLAGS.GUILDS',
      );
    } else if (
      !new Intents(Client.options.intents).has(Intents.FLAGS.GUILD_VOICE_STATES)
    ) {
      throw SyntaxError(
        'Missing Intents in Discord Client\n - GUILD_VOICE_STATES || Intents.FLAGS.GUILD_VOICE_STATES',
      );
    } else if (!new Intents(Client.options.intents).has(Intents.FLAGS.GUILDS)) {
      throw SyntaxError(
        'Missing Intents in Discord Client\n - GUILDS || Intents.FLAGS.GUILDS',
      );
    } else return void null;
  }
}

module.exports = JerichoPlayer;
