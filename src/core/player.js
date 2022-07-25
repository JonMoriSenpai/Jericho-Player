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
const { Options } = require('../misc/enums');

/**
 * @class player -> Player Class for Discord Client v14 for Jericho-Player Framework
 */
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

    /**
     * @type {Client} Discord Client Instance for Discord Bot for Interaction with Discord Api
     * @readonly
     */
    this.discordClient = discordClient;

    /**
     * @type {Options} Player/Queue Creation/Destruction Options + packet,downlaoder Options and even more options for caching
     * @readonly
     */
    this.options = options;

    /**
     * @type {eventEmitter} Event Emitter Instance for Distributing Events based Info to the Users abou the Framework and Progress of certain Request
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
        return this.#__queueMods('forceCreate', guild?.id, options);
      else return this.#__queueMods('create', guild?.id, options);
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
      const requestedQueue = this.#__queueMods('get', guild?.id, options);
      if (!requestedQueue) throw new invalidQueue();
      this.eventEmitter.emitDebug(
        'queue Destruction',
        'Destruction of Queue Class Instance from Actual Player Class Caches',
        {
          guildSnowflake,
        },
      );
      if (!requestedQueue?.destroyed)
        await requestedQueue.destroy(options?.delayTimeout, destroyConnection);
      this.#__queueMods('delete', guild?.id, options);
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
   * @private @method __queueMods Manupulative Works related Queue and Player
   * @param {string} method swtich case method for queue mode work
   * @param {string | number | Guild.id} guildId Discord Guild Id for queue fetching and creation
   * @param {Options} options Queue Creation/Destruction Options
   * @param {queue | object} metadata Random or un-defined metadata or queue on major conditions
   * @returns {Boolean | queue} Returns Boolean on success or failure or Queue on creation of it
   */

  #__queueMods(method, guildId, options = Options, metadata = undefined) {
    try {
      switch (method?.toLowerCase()?.trim()) {
        case 'get':
          return player.__privateCaches[guildId?.trim()];
        case 'forceget':
          return (
            player.__privateCaches[guildId?.trim()] ??
            this.#__queueMods(
              'create',
              guildId,
              options,
              new queue(guildId, options, this),
            )
          );
        case 'submit':
          player.__privateCaches[guildId?.trim()] = metadata;
          return metadata;
        case 'create':
          return (
            this.#__queueMods('get', guildId) ??
            this.#__queueMods(
              'submit',
              guildId,
              options,
              new queue(guildId, options, this),
            )
          );
        case 'forcecreate':
          const cachedQueue = this.#__queueMods('get', guildId);
          if (cachedQueue) this.#__queueMods('delete', guildId);
          return this.#__queueMods(
            'submit',
            guildId,
            options,
            new queue(guildId, options, this),
          );

        case 'delete':
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
   * @param {object} options Voice Options if voiceMod is required
   */
  async #__voiceHandler(oldState, newState, queue, options = Options?.packetOption?.voiceOptions) {
    if (
      (oldState?.member.id === queue?.current?.user.id ||
        newState?.member.id === queue?.current?.user.id) &&
      (!options?.leaveOn?.bot ||
        (options?.leaveOn?.bot && !newState?.member?.user?.bot))
    ) {
      if (!newState?.channelId && !queue?.destroyed) {
        if (oldState?.channel?.members?.size === 1)
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
            options?.leaveOn?.bot && !isNaN(Number(options?.leaveOn?.bot)) > 0
              ? options?.leaveOn?.bot
              : 0,
        });
      } else if (
        newState?.channelId &&
        !queue?.destroyed &&
        options?.anyoneCanMoveClient
      )
        return await queue.voiceMod.connect(newState.channel);
      else return undefined;
    } else if (
      oldState?.member.id === this.discordClient?.user?.id ||
      newState?.member.id === this.discordClient?.user?.id
    ) {
      if (!newState?.channelId && !queue?.destroyed)
        return await this.destroyQueue(queue?.guildId, true, {
          ...options,
          voiceOptions: {
            ...options?.voiceOptions,
            altVoiceChannel: oldState?.channelId,
          },
        });
      else if (oldState?.channelId && newState?.channelId && !queue?.destroyed)
        return await queue.voiceMod.connect(
          options?.anyoneCanMoveClient ? newState.channel : oldState?.channel,
        );
      else return undefined;
    } else return undefined;
  }

  get type() {
    return 'player';
  }
}

module.exports = player;
