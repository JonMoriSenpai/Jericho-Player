const EventEmitter = require('events');
const { FFmpeg } = require('prism-media');
const Queue = require('./Queue-Handler.js');
const ClassUtils = require('../Utilities/Class-Utils');
const { join } = require('../Utilities/Voice-Utils');
const {
  DefaultJerichoPlayerOptions,
} = require('../../typings/types/interfaces');

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
        Proxy: undefined,
      },
      IgnoreError: true,
      LeaveOnEmpty: true,
      LeaveOnEnd: true,
      LeaveOnBotOnly: false,
      LeaveOnEmptyTimedout: 0,
      LeaveOnEndTimedout: 0,
      LeaveOnBotOnlyTimedout: 0,
    },
  ) {
    super();

    this.#__buildsandDepschecks(Client);
    this.Client = Client;
    this.JerichoPlayerOptions = ClassUtils.stablizingoptions(
      JerichoPlayerOptions,
      DefaultJerichoPlayerOptions,
    );
    this.Client.on('voiceStateUpdate', (OldVoiceState, NewVoiceState) => {
      const QueueInstance = JerichoPlayer.#QueueCacheFetch(
        (NewVoiceState ? NewVoiceState.guild.id : null)
          ?? (OldVoiceState ? OldVoiceState.guild.id : null),
      );
      const clientchecks = (member) => member.user.id === this.Client.user.id;
      if (
        !QueueInstance
        || (QueueInstance && QueueInstance.destroyed)
        || (QueueInstance && !QueueInstance.playing)
        || (NewVoiceState.channel
          && OldVoiceState.channel
          && OldVoiceState.channel.id === NewVoiceState.channel.id)
      ) {
        return void null;
      }
      if (
        OldVoiceState.channel
        && NewVoiceState.channel
        && OldVoiceState.channel.id !== NewVoiceState.channel.id
        && NewVoiceState.id === this.Client.user.id
      ) {
        JerichoPlayer.#QueueCaches[
          `${
            (NewVoiceState ? NewVoiceState.guild.id : null)
            ?? (OldVoiceState ? OldVoiceState.guild.id : null)
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
              (NewVoiceState ? NewVoiceState.guild.id : null)
              ?? (OldVoiceState ? OldVoiceState.guild.id : null)
            }`
          ],
          OldVoiceState.channel,
        );
        return void null;
      }
      if (
        NewVoiceState.channel
        && QueueInstance.StreamPacket
        && QueueInstance.StreamPacket.VoiceChannel
        && QueueInstance.StreamPacket.VoiceChannel.id
          === NewVoiceState.channel.id
        && NewVoiceState.id !== this.Client.user.id
      ) {
        JerichoPlayer.#TimedoutIds[`${QueueInstance.guildId}`] = JerichoPlayer
          .#TimedoutIds[`${QueueInstance.guildId}`]
          ? clearTimeout(JerichoPlayer.#TimedoutIds[`${QueueInstance.guildId}`])
          : null;
        return void null;
      }
      if (!NewVoiceState.channel && OldVoiceState.id === this.Client.user.id) {
        if (
          OldVoiceState.channel
          && OldVoiceState.channel.members
          && ((OldVoiceState.channel.members.size === 1
            && OldVoiceState.channel.members.some(clientchecks))
            || OldVoiceState.channel.members.size === 0)
        ) {
          this.emit('channelEmpty', QueueInstance, OldVoiceState.channel);
        }
        this.emit('botDisconnect', QueueInstance);
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
        Proxy: undefined,
      },
      IgnoreError: true,
      LeaveOnEmpty: true,
      LeaveOnEnd: true,
      LeaveOnBotOnly: false,
      LeaveOnEmptyTimedout: 0,
      LeaveOnEndTimedout: 0,
      LeaveOnBotOnlyTimedout: 0,
    },
  ) {
    if (
      !message
      || !(
        message
        && message.guild
        && message.guild.id
        && message.channel
        && message.channel.id
      )
    ) {
      throw Error(
        'Invalid Guild Message , Please Provide Correct Guild Message Correctly',
      );
    }
    QueueCreateOptions = ClassUtils.stablizingoptions(
      QueueCreateOptions,
      this.JerichoPlayerOptions,
    );
    const QueueInstance = JerichoPlayer.#QueueCacheFetch(message.guild.id, QueueCreateOptions)
      ?? new Queue(this.Client, message, QueueCreateOptions, this);
    return JerichoPlayer.#QueueCacheAdd(QueueInstance);
  }

  DeleteQueue(guildId) {
    if (
      !guildId
      || !(guildId && (typeof guildId === 'string' || typeof guildId === 'number'))
    ) {
      throw Error(
        'Invalid Guild Id , Please Provide Correct Guild Id Correctly',
      );
    }
    if (JerichoPlayer.#QueueCacheFetch(guildId)) {
      return void JerichoPlayer.#QueueCacheRemove(guildId);
    }
    return void this.emit('error', 'Destroyed Queue', undefined);
  }

  GetQueue(guildId) {
    if (
      !guildId
      || !(guildId && (typeof guildId === 'string' || typeof guildId === 'number'))
    ) {
      throw Error(
        'Invalid Guild Id , Please Provide Correct Guild Id Correctly',
      );
    }
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
    if (JerichoPlayer.#QueueCaches[`${guildId}`].playing) {
      JerichoPlayer.#QueueCaches[`${guildId}`].stop();
    }
    if (!QueueInstance.destroyed) QueueInstance.destroy();
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
      : undefined;
    if (
      QueueInstance.QueueOptions.LeaveOnEmpty
      && ((VoiceChannel.members.size === 1
        && VoiceChannel.members.some(clientchecks))
        || VoiceChannel.members.size === 0)
    ) {
      return QueueInstance.destroy(
        QueueInstance.QueueOptions.LeaveOnEmptyTimedout ?? 0,
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
      return QueueInstance.destroy(
        QueueInstance.QueueOptions.LeaveOnBotOnlyTimedout ?? 0,
      );
    }
    return void null;
  }

  #__buildsandDepschecks(Client) {
    let FmpeggGarbage;
    let LibopusGarbage;
    const MissingDeps = [' '];
    MissingDeps.push(
      '--[ Missing Dependencies from package.json | Do - "npm i packageName" ]--',
    );
    try {
      const GarbageInfo = FFmpeg.getInfo();
      FmpeggGarbage = !!`- version: ${GarbageInfo.version}`;
      LibopusGarbage = !!`- libopus: ${
        GarbageInfo.output.includes('--enable-libopus') ? 'yes' : 'no'
      }`;
    } catch (err) {
      LibopusGarbage = FmpeggGarbage = undefined;
    }
    !ClassUtils.ScanDeps('@discordjs/voice')
      ? MissingDeps.push(`${MissingDeps.length - 1})  "@discordjs/voice"`)
      : undefined;
    !ClassUtils.ScanDeps('prism-media')
      ? MissingDeps.push(`${MissingDeps.length - 1})  "prism-media"`)
      : undefined;

    !ClassUtils.ScanDeps('@discordjs/opus')
    && !ClassUtils.ScanDeps('opusscript')
      ? MissingDeps.push(
        `${MissingDeps.length - 1})  "@discordjs/opus" OR "opusscript"`,
      )
      : undefined;

    !ClassUtils.ScanDeps('tweetnacl')
    && !(ClassUtils.ScanDeps('libsodium-wrapper') && ClassUtils.ScanDeps('sodium'))
      ? MissingDeps.push(
        `${
          MissingDeps.length - 1
        })  "tweetnacl" OR ("libsodium-wrapper" And "sodium")`,
      )
      : undefined;

    !ClassUtils.ScanDeps('ffmpeg-static') && !(LibopusGarbage && FmpeggGarbage)
      ? MissingDeps.push(
        `${MissingDeps.length - 1})  "ffmpeg-static" OR "Ffmpeg Soft."`,
      )
      : undefined;

    !ClassUtils.ScanDeps('playdl-music-extractor')
    && !ClassUtils.ScanDeps('video-extractor')
      ? MissingDeps.push(
        `${
          MissingDeps.length - 1
        })  "playdl-music-extractor" OR "video-extractor"`,
      )
      : undefined;
    if (MissingDeps[2]) {
      setTimeout(() => {
        this.emit(
          'error',
          ['-'.repeat(50), ...MissingDeps, '-'.repeat(50)].join('\n'),
        );
      }, 2 * 1000);
    }
    if (!Client) {
      throw Error(
        'Invalid Discord Client has been Detected! | And get some Voice and Channel Intents too',
      );
    } else return true;
  }
}

module.exports = JerichoPlayer;
