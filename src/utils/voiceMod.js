const {
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
} = require('@discordjs/voice');
const { voiceResolver, guildResolver } = require('./snowflakes');
const queue = require('../core/queue');

class voiceMod {
  /**
   * @constructor
   * @param {queue} queue
   * @param {object} options
   */
  constructor(queue, options) {
    this.queue = queue;
    this.player = queue?.player;
    this.discordClient = queue?.discordClient;
    this.eventEmitter = queue?.eventEmitter;
    this.options = options;
  }

  async connect(voiceSnowflake, options) {
    try {
      const voiceChannel = await voiceResolver(
        this.discordClient,
        voiceSnowflake,
      );
      if (!voiceChannel)
        throw new Error(
          '[ Invalid Voice Channel ] : Wrong Voice Channel Snowflake/Resolve is Detected for voiceMod.connect()',
        );
      const rawVoiceConnection = joinVoiceChannel({
        channelId: voiceChannel?.id,
        guildId: voiceChannel?.guildId,
        adapterCreator: voiceChannel?.guild?.voiceAdapterCreator,
      });
      try {
        await entersState(
          rawVoiceConnection,
          VoiceConnectionStatus.Ready,
          60e3,
        );
        return rawVoiceConnection;
      } catch (errorMetadata) {
        rawVoiceConnection.destroy();
        throw errorMetadata;
      }
    } catch (errorMetadata) {
      this.eventEmitter.emitEvent(
        'connectionError',
        errorMetadata?.message ?? `${errorMetadata}`,
        { queue: this.queue },
        this.options?.eventOptions,
      );
      return undefined;
    }
  }

  async disconnect(guildSnowflake, delayVoiceTimeout, options) {
    try {
      const guild = await guildResolver(this.discordClient, guildSnowflake);
      if (!guild)
        throw new Error(
          '[ Invalid Discord Guild ] : Corrupt/Invalid Guild Data by guild Snowflake has been resolved',
        );
      const queue = await this.player.getQueue(guild);
      if (queue?.packet?.audioPlayer && (queue?.playing || queue?.paused))
        queue?.packet?.audioPlayer?.stop();
      if (
        queue?.packet?.__privateCaches?.audioPlayerSubscription &&
        (queue?.playing || queue?.paused)
      )
        queue?.packet?.__privateCaches?.audioPlayerSubscription?.unsubscribe();
      const voiceConnection = getVoiceConnection(guild?.id);
      if (!voiceConnection)
        throw new Error(
          '[ Invalid Voice Connection ] : Corrupt/Invalid Voice Connection has been fetched',
        );
      if (options?.forceDestroy)
        return delayVoiceTimeout && delayVoiceTimeout > 0
          ? setTimeout(() => {
            voiceConnection.destroy(true);
          }, delayVoiceTimeout * 1000)
          : true;
      else
        return delayVoiceTimeout && delayVoiceTimeout > 0
          ? setTimeout(() => {
            voiceConnection.disconnect();
          }, delayVoiceTimeout * 1000)
          : true;
    } catch (errorMetadata) {
      this.eventEmitter.emitEvent(
        'connectionError',
        errorMetadata?.message ?? `${errorMetadata}`,
        { queue: this.queue },
        this.options?.eventOptions,
      );
      return undefined;
    }
  }
}

module.exports = voiceMod;
