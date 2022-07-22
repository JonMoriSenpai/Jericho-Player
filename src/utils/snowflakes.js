const {
  VoiceChannel,
  StageChannel,
  Client,
  Message,
  GuildMember,
  Guild,
  GuildChannel,
  User,
} = require('discord.js');

class snowFlakes {
  static async voiceResolver(discordClient, snowflake) {
    if (!(discordClient && discordClient instanceof Client)) return undefined;
    else if (
      ((snowflake && snowflake instanceof VoiceChannel) ||
        snowflake instanceof StageChannel) &&
      snowflake?.id
    )
      return snowflake;
    else if (
      snowflake &&
      snowflake instanceof Message &&
      snowflake?.member?.voice
    )
      return snowflake?.member?.voice?.channel;
    else if (snowflake && snowflake instanceof GuildMember && snowflake?.voice)
      return snowflake?.voice?.channel;
    else if (
      snowflake &&
      typeof snowflake === 'string' &&
      snowflake?.trim() !== ''
    )
      return (
        discordClient.channels.cache.get(snowflake?.trim()) ??
        discordClient.channels.cache?.find((channel) => channel?.name?.includes(snowflake?.trim())) ??
        (await discordClient.channels
          .fetch(snowflake?.trim())
          ?.catch(() => undefined))
      );
    else return undefined;
  }

  static async guildResolver(discordClient, snowflake) {
    if (!(discordClient && discordClient instanceof Client)) return undefined;
    else if (snowflake && snowflake instanceof Guild) return snowflake;
    else if (
      snowflake &&
      (snowflake instanceof Message || snowflake instanceof GuildChannel) &&
      snowflake?.guild
    )
      return snowflake?.guild;
    else if (
      snowflake &&
      typeof snowflake === 'string' &&
      snowflake?.trim() !== ''
    )
      return (
        discordClient.guilds.cache.get(snowflake?.trim()) ??
        discordClient.guilds.cache?.find((guild) => guild?.name?.includes(snowflake?.trim())) ??
        (await discordClient.guilds
          .fetch(snowflake?.trim())
          ?.catch(() => undefined))
      );
    else return undefined;
  }

  static async userResolver(discordClient, snowflake) {
    if (!(discordClient && discordClient instanceof Client)) return undefined;
    else if (snowflake && snowflake instanceof User) return snowflake;
    else if (
      snowflake &&
      (snowflake instanceof Message || snowflake instanceof GuildMember)
    )
      return snowflake?.author ?? snowflake?.user ?? snowflake?.member;
    else if (
      snowflake &&
      typeof snowflake === 'string' &&
      snowflake?.trim() !== ''
    )
      return (
        discordClient.users.cache.get(snowflake?.trim()) ??
        discordClient.users.cache?.find((guild) => guild?.name?.includes(snowflake?.trim())) ??
        (await discordClient.users
          .fetch(snowflake?.trim())
          ?.catch(() => undefined))
      );
    else return undefined;
  }
}

module.exports = snowFlakes;
