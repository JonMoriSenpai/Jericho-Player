const EventEmitter = require('events');
const { ClientUser } = require('discord.js/src/index.js');
const Queue = require('./Queue-Handler.js');
const ClassUtils = require('../Utilities/Class-Utils');
const { join, disconnect } = require('../Utilities/Voice-Utils');

class JerichoPlayer extends EventEmitter {
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
    super();
    if (
      !Client
      || !(Client && Client.user && Client.user instanceof ClientUser)
    ) throw Error('Invalid Discord Client , Please Provide one Correctly');
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
        JerichoPlayer.#QueueCaches[
          `${
            (NewVoiceState ? NewVoiceState.guildId : null)
            ?? (OldVoiceState ? OldVoiceState.guildId : null)
          }`
        ].StreamPacket.VoiceConnection = join(
          this.Client,
          NewVoiceState.channel,
        );

        return void null;
      }
      if (!NewVoiceState.channel && OldVoiceState.id !== this.Client.user.id) {
        JerichoPlayer.#TimedoutIds[
          `${QueueInstance.guildId}`
        ] = this.#JerichoPlayerVoiceConnectionManager(
          JerichoPlayer.#QueueCaches[
            `${
              (NewVoiceState ? NewVoiceState.guildId : null)
              ?? (OldVoiceState ? OldVoiceState.guildId : null)
            }`
          ],
          OldVoiceState.channel,
        );
        return void null;
      }
      if (
        QueueInstance.StreamPacket.VoiceChannel.id
          === NewVoiceState.channel.id
        && NewVoiceState.id !== this.Client.user.id
      ) {
        return JerichoPlayer.#TimedoutIds[`${QueueInstance.guildId}`]
          ? clearTimeout(JerichoPlayer.#TimedoutIds[`${QueueInstance.guildId}`])
          : null;
      }
      if (!NewVoiceState.channel && OldVoiceState.id === this.Client.user.id) {
        this.emit('BotDisconnect', QueueInstance);
        return this.DeleteQueue(QueueInstance.guildId);
      }
      return void null;
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
      ?? new Queue(this.Client, message, QueueCreateOptions, this);
    return JerichoPlayer.#QueueCacheAdd(QueueInstance);
  }

  DeleteQueue(guildId) {
    if (JerichoPlayer.#QueueCacheFetch(guildId)) {
      return void JerichoPlayer.#QueueCacheRemove(guildId);
    }
    return void this.emit('error', 'Destroyed Queue', undefined);
  }

  GetQueue(guildId) {
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
    }
    JerichoPlayer.#QueueCaches[`${guildId}`] = QueueInstance;
    return JerichoPlayer.#QueueCaches[`${guildId}`];
  }

  static #QueueCacheRemove(guildId) {
    if (!this.#QueueCacheFetch(guildId)) return false;
    const QueueInstance = JerichoPlayer.#QueueCaches[`${guildId}`];
    if (JerichoPlayer.#QueueCaches[`${guildId}`].playing) JerichoPlayer.#QueueCaches[`${guildId}`].stop();
    QueueInstance.destroy();
    const Garbage = {};
    Garbage.Structure = QueueInstance;
    delete Garbage.Structure;
    JerichoPlayer.#QueueCaches[`${guildId}`] = undefined;
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
        true,
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
        true,
      );
    }
    return void null;
  }
}

module.exports = JerichoPlayer;
