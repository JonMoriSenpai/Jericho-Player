const {
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
} = require('@discordjs/voice');
const { voiceResolver, guildResolver } = require('./snowflakes');
const queue = require('../core/queue');
const { invalidVoiceChannel } = require('../misc/errorEvents');
const { Options, voiceOptions } = require('../misc/enums');

class voiceMod {
  /**
   * @constructor
   * @param {queue} queue
   * @param {voiceOptions} options
   */
  constructor(queue, options = Options.packetOptions.voiceOptions) {
    this.queue = queue;
    this.player = queue?.player;
    this.discordClient = queue?.discordClient;
    this.eventEmitter = queue?.eventEmitter;
    this.options = options;
  }

  async connect(
    voiceSnowflake,
    requestedSource = this.queue?.current?.requestedSource,
  ) {
    try {
      const voiceChannel = await voiceResolver(
        this.discordClient,
        voiceSnowflake,
      );
      if (!voiceChannel)
        throw new invalidVoiceChannel(
          'Wrong Voice Channel Snowflake/Resolve is Detected for voiceMod.connect()',
        );
      if (this.queue.destroyed && typeof this.queue?.destroyed !== 'boolean')
        clearTimeout(this.queue?.destroyed);
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
        { queue: this.queue, requestedSource },
        this.options?.eventOptions,
      );
      return undefined;
    }
  }

  async disconnect(
    guildSnowflake,
    delayVoiceTimeout,
    requestedSource = this.queue?.current?.requestedSource,
    options = this.options ?? Options.packetOptions.voiceOptions,
  ) {
    try {
      const guild = await guildResolver(this.discordClient, guildSnowflake);
      if (!guild)
        throw new invalidVoiceChannel(
          'Wrong Voice Channel Snowflake/Resolve is Detected for voiceMod.connect()',
        );
      const queue = await this.player.getQueue(guild);
      if (queue.destroyed && typeof queue?.destroyed !== 'boolean')
        clearTimeout(this.queue?.destroyed);
      if (queue?.packet?.audioPlayer && (queue?.playing || queue?.paused))
        queue?.packet?.audioPlayer?.stop();
      if (
        queue?.packet?.__privateCaches?.audioPlayerSubscription &&
        (queue?.playing || queue?.paused)
      ) {
        queue.packet.__privateCaches.audioPlayerSubscription.unsubscribe();
        queue.packet.__privateCaches.audioPlayerSubscription = undefined;
      }
      const connectedChannel = await voiceResolver(
        this.discordClient,
        options?.altVoiceChannel ?? guild?.members?.me?.voice?.channel,
      );
      if (!connectedChannel) return undefined;
      else if (options?.forceDestroy)
        if (delayVoiceTimeout && delayVoiceTimeout > 0) {
          return setTimeout(() => {
            const voiceConnection = getVoiceConnection(guild?.id);
            if (!voiceConnection) return undefined;
            voiceConnection.destroy(true);
            this.eventEmitter.emitEvent(
              'botDisconnect',
              'Discord Client got Disconnected from the Channel',
              {
                queue: this.queue,
                channel: connectedChannel,
                requestedSource,
              },
            );
            return true;
          }, delayVoiceTimeout * 1000);
        } else {
          const voiceConnection = getVoiceConnection(guild?.id);
          if (!voiceConnection) return undefined;
          voiceConnection.destroy(true);
          this.eventEmitter.emitEvent(
            'botDisconnect',
            'Discord Client got Disconnected from the Channel',
            {
              queue: this.queue,
              channel: connectedChannel,
              requestedSource,
            },
          );
          return true;
        }
      else if (delayVoiceTimeout && delayVoiceTimeout > 0) {
        return setTimeout(() => {
          const voiceConnection = getVoiceConnection(guild?.id);
          if (!voiceConnection) return undefined;
          voiceConnection.disconnect();
          this.eventEmitter.emitEvent(
            'botDisconnect',
            'Discord Client got Disconnected from the Channel',
            {
              queue: this.queue,
              channel: connectedChannel,
              requestedSource,
            },
          );
          return true;
        }, delayVoiceTimeout * 1000);
      } else {
        const voiceConnection = getVoiceConnection(guild?.id);
        if (!voiceConnection) return undefined;
        voiceConnection.disconnect();
        this.eventEmitter.emitEvent(
          'botDisconnect',
          'Discord Client got Disconnected from the Channel',
          {
            queue: this.queue,
            channel: connectedChannel,
            requestedSource,
          },
        );
        return true;
      }
    } catch (errorMetadata) {
      this.eventEmitter.emitEvent(
        'connectionError',
        errorMetadata?.message ?? `${errorMetadata}`,
        { queue: this.queue, requestedSource },
        this.options?.eventOptions,
      );
      return undefined;
    }
  }
}

module.exports = voiceMod;
