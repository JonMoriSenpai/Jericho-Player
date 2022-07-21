const EventEmiiter = require('events').EventEmitter;
const { Client } = require('discord.js');
const queue = require('./queue');
const { guildResolver } = require('../utils/snowflakes');
const eventEmitter = require('../utils/eventEmitter');

class player extends EventEmiiter {
  static __privateCaches = {};

  /**
   *
   * @param {Client} discordClient
   * @param {object<any>} options
   */
  constructor(discordClient, options) {
    super();
    this.discordClient = discordClient;
    this.eventEmitter = new eventEmitter(this, options?.eventOptions);
  }

  async createQueue(guildSnowflake, options) {
    try {
      const guild = await guildResolver(this.discordClient, guildSnowflake);
      if (!guild?.id)
        throw new Error(
          '[ Invalid Guild Snowflake ] : Guild Snowflake is Wrong and Un-Supported for Creation of Queue',
        );
      this.eventEmitter.emitDebug(
        'queue Creation',
        'Creation of Queue Class Instance for Discord Guild Requests',
        {
          guildSnowflake,
        },
      );
      return this.#__queueMods('create', guild?.id, options);
    } catch (errorMetadata) {
      this.eventEmitter.emitError(
        errorMetadata,
        undefined,
        'player.createQueue()',
        {
          guildSnowflake,
          options,
        },
        options?.eventOptions,
      );
      return undefined;
    }
  }

  async getQueue(guildSnowflake, options) {
    try {
      const guild = await guildResolver(this.discordClient, guildSnowflake);
      if (!guild?.id)
        throw new Error(
          '[ Invalid Guild Snowflake ] : Guild Snowflake is Wrong and Un-Supported for Fetching of Queue',
        );
      return this.#__queueMods('get', guild?.id, options);
    } catch (errorMetadata) {
      this.eventEmitter.emitError(
        errorMetadata,
        undefined,
        'player.getQueue()',
        {
          guildSnowflake,
          options,
        },
        options?.eventOptions,
      );
      return undefined;
    }
  }

  #__queueMods(method, guildId, options, metadata) {
    try {
      switch (method?.toLowerCase()?.trim()) {
        case 'get':
          return player.__privateCaches[guildId?.trim()];
        case 'hardget':
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
        options?.eventOptions,
      );
      return undefined;
    }
  }
}

module.exports = player;
