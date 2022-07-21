const {
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
} = require('@discordjs/voice');
const { voiceResolver } = require('./snowflakes');
const player = require('../core/player');

class voiceMod {
  /**
   *
   * @param {player} player
   */
  constructor(player) {
    this.player = player;
    this.discordClient = player?.discordClient;
    this.eventEmitter = player?.eventEmitter;
  }

  async connect(voiceSnowflake, options) {
    try {
      const voiceChannel = await voiceResolver(
        this.discordClient,
        voiceSnowflake,
      );
      if (!voiceChannel)
        throw new TypeError(
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
      this.eventEmitter.emitError(
        errorMetadata,
        ' - Provide Correct Query or Voice Channel for Connection and Audio Processing',
        'voiceMod.connect()',
        { voiceSnowflake, options },
        options?.eventOptions,
      );
      return undefined;
    }
  }
}

module.exports = voiceMod;
