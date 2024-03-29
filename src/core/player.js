const EventEmiiter = require('events').EventEmitter;
const {
  Client,
  Guild,
  Message,
  User,
  Channel,
  VoiceState,
} = require('discord.js');
const queue = require('./queue');
const { guildResolver } = require('../utils/snowflakes');
const eventEmitter = require('../utils/eventEmitter');
const { invalidGuild, invalidQueue } = require('../misc/errorEvents');
const {
  __initialBuildChecks,
  scanDeps,
  watchDestroyed,
} = require('../utils/miscUtils');
const { Options, voiceOptions } = require('../misc/enums');

class player extends EventEmiiter {
  /**
   * @static @private @property {object} __privateCaches Private Caches Library in the form of object submission and redmeption based on time and choices of function
   */

  static __privateCaches = {};

  /**
   * @constructor player -> Player Class for Discord Client v14 for Jericho-Player Framework
   * @param {Client} discordClient Discord Client Instance for Discord Bot for Interaction with Discord Api
   * @param {Options} options Object Wised Options for Player Creation and Saved to Cache for further Modifications for backend stuff of Framework
   */
  constructor(discordClient, options = Options) {
    super();

    __initialBuildChecks(discordClient, this);

    /**
     * Discord Client Instance for Discord Bot for Interaction with Discord Api
     * @type {Client}
     * @readonly
     */
    this.discordClient = discordClient;

    /**
     * Player/Queue Creation/Destruction Options + packet,downlaoder Options and even more options for caching
     * @type {Options}
     * @readonly
     */
    this.options = options;

    /**
     * Event Emitter Instance for Distributing Events based Info to the Users abou the Framework and Progress of certain Request
     * @type {eventEmitter}
     * @readonly
     */
    this.eventEmitter = new eventEmitter(this, options?.eventOptions);

    this.discordClient.on('voiceStateUpdate', async (oldState, newState) => {
      const rawQueue = await this.getQueue(
        oldState?.guild?.id ?? newState?.guild?.id,
      );
      if (
        rawQueue &&
        oldState?.guild?.id === rawQueue.guildId &&
        newState?.guild?.id === rawQueue.guildId &&
        newState?.channelId !== oldState?.channelId
      )
        return await this.#__voiceHandler(
          oldState,
          newState,
          rawQueue,
          rawQueue?.options?.voiceOptions ?? this.options?.voiceOptions,
        );
      else return undefined;
    });
  }

  /**
   * @method createQueue Creation of Queue Instance with proper caching and Options formulator
   * @param {Guild | Message | User | Channel} guildSnowflake A Guild Snowflake - Meant by Resolving Raw Value to be parsed for Actual Guild Instance and use for further developments of Queue
   * @param {Boolean | false} forceCreate Force Create Queue by Deleting Old Queue if any present
   * @param {Options} options Object Wised Options for Queue Creation and Saved to Cache for further Modifications for backend stuff of Framework
   * @returns {Promise<queue>} new queue(options) on Success Value with proper other sub-classes alignment
   */

  async createQueue(guildSnowflake, forceCreate = false, options = Options) {
    try {
      const guild = await guildResolver(this.discordClient, guildSnowflake);
      if (!guild?.id) throw new invalidGuild();
      this.eventEmitter.emitDebug(
        'queue Creation',
        'Creation of Queue Class Instance for Discord Guild Requests',
        {
          guildSnowflake,
        },
      );
      if (forceCreate)
        return await this.#__queueMods('forceCreate', guild?.id, options);
      else return await this.#__queueMods('create', guild?.id, options);
    } catch (errorMetadata) {
      this.eventEmitter.emitError(
        errorMetadata,
        undefined,
        'player.createQueue()',
        {
          guildSnowflake,
          options,
        },
        options?.eventOptions ?? this.options?.eventOptions,
      );
      return undefined;
    }
  }

  /**
   * @method destroyQueue Destroy Queue from Player Caches and destroy Queue internally (if any process are running or on wait)
   * @param {Guild | Message | User | Channel} guildSnowflake A Guild Snowflake - Meant by Resolving Raw Value to be parsed for Actual Guild Instance and use for further developments of Queue
   * @param {Boolean | true} destroyConnection Destroy Connection if any present in guild with client
   * @param {Options} options Destruction of Options for internal Processes
   * @returns {Promise<Boolean | undefined>} Returns Boolean or undefined on failure or success rate!
   */
  async destroyQueue(
    guildSnowflake,
    destroyConnection = true,
    options = Options,
  ) {
    try {
      const guild = await guildResolver(this.discordClient, guildSnowflake);
      if (!guild?.id) throw new invalidGuild();
      const requestedQueue = await this.#__queueMods('get', guild?.id, options);
      if (!requestedQueue) throw new invalidQueue();
      this.eventEmitter.emitDebug(
        'queue Destruction',
        'Destruction of Queue Class Instance from Actual Player Class Caches',
        {
          guildSnowflake,
        },
      );
      await this.#__queueMods('delete', guild?.id, options);
      return true;
    } catch (errorMetadata) {
      this.eventEmitter.emitError(
        errorMetadata,
        undefined,
        'player.destroyQueue()',
        {
          guildSnowflake,
          destroyConnection,
          options,
        },
        options?.eventOptions ?? this.options?.eventOptions,
      );
      return undefined;
    }
  }

  /**
   * @method getQueue Fetching/Getting of Queue Instance with proper caching and Options formulator
   * @param {Guild | Message | User | Channel} guildSnowflake A Guild Snowflake - Meant by Resolving Raw Value to be parsed for Actual Guild Instance and use for further developments of Queue
   * @param {Options} options Object Wised Options for Queue Fetching and Get from Cache for further Modifications for backend stuff of Framework
   * @param {Boolean | false} forceGet Force Player to spawn new Queue and cached
   * @returns {Promise<queue>} On Success Value with proper other sub-classes alignments
   */

  async getQueue(guildSnowflake, options = Options, forceGet = false) {
    try {
      const guild = await guildResolver(this.discordClient, guildSnowflake);
      if (!guild?.id) throw new invalidGuild();
      if (forceGet) return this.#__queueMods('forceget', guild?.id, options);
      else return this.#__queueMods('get', guild?.id);
    } catch (errorMetadata) {
      this.eventEmitter.emitError(
        errorMetadata,
        undefined,
        'player.getQueue()',
        {
          guildSnowflake,
          options,
        },
        options?.eventOptions ?? this.options?.eventOptions,
      );
      return undefined;
    }
  }

  /**
   * @method depReport Dependencies Report as String from the misc Utils
   * @returns {string} Returns Report as String
   */

  static depReport() {
    return scanDeps();
  }

  /**
   * @private @method __queueMods Manupulative Works related Queue and Player
   * @param {string} method swtich case method for queue mode work
   * @param {string | number | Guild.id} guildId Discord Guild Id for queue fetching and creation
   * @param {Options} options Queue Creation/Destruction Options
   * @param {queue | object} metadata Random or un-defined metadata or queue on major conditions
   * @returns {Promise<Boolean | queue>} Returns Boolean on success or failure or Queue on creation of it
   */

  async #__queueMods(method, guildId, options = Options, metadata = undefined) {
    try {
      let queueMetadata = player.__privateCaches?.[guildId?.trim()];
      switch (method?.toLowerCase()?.trim()) {
        case 'get':
          return player.__privateCaches[guildId?.trim()];
        case 'forceget':
          if (!(queueMetadata && !watchDestroyed(queueMetadata))) {
            queueMetadata = new queue(guildId, options, this);
            player.__privateCaches[guildId?.trim()] = queueMetadata;
          }
          this.eventEmitter.emitDebug(
            'queue Creation',
            'Creation of Queue Class Instance for Discord Guild Requests',
            {
              guildId,
            },
          );
          return queueMetadata;
        case 'submit':
          player.__privateCaches[guildId?.trim()] = metadata;
          return metadata;
        case 'create':
          if (!(queueMetadata && !watchDestroyed(queueMetadata))) {
            queueMetadata = new queue(guildId, options, this);
            player.__privateCaches[guildId?.trim()] = queueMetadata;
          }
          this.eventEmitter.emitDebug(
            'queue Creation',
            'Creation of Queue Class Instance for Discord Guild Requests',
            {
              guildId,
            },
          );
          return queueMetadata;
        case 'forcecreate':
          if (queueMetadata && !watchDestroyed(queueMetadata))
            await queueMetadata.destroy();

          this.eventEmitter.emitDebug(
            'queue Creation',
            'Creation of Queue Class Instance for Discord Guild Requests',
            {
              guildId,
            },
          );

          queueMetadata = new queue(guildId, options, this);
          player.__privateCaches[guildId?.trim()] = queueMetadata;
          return queueMetadata;
        case 'delete':
          if (!queueMetadata) return true;
          else if (!watchDestroyed(queueMetadata))
            await queueMetadata.destroy();
          delete player.__privateCaches[guildId?.trim()];
          return true;
        default:
          return undefined;
      }
    } catch (errorMetadata) {
      this.eventEmitter.emitError(
        errorMetadata,
        undefined,
        'player.#__queueMods()',
        {
          method,
          guildId,
          options,
          metadata,
        },
        options?.eventOptions ?? this.options?.eventOptionss,
      );
      return undefined;
    }
  }

  /**
   * @private
   * @method __voiceHandler() Voice Handlers of Discord Client for moderating cached and working Queue on the respective Guild
   * @param {VoiceState} oldState Old Voice State where previous State has been recorded from Client or Api
   * @param {VoiceState} newState New Voice State where present State has been recorded from Client or Api
   * @param {queue} queue Queue Data from Player's caches
   * @param {voiceOptions} options Voice Options if voiceMod is required
   */
  async #__voiceHandler(oldState, newState, queue, options = voiceOptions) {
    if (
      (oldState?.member.id === queue?.current?.user.id ||
        newState?.member.id === queue?.current?.user.id) &&
      (!options?.leaveOn?.bot ||
        (options?.leaveOn?.bot && !newState?.member?.user?.bot))
    ) {
      if (!newState?.channelId && !watchDestroyed(queue)) {
        if (
          oldState?.channel?.members?.size === 1 &&
          options?.leaveOn?.empty &&
          !isNaN(Number(options?.leaveOn?.empty)) > 0
        ) {
          this.eventEmitter.emitEvent(
            'channelEmpty',
            'Channel is Empty and have no members in it',
            {
              queue,
              channel: oldState?.channel,
              requestedSource: queue?.current?.requestedSource,
            },
          );

          return await this.destroyQueue(queue?.guildId, true, {
            delayTimeout:
              options?.leaveOn?.empty &&
              !isNaN(Number(options?.leaveOn?.empty)) > 0
                ? options?.leaveOn?.empty
                : undefined,
          });
        } else
          return await this.destroyQueue(queue?.guildId, true, {
            delayTimeout:
              options?.leaveOn?.bot && !isNaN(Number(options?.leaveOn?.bot)) > 0
                ? options?.leaveOn?.bot
                : 0,
          });
      } else if (
        newState?.channelId &&
        !watchDestroyed(queue) &&
        options?.anyoneCanMoveClient
      )
        return await queue.voiceMod.connect(newState.channel);
      else if (
        oldState?.channel?.members?.size === 1 &&
        options?.leaveOn?.empty &&
        !isNaN(Number(options?.leaveOn?.empty)) > 0
      ) {
        this.eventEmitter.emitEvent(
          'channelEmpty',
          'Channel is Empty and have no members in it',
          {
            queue,
            channel: oldState?.channel,
            requestedSource: queue?.current?.requestedSource,
          },
        );
        const garbageResponse = await this.destroyQueue(queue?.guildId, true, {
          delayTimeout:
            options?.leaveOn?.empty &&
            !isNaN(Number(options?.leaveOn?.empty)) > 0
              ? options?.leaveOn?.empty
              : undefined,
        });
        if (garbageResponse)
          this.eventEmitter.emitEvent(
            'botDisconnect',
            'Bot got Disconnected Suddenly/Un-expectedly',
            {
              queue,
              oldChannel: oldState?.channel,
              newChannel: newState?.channel,
              requestedSource: queue?.current?.requestedSource,
            },
          );
        return true;
      } else return undefined;
    } else if (
      oldState?.member.id === this.discordClient?.user?.id ||
      newState?.member.id === this.discordClient?.user?.id
    ) {
      if (!newState?.channelId && !watchDestroyed(queue)) {
        const garbageResponse = await this.destroyQueue(queue?.guildId, true, {
          voiceOptions: {
            ...options,
            altVoiceChannel: oldState?.channelId,
          },
        });
        if (garbageResponse)
          this.eventEmitter.emitEvent(
            'botDisconnect',
            'Bot got Disconnected Suddenly/Un-expectedly',
            {
              queue,
              oldChannel: oldState?.channel,
              newChannel: newState?.channel,
              requestedSource: queue?.current?.requestedSource,
            },
          );
        return true;
      } else if (
        oldState?.channelId &&
        newState?.channelId &&
        oldState?.channelId !== newState?.channelId &&
        !watchDestroyed(queue)
      ) {
        const garbageResponse = await queue.voiceMod.connect(
          options?.anyoneCanMoveClient ? newState.channel : oldState?.channel,
          queue?.current?.requestedSource,
        );
        if (garbageResponse && options?.anyoneCanMoveClient)
          this.eventEmitter.emitEvent(
            'channelShift',
            "Bot's Channel got Shifted Suddenly/Un-expectedly",
            {
              queue,
              oldChannel: oldState?.channel,
              newChannel: newState?.channel,
              requestedSource: queue?.current?.requestedSource,
            },
          );
        return true;
      } else return undefined;
    } else return undefined;
  }

  get type() {
    return 'player';
  }
}

module.exports = player;
