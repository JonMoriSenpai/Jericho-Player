const EventEmitter = require('events');
const { FFmpeg } = require('prism-media');
const {
  Intents, Client, Message, Interaction,
} = require('discord.js');
const Queue = require('./Queue-Handler.js');
const ClassUtils = require('../Utilities/Class-Utils');
const { join } = require('../Utilities/Voice-Utils');
const {
  DefaultJerichoPlayerOptions,
  DefaultQueueCreateOptions,
} = require('../types/interfaces');

/**
 * @class JerichoPlayer -> Jericho Player Class for Creating Player Instances for Radio or Music Players
 * @event "error" => Player.on("error", ErrorMessage , Queue | Player , ExtraContent | undefined ) => { "Handle Error Event" } | Queue can be undefined if Player got Error
 * @event "tracksAdd" => Player.on("tracksAdd", Queue , tracks[] ) => { } | tracks[] is Tracks from "Query" provided in Queue.play() or Queue.insert()
 * @event "trackEnd" => Player.on("trackEnd", Queue , track ) => { } | track is Last Played Track with no missing values
 * @event "trackStart" => Player.on("trackStart", Queue , track ) = > { } | track is Current Track - "Queue.current"
 * @event "playlistAdd" => Player.on("playlistAdd", Queue , tracks[] ) => { } | tracks[] is Tracks from "Query" provided in Queue.play() or Queue.insert()
 * @event "botDisconnect" => Player.on("botDisconnect", Queue , VoiceChannel ) => { } | Queue can be undefined , depends on reason of event trigger
 * @event "channelEmpty" => Player.on("channelEmpty", Queue , VoiceChannel ) => {  } | Voice Channel can be undefined or destroyed if User does .
 * @method CreateQueue<Queue> => Creates Queue and returns "instanceof Queue"
 * @method GetQueue<Queue> => Fetch Queue from Cache and returns "instanceof Queue"
 * @method DeleteQueue<undefined> => Delete Queue from Cache | Destroy Queue Completely and returns undefined
 * @return New Jericho Player Instance
 */
class JerichoPlayer extends EventEmitter {
  /**
   * @property {Object} QueueCaches => Caches of Queues for per "instanceof Player"
   */
  static #QueueCaches = {}

  /**
   * @constructor of Jericho Player
   * @param {Client} Client  Instanceof Discord.js Client
   * @param {DefaultJerichoPlayerOptions<Object>}  JerichoPlayerOptions  Player Options for Stream Extraction and Voice Connection Moderation
   */

  constructor(
    Client,
    JerichoPlayerOptions = {
      extractor: 'play-dl',
      ExtractorStreamOptions: {
        Limit: 1,
        Quality: 'high',
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

    this.Client = Client;
    this.JerichoPlayerOptions = ClassUtils.stablizingoptions(
      JerichoPlayerOptions,
      DefaultJerichoPlayerOptions,
    );

    /**
     * - Voice Events will be Moderated from here Except "LeaveonEnd" Object Value it's Timedout Value
     * - Node js Timeout Id's as Number will be Cached for Clear Timeout here and in "Queue.#__QueueAudioPlayerStatusManager()"
     */

    this.Client.on('voiceStateUpdate', async (OldVoiceState, NewVoiceState) => {
      /**
       * - QueueInstance Fetched from Private Raw Cache Fetching Method "JerichoPlayer.#QueueCacheFetch(guildId)"
       * - QueueIntance => will be used to filter Voice Events Related to our Queue or else return undefined for handling
       */

      const QueueInstance = JerichoPlayer.#QueueCacheFetch(
        (NewVoiceState ? NewVoiceState.guild.id : undefined)
          ?? (OldVoiceState ? OldVoiceState.guild.id : undefined),
      );

      /**
       * @function clientchecks<Object> => Checks for Client in Voice Channel as Member
       * @param {Object} member Guild Member < Object | Instance > for Checking its originality about being Client
       * @returns {Boolean} true if Client has been Found and false if CLient is not Present
       */

      const clientchecks = (member) => member.user.id === this.Client.user.id;

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
   * @method CreateQueue => Create Queue Instance for Player and per Guild
   * @param {Message | Interaction} message Guild Message Only for getting info about guild and guildId
   * @param {DefaultQueueCreateOptions} QueueCreateOptions => Queue Create Options for Queue Instance ( for making ByDefault Values for Queue.<methods> )
   * @returns {Queue} Queue Instance => ( for Queue.<methods> like Queue.play() )
   */

  CreateQueue(
    message,
    QueueCreateOptions = {
      extractor: 'play-dl',
      metadata: null,
      ExtractorStreamOptions: {
        Limit: 1,
        Quality: 'high',
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
      throw Error(
        'Invalid Guild Message , Please Provide Correct Guild Message Correctly',
      );
    }
    QueueCreateOptions = ClassUtils.stablizingoptions(
      QueueCreateOptions,
      this.JerichoPlayerOptions,
    );
    const QueueInstance = JerichoPlayer.#QueueCacheFetch(message.guild.id, QueueCreateOptions)
      ?? new Queue(this.Client, message, QueueCreateOptions, this);
    return JerichoPlayer.#QueueCacheAdd(QueueInstance);
  }

  DeleteQueue(guildId) {
    if (
      !guildId
      || !(guildId && (typeof guildId === 'string' || typeof guildId === 'number'))
    ) {
      throw Error(
        'Invalid Guild Id , Please Provide Correct Guild Id Correctly',
      );
    }
    if (JerichoPlayer.#QueueCacheFetch(guildId)) {
      return void JerichoPlayer.#QueueCacheRemove(guildId);
    }
    return void this.emit('error', 'Destroyed Queue', undefined);
  }

  GetQueue(guildId) {
    if (
      !guildId
      || !(guildId && (typeof guildId === 'string' || typeof guildId === 'number'))
    ) {
      throw Error(
        'Invalid Guild Id , Please Provide Correct Guild Id Correctly',
      );
    }
    return JerichoPlayer.#QueueCacheFetch(guildId);
  }

  static #QueueCacheAdd(QueueInstance) {
    JerichoPlayer.#QueueCaches[`${QueueInstance.guildId}`] = QueueInstance;
    return QueueInstance;
  }

  static #QueueCacheFetch(guildId, QueueCreateOptions = null) {
    const QueueInstance = JerichoPlayer.#QueueCaches[`${guildId}`];
    if (QueueCreateOptions && QueueInstance) {
      QueueInstance.QueueOptions = ClassUtils.stablizingoptions(
        QueueCreateOptions,
        QueueInstance.QueueOptions,
      );
      QueueInstance.destroyed = false;
      JerichoPlayer.#QueueCaches[`${guildId}`] = QueueInstance;
    }
    return JerichoPlayer.#QueueCaches[`${guildId}`];
  }

  static #QueueCacheRemove(guildId) {
    if (!this.#QueueCacheFetch(guildId)) return false;
    const QueueInstance = JerichoPlayer.#QueueCaches[`${guildId}`];
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
