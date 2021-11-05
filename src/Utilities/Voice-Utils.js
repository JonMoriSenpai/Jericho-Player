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
   * @method join() -> Join Channel function for Voice Utils with Client and Channel and JoinChannelOptions Credentials
   * @param {Client} Client Discord Client Instance
   * @param {VoiceChannel|StageChannel} Channel Guild Voice Channel | Guild Stage Channel
   * @param {DefaultJoinChannelOptions<Object>|undefined} JoinChannelOptions Options for Joining Voice Channel
   * @returns {Promise<VoiceConnection>|undefined} Returns Voice Connection Made by the
   */
  static async join(
    Client,
    Channel,
    JoinChannelOptions = {
      force: false,
    },
  ) {
    let VoiceConnection = getVoiceConnection(Channel.guild.id);
    if (
      VoiceConnection
      && VoiceConnection.state
      && VoiceConnection.state.status !== VoiceConnectionStatus.Destroyed
      && VoiceConnection.state.status !== VoiceConnectionStatus.Disconnected
      && !JoinChannelOptions.force
    ) return VoiceConnection;

    VoiceConnection = joinVoiceChannel({
      channelId: Channel.id,
      guildId: Channel.guild.id,
      adapterCreator: Channel.guild.voiceAdapterCreator,
    });
    await entersState(VoiceConnection, VoiceConnectionStatus.Ready, 30e3);
    Channel = Client.channels.cache.get(`${Channel.id}`)
      ?? (await Client.channels.fetch(`${Channel.id}`));
    if (
      Channel.guild.me
      && Channel.guild.me.voice
      && Channel.type === 'GUILD_STAGE_VOICE'
    ) {
      Channel.guild.me.voice
        .setSuppressed(false)
        .catch((err) => VoiceConnection);
      return VoiceConnection;
    }
    return VoiceConnection;
  }

  /**
   * @method disconnect() -> Disconnect Voice Channel and even destroy Voice Connection if Option.destroy =? true
   * @param {Guild["id"]|String|Number} guildId Guild's id as Snowflake
   * @param {DefaultDisconnectChannelOptions<Object>|undefined} DisconnectChannelOptions Disconnect Options for Connection
   * @param {Number|String|undefined} Timedout Nodejs Timedout duration if delay has been issues
   * @param {Queue} QueueInstance Queue Instance for fetching Player and Stream Packet
   * @returns {undefined|Number|String} Returns Nodejs Timedout for Delays and undefined on completion or errors
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
        const VoiceConnection = getVoiceConnection(guildId);
        if (
          VoiceConnection
          && DisconnectChannelOptions
          && DisconnectChannelOptions.destroy
        ) {
          if (QueueInstance && !QueueInstance.destroyed) {
            QueueInstance.MusicPlayer.stop();
            QueueInstance.StreamPacket.subscription ? QueueInstance.StreamPacket.subscription.unsubscribe() : undefined;
          }
          return void VoiceConnection.destroy(true);
        }
        if (VoiceConnection) {
          if (QueueInstance && !QueueInstance.destroyed) {
            QueueInstance.MusicPlayer.stop();
            QueueInstance.StreamPacket.subscription ? QueueInstance.StreamPacket.subscription.unsubscribe() : undefined;
          }
          return void VoiceConnection.disconnect();
        }
        return void QueueInstance.JerichoPlayer.emit(
          'connectionError',
          "Voice Connection Can't be destroyed",
          QueueInstance.JerichoPlayer.GetQueue(QueueInstance.guildId),
          VoiceConnection,
          guildId,
        );
      }, Number(Timedout) * 1000);
    }
    const VoiceConnection = getVoiceConnection(guildId);
    if (
      VoiceConnection
      && DisconnectChannelOptions
      && DisconnectChannelOptions.destroy
    ) {
      if (QueueInstance && !QueueInstance.destroyed) {
        QueueInstance.MusicPlayer.stop();
        QueueInstance.StreamPacket.subscription ? QueueInstance.StreamPacket.subscription.unsubscribe() : undefined;
      }
      return void VoiceConnection.destroy(true);
    }
    if (VoiceConnection) {
      if (QueueInstance && !QueueInstance.destroyed) {
        QueueInstance.MusicPlayer.stop();
        QueueInstance.StreamPacket.subscription ? QueueInstance.StreamPacket.subscription.unsubscribe() : undefined;
      }
      return void VoiceConnection.disconnect();
    }
    return void QueueInstance.JerichoPlayer.emit(
      'connectionError',
      "Voice Connection Can't be destroyed",
      QueueInstance.JerichoPlayer.GetQueue(QueueInstance.guildId),
      VoiceConnection,
      guildId,
    );
  }
}

module.exports = VoiceUtils;
