const {
  joinVoiceChannel,
  getVoiceConnection,
  VoiceConnectionStatus,
  entersState,
} = require('@discordjs/voice');

async function join(
  Client,
  Channel,
  JoinChannelOptions = {
    force: false,
  },
) {
  let VoiceConnection = getVoiceConnection(Channel.guild.id);
  if (VoiceConnection && !JoinChannelOptions.force) return VoiceConnection;

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
    Channel.guild.me.voice.setSuppressed(false).catch((err) => VoiceConnection);
    return VoiceConnection;
  }
  return VoiceConnection;
}

function disconnect(
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
        VoiceConnection.destroy(true);
        if (
          QueueInstance
          && QueueInstance.playing
          && !QueueInstance.destroyed
        ) {
          QueueInstance.MusicPlayer.stop();
          QueueInstance.StreamPacket.subscription.unsubscribe();
          return void QueueInstance.JerichoPlayer.emit(
            'QueueEnd',
            QueueInstance,
          );
        }
        return void null;
      }
      if (VoiceConnection) {
        if (
          QueueInstance
          && QueueInstance.playing
          && !QueueInstance.destroyed
        ) {
          QueueInstance.MusicPlayer.stop();
          QueueInstance.StreamPacket.subscription.unsubscribe();
          QueueInstance.JerichoPlayer.emit('QueueEnd', QueueInstance);
        }
        return void VoiceConnection.disconnect();
      }
      return void QueueInstance.JerichoPlayer.emit(
        'ConnectionError',
        VoiceConnection,
        guildId,
      );
    }, Timedout * 1000);
  }
  const VoiceConnection = getVoiceConnection(guildId);
  if (
    VoiceConnection
    && DisconnectChannelOptions
    && DisconnectChannelOptions.destroy
  ) {
    VoiceConnection.destroy(true);
    if (QueueInstance && QueueInstance.playing && !QueueInstance.destroyed) {
      QueueInstance.MusicPlayer.stop();
      QueueInstance.StreamPacket.subscription.unsubscribe();
      return void QueueInstance.JerichoPlayer.emit('QueueEnd', QueueInstance);
    }
    return void null;
  }
  if (VoiceConnection) {
    if (QueueInstance && QueueInstance.playing && !QueueInstance.destroyed) {
      QueueInstance.MusicPlayer.stop();
      QueueInstance.StreamPacket.subscription.unsubscribe();
      QueueInstance.JerichoPlayer.emit('QueueEnd', QueueInstance);
    }
    return void VoiceConnection.disconnect();
  }
  return void QueueInstance.JerichoPlayer.emit(
    'ConnectionError',
    VoiceConnection,
    guildId,
  );
}

module.exports = { join, disconnect };
