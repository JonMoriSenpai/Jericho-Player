const EventEmiiter = require('events').EventEmitter;
const {
  Client,
  Guild,
  Message,
  User,
  Channel,
  VoiceState,
  Collection,
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
     * Collection of queue caches
     * @type {Collection<String,queue>}
     * @readonly
     */
    this.queues = new Collection();

    /**
     * Event Emitter Instance for Distributing Events based Info to the Users abou the Framework and Progress of certain Request
     * @type {eventEmitter}
     * @readonly
     */
    this.eventEmitter = new eventEmitter(this, options?.eventOptions);

    this.discordClient.on('voiceStateUpdate', async (oldState, newState) => {
      const rawQueue = this.queues.get(
        oldState?.guild?.id ?? newState?.guild?.id,
      );
      if (
        rawQueue &&
        !rawQueue?.destroyed &&
        oldState?.channel?.id !== newState?.channel?.id
      )
        return await this.#__voiceHandler(
          oldState,
          newState,
          rawQueue,
          rawQueue?.options ?? this.options,
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
      const requestedQueue = this.queues.has(guild?.id);
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
      let queueMetadata = this.queues.get(guildId?.trim());
      switch (method?.toLowerCase()?.trim()) {
        case 'get':
          return this.queues.get(guildId?.trim());
        case 'forceget':
          if (!(queueMetadata && !watchDestroyed(queueMetadata))) {
            this.queues.delete(guildId?.trim());
            queueMetadata = new queue(guildId, options, this);
            this.queues.set(guildId?.trim(), queueMetadata);

            this.eventEmitter.emitDebug(
              'queue Creation',
              'Creation of Queue Class Instance for Discord Guild Requests',
              {
                guildId,
              },
            );
          }
          return queueMetadata;
        case 'submit':
          this.queues.set(guildId?.trim(), metadata);
          return metadata;
        case 'create':
          if (!(queueMetadata && !watchDestroyed(queueMetadata))) {
            this.queues.delete(guildId?.trim());
            queueMetadata = new queue(guildId, options, this);
            this.queues.set(guildId?.trim(), queueMetadata);
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
          if (!queueMetadata) this.queues.delete(guildId?.trim());
          else if (!watchDestroyed(queueMetadata))
            await queueMetadata.destroy();
          this.eventEmitter.emitDebug(
            'queue Creation',
            'Creation of Queue Class Instance for Discord Guild Requests',
            {
              guildId,
            },
          );

          queueMetadata = new queue(guildId, options, this);
          this.queues.set(guildId?.trim(), queueMetadata);
          return queueMetadata;
        case 'delete':
          if (!queueMetadata) return true;
          else if (!watchDestroyed(queueMetadata))
            await queueMetadata.destroy(
              !isNaN(Number(options?.packetOptions?.voiceOptions?.delayTimeout))
                ? parseInt(options?.packetOptions?.voiceOptions?.delayTimeout)
                : undefined,
            );
          this.queues.set(guildId?.trim(), undefined);
          this.queues.delete(guildId?.trim());
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
   * @param {Options} options Voice Options if voiceMod is required
   */
  async #__voiceHandler(oldState, newState, queue, options = Options) {
    const voiceChannel =
      this.discordClient?.channels?.cache?.get(
        newState?.channel?.id ?? oldState?.channel?.id,
      ) ??
      (await this.discordClient?.channels?.fetch(
        newState?.channel?.id ?? oldState?.channel?.id,
      ));
    const oldBotCheck =
      oldState?.channel?.members?.size === 0 ||
      oldState?.channel?.members?.find(
        (m) => m?.user?.bot && m?.user?.id !== this.discordClient?.user?.id,
      );
    const newBotCheck =
      newState?.channel?.members?.size === 0 ||
      newState?.channel?.members?.find(
        (m) => m?.user?.bot && m?.user?.id !== this.discordClient?.user?.id,
      );
    const liveBotCheck =
      voiceChannel?.members?.size === 0 ||
      voiceChannel?.members?.find(
        (m) => m?.user?.bot && m?.user?.id !== this.discordClient?.user?.id,
      );
    const actualMember = oldState?.member ?? newState?.member;
    const oldStayCheck = Boolean(
      oldState?.channel?.guild?.members?.me?.voice?.channel?.id &&
        oldState?.channel?.id ===
          oldState?.channel?.guild?.members?.me?.voice?.channel?.id,
    );

    if (!voiceChannel?.id) return undefined;
    else if (
      !newState?.channel?.id &&
      actualMember?.id !== this.discordClient?.user?.id &&
      oldStayCheck
    ) {
      if (voiceChannel?.members?.size <= 2 && !watchDestroyed(queue)) {
        if (voiceChannel?.members?.size === 1 && options?.leaveOn?.empty) {
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
            ...options,
            packetOptions: {
              ...options?.packetOptions,
              voiceOptions: {
                ...options?.packetOptions?.voiceOptions,
                delayTimeout:
                  options?.packetOptions?.voiceOptions?.leaveOn?.empty &&
                  !isNaN(
                    Number(options?.packetOptions?.voiceOptions?.leaveOn?.empty),
                  ) > 0
                    ? options?.packetOptions?.voiceOptions?.leaveOn?.empty
                    : undefined,
              },
            },
          });
        } else if (voiceChannel?.members?.size <= 2 && liveBotCheck)
          return await this.destroyQueue(queue?.guildId, true, {
            ...options,
            packetOptions: {
              ...options?.packetOptions,
              voiceOptions: {
                ...options?.packetOptions?.voiceOptions,
                delayTimeout:
                  options?.packetOptions?.voiceOptions?.leaveOn?.bot &&
                  !isNaN(
                    Number(options?.packetOptions?.voiceOptions?.leaveOn?.bot),
                  ) > 0
                    ? options?.packetOptions?.voiceOptions?.leaveOn?.bot
                    : undefined,
              },
            },
          });
        else return undefined;
      } else return undefined;
    } else if (
      oldState?.channel?.id &&
      oldStayCheck &&
      newState?.channel?.id &&
      actualMember?.id !== this.discordClient?.user?.id &&
      queue?.current &&
      (newState?.channel?.members?.size > 1 ||
        (newState?.channel?.members?.size <= 1 && !newBotCheck))
    )
      await queue?.packet?.voiceMod?.connect(
        newState.channel,
        queue?.current?.requestedSource,
        true,
      );
    else if (
      oldState?.channel?.id &&
      oldStayCheck &&
      newState?.channel?.id &&
      actualMember?.id !== this.discordClient?.user?.id &&
      queue?.current &&
      (oldState?.channel?.members?.size > 2 ||
        (oldState?.channel?.members?.size <= 2 && !oldBotCheck))
    )
      await queue?.packet?.voiceMod?.connect(
        oldState.channel,
        queue?.current?.requestedSource,
        true,
      );
    else if (
      oldState?.channel?.id &&
      oldStayCheck &&
      newState?.channel?.id &&
      actualMember?.id !== this.discordClient?.user?.id &&
      queue?.current
    )
      return await this.destroyQueue(queue?.guildId, true, options);
    else if (
      oldState?.channel?.id &&
      oldStayCheck &&
      actualMember?.id === this.discordClient?.user?.id
    ) {
      if (!newState?.channelId && !watchDestroyed(queue))
        return await this.destroyQueue(queue?.guildId, true, options);
      else if (
        oldState?.channelId &&
        newState?.channelId &&
        oldState?.channelId !== newState?.channelId &&
        queue?.current
      ) {
        if (
          options?.packetOptions?.voiceOptions?.anyoneCanMoveClient &&
          queue?.current &&
          (newState?.channel?.members?.size > 2 ||
            (newState?.channel?.members?.size <= 2 && !newBotCheck))
        ) {
          await queue?.packet?.voiceMod?.connect(
            newState.channel,
            queue?.current?.requestedSource,
            true,
          );
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
        } else if (
          queue?.current &&
          (oldState?.channel?.members?.size > 1 ||
            (oldState?.channel?.members?.size <= 1 && !newBotCheck))
        ) {
          await queue?.packet?.voiceMod?.connect(
            oldState.channel,
            queue?.current?.requestedSource,
            true,
          );
        } else return await this.destroyQueue(queue?.guildId, true);
        return true;
      } else return undefined;
    } else return undefined;
    return undefined;
  }

  get type() {
    return 'player';
  }
}

module.exports = player;
