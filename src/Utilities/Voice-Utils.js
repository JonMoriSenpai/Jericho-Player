const {
  joinVoiceChannel,
  getVoiceConnection,
  VoiceConnectionStatus,
  entersState,
} = require('@discordjs/voice');

class VoiceUtils {
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
            QueueInstance.StreamPacket.subscription.unsubscribe();
          }
          return void VoiceConnection.destroy(true);
        }
        if (VoiceConnection) {
          if (QueueInstance && !QueueInstance.destroyed) {
            QueueInstance.MusicPlayer.stop();
            QueueInstance.StreamPacket.subscription.unsubscribe();
          }
          return void VoiceConnection.disconnect();
        }
        return void QueueInstance.JerichoPlayer.emit(
          'connectionError',
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
        QueueInstance.StreamPacket.subscription.unsubscribe();
      }
      return void VoiceConnection.destroy(true);
    }
    if (VoiceConnection) {
      if (QueueInstance && !QueueInstance.destroyed) {
        QueueInstance.MusicPlayer.stop();
        QueueInstance.StreamPacket.subscription.unsubscribe();
      }
      return void VoiceConnection.disconnect();
    }
    return void QueueInstance.JerichoPlayer.emit(
      'connectionError',
      QueueInstance.JerichoPlayer.GetQueue(QueueInstance.guildId),
      VoiceConnection,
      guildId,
    );
  }
}

module.exports = VoiceUtils;
