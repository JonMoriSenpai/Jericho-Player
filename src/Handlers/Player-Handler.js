const Queue = require('./Queue-Handler.js');
const ClassUtils = require('../Utilities/Class-Utils');
const { join, disconnect } = require('../Utilities/Voice-Utils');

class JerichoPlayer {
  static #QueueCaches = []

  static #TimedoutIds = {}

  constructor(
    Client,
    JerichoPlayerOptions = {
      extractor: 'play-dl',
      ExtractorStreamOptions: {
        Limit: 1,
        Quality: 'high',
        Proxy: null,
      },
      IgnoreError: true,
      LeaveOnEmpty: false,
      LeaveOnEnd: false,
      LeaveOnBotOnly: false,
      LeaveOnEmptyTimedout: 0,
      LeaveOnEndTimedout: 0,
      LeaveOnBotOnlyTimedout: 0,
    },
  ) {
    this.Client = Client;
    this.JerichoPlayerOptions = JerichoPlayerOptions;
    this.Client.on('voiceStateUpdate', (OldVoiceState, NewVoiceState) => {
      const QueueInstance = this.GetQueue(
        (NewVoiceState ? NewVoiceState.guildId : null)
          ?? (OldVoiceState ? OldVoiceState.guildId : null),
      );
      if (
        !QueueInstance
        || (QueueInstance && QueueInstance.destroyed)
        || (QueueInstance && !QueueInstance.playing)
        || OldVoiceState.channel.id === NewVoiceState.channel.id
      ) return void null;
      if (
        OldVoiceState.channel
        && NewVoiceState.channel
        && NewVoiceState.id === this.Client.user.id
      ) {
        QueueInstance.StreamPacket.VoiceConnection = join(
          this.Client,
          NewVoiceState.channel,
        );
        return void null;
      } if (
        !NewVoiceState.channel
        && OldVoiceState.id !== this.Client.user.id
      ) {
        JerichoPlayer.#TimedoutIds[
          `${QueueInstance.guildId}`
        ] = this.#JerichoPlayerVoiceConnectionManager(
          QueueInstance,
          OldVoiceState.channel,
        );
        return void null;
      } if (
        QueueInstance.StreamPacket.VoiceChannel.id
          === NewVoiceState.channel.id
        && NewVoiceState.id !== this.Client.user.id
      ) {
        return JerichoPlayer.#TimedoutIds[`${QueueInstance.guildId}`]
          ? clearTimeout(JerichoPlayer.#TimedoutIds[`${QueueInstance.guildId}`])
          : null;
      } return void null;
    });
  }

  CreateQueue(
    message,
    QueueCreateOptions = {
      extractor: 'play-dl',
      metadata: null,
      ExtractorStreamOptions: {
        Limit: 1,
        Quality: 'high',
        Proxy: null,
      },
      IgnoreError: true,
      LeaveOnEmpty: false,
      LeaveOnEnd: false,
      LeaveOnBotOnly: false,

      LeaveOnEmptyTimedout: 0,
      LeaveOnEndTimedout: 0,
      LeaveOnBotOnlyTimedout: 0,
    },
  ) {
    QueueCreateOptions = ClassUtils.stablizingoptions(
      QueueCreateOptions,
      this.JerichoPlayerOptions,
    );
    const QueueInstance = JerichoPlayer.#QueueCacheFetch(message.guild.id, QueueCreateOptions)
      ?? new Queue(this.Client, message, QueueCreateOptions);
    return JerichoPlayer.#QueueCacheAdd(QueueInstance);
  }

  DeleteQueue(GuildId) {
    if (JerichoPlayer.#QueueCacheFetch(GuildId)) {
      return void JerichoPlayer.#QueueCacheRemove(GuildId);
    }
    throw Error(
      `[Invalid Queue] Queue is not Present for GuildId: "${GuildId}"`,
    );
  }

  GetQueue(GuildId) {
    const QueueInstance = JerichoPlayer.#QueueCacheFetch(GuildId);
    return QueueInstance;
  }

  static #QueueCacheAdd(QueueInstance) {
    JerichoPlayer.#QueueCaches[`${QueueInstance.GuildId}`] = QueueInstance;
    return QueueInstance;
  }

  static #QueueCacheFetch(GuildId, QueueCreateOptions = null) {
    const QueueInstance = JerichoPlayer.#QueueCaches[`${GuildId}`];
    if (QueueCreateOptions && QueueInstance) {
      QueueInstance.QueueOptions = ClassUtils.stablizingoptions(
        QueueCreateOptions,
        QueueInstance.QueueOptions,
      );
      QueueInstance.destroyed = false;
    }
    JerichoPlayer.#QueueCaches[`${GuildId}`] = QueueInstance;
    return JerichoPlayer.#QueueCaches[`${GuildId}`];
  }

  static #QueueCacheRemove(GuildId) {
    if (!this.#QueueCacheFetch(GuildId)) return false;
    const QueueInstance = JerichoPlayer.#QueueCaches[`${GuildId}`];
    QueueInstance.destroy();
    const Garbage = {};
    Garbage.Structure = QueueInstance;
    delete Garbage.Structure;
    JerichoPlayer.#QueueCaches[`${GuildId}`] = null;
    return void null;
  }

  #JerichoPlayerVoiceConnectionManager(QueueInstance, VoiceChannel) {
    const clientchecks = (member) => member.user.id === this.Client.user.id;
    const userchecks = (member) => !member.user.bot;

    JerichoPlayer.#TimedoutIds[`${QueueInstance.guildId}`] = JerichoPlayer
      .#TimedoutIds[`${QueueInstance.guildId}`]
      ? clearTimeout(
        Number(JerichoPlayer.#TimedoutIds[`${QueueInstance.guildId}`]),
      )
      : null;

    if (
      QueueInstance.QueueOptions.LeaveOnEmpty
      && ((VoiceChannel.members.size === 1
        && VoiceChannel.members.some(clientchecks))
        || VoiceChannel.members.size === 0)
    ) {
      return disconnect(
        QueueInstance.guildId,
        { destroy: true },
        QueueInstance.QueueOptions.LeaveOnEmptyTimedout,
      );
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
      return disconnect(
        QueueInstance.guildId,
        { destroy: true },
        QueueInstance.QueueOptions.LeaveOnBotOnlyTimedout,
      );
    }
    return void null;
  }
}

module.exports = JerichoPlayer;