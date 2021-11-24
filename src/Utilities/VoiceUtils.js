const {
  joinVoiceChannel,
  getVoiceConnection,
  VoiceConnectionStatus,
  entersState,
  VoiceConnection,
} = require('@discordjs/voice');
const { Client, VoiceChannel, StageChannel } = require('discord.js');
const {
  DefaultDisconnectChannelOptions,
  DefaultJoinChannelOptions,
} = require('../types/interfaces');

class VoiceUtils {
  /**
   * @constructor
   */
  constructor() { }

  /**
   * Join Channel function for Voice Utils with Client and Channel and JoinChannelOptions Credentials
   * @param {Client} Client Discord Client Instance
   * @param {VoiceChannel|StageChannel} Channel Guild Voice Channel | Guild Stage Channel
   * @param {DefaultJoinChannelOptions|void} JoinChannelOptions Options for Joining Voice Channel
   * @returns {Promise<VoiceConnection>|void} Returns Voice Connection Made by the
   */
  static async join(
    Client,
    Channel,
    JoinChannelOptions = {
      force: false,
    },
  ) {
    if (
      getVoiceConnection(Channel.guild.id)
      && getVoiceConnection(Channel.guild.id).state
      && getVoiceConnection(Channel.guild.id).state.status !== VoiceConnectionStatus.Destroyed
      && getVoiceConnection(Channel.guild.id).state.status !== VoiceConnectionStatus.Disconnected
      && !JoinChannelOptions.force
    ) { return getVoiceConnection(Channel.guild.id); }

    joinVoiceChannel({
      channelId: Channel.id,
      guildId: Channel.guild.id,
      adapterCreator: Channel.guild.voiceAdapterCreator,
    });
    await entersState(getVoiceConnection(Channel.guild.id), VoiceConnectionStatus.Ready, 30e3);
    Channel = Client.channels.cache.get(`${Channel.id}`)
      ?? (await Client.channels.fetch(`${Channel.id}`));
    if (
      Channel.guild.me
      && Channel.guild.me.voice
      && Channel.type === 'GUILD_STAGE_VOICE'
    ) {
      Channel.guild.me.voice
        .setSuppressed(false)
        .catch((err) => getVoiceConnection(Channel.guild.id));
      return getVoiceConnection(Channel.guild.id);
    }
    return getVoiceConnection(Channel.guild.id);
  }

  /**
   * Disconnect Voice Channel and even destroy Voice Connection if Option.destroy =? true
   * @param {String|Number} guildId Guild's id as Snowflake
   * @param {DefaultDisconnectChannelOptions|void} DisconnectChannelOptions Disconnect Options for Connection
   * @param {Number|String|void} Timedout Nodejs Timedout duration if delay has been issues
   * @param {Queue} QueueInstance Queue Instance for fetching Player and Stream Packet
   * @returns {void|Number|String} Returns Nodejs Timedout for Delays and undefined on completion or errors
   */

  static disconnect(
    guildId,
    DisconnectChannelOptions = {
      destroy: true,
    },
    Timedout = 0,
    QueueInstance = undefined,
  ) {
    if (Timedout && Timedout > 0) {
      return setTimeout(() => {
        if (
          getVoiceConnection(guildId)
          && DisconnectChannelOptions
          && DisconnectChannelOptions.destroy
        ) {
          if (QueueInstance && !QueueInstance.destroyed) {
            QueueInstance.MusicPlayer.stop();
            QueueInstance.StreamPacket.subscription
              ? QueueInstance.StreamPacket.subscription.unsubscribe()
              : undefined;
          }
          return void getVoiceConnection(guildId).destroy(true);
        }
        if (getVoiceConnection(guildId)) {
          if (QueueInstance && !QueueInstance.destroyed) {
            QueueInstance.MusicPlayer.stop();
            QueueInstance.StreamPacket.subscription
              ? QueueInstance.StreamPacket.subscription.unsubscribe()
              : undefined;
          }
          return void getVoiceConnection(guildId).disconnect();
        }
        return void QueueInstance.Player.emit(
          'connectionError',
          "Voice Connection Can't be destroyed",
          QueueInstance.Player.GetQueue(QueueInstance.guildId),
          getVoiceConnection(guildId),
          guildId,
        );
      }, Number(Timedout) * 1000);
    }
    if (
      getVoiceConnection(guildId)
      && DisconnectChannelOptions
      && DisconnectChannelOptions.destroy
    ) {
      if (QueueInstance && !QueueInstance.destroyed) {
        QueueInstance.MusicPlayer.stop();
        QueueInstance.StreamPacket.subscription
          ? QueueInstance.StreamPacket.subscription.unsubscribe()
          : undefined;
      }
      return void getVoiceConnection(guildId).destroy(true);
    }
    if (getVoiceConnection(guildId)) {
      if (QueueInstance && !QueueInstance.destroyed) {
        QueueInstance.MusicPlayer.stop();
        QueueInstance.StreamPacket.subscription
          ? QueueInstance.StreamPacket.subscription.unsubscribe()
          : undefined;
      }
      return void getVoiceConnection(guildId).disconnect();
    }
    return void QueueInstance.Player.emit(
      'connectionError',
      "Voice Connection Can't be destroyed",
      QueueInstance.Player.GetQueue(QueueInstance.guildId),
      getVoiceConnection(guildId),
      guildId,
    );
  }
}

module.exports = VoiceUtils;
