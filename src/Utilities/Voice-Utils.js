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
  GuildId,
  DisconnectChannelOptions = {
    destroy: true,
  },
  Timedout = 0,
  JerichoPlayerWorkload = false,
) {
  if (Timedout && Timedout > 0) {
    return setTimeout(() => {
      const VoiceConnection = getVoiceConnection(GuildId);
      if (
        VoiceConnection
        && DisconnectChannelOptions
        && DisconnectChannelOptions.destroy
      ) {
        VoiceConnection.destroy(true);
        if (JerichoPlayerWorkload) throw Error('Queue is Ended and Bot has been Disconnected');
      }
      if (VoiceConnection) {
        if (JerichoPlayerWorkload) throw Error('Queue is Ended and Bot has been Disconnected');
        VoiceConnection.disconnect();
      }
      throw Error('Voice Connection is not Found to disconnect/destroy');
    }, Timedout * 1000);
  }
  const VoiceConnection = getVoiceConnection(GuildId);
  if (
    VoiceConnection
    && DisconnectChannelOptions
    && DisconnectChannelOptions.destroy
  ) {
    VoiceConnection.destroy(true);
    if (JerichoPlayerWorkload) throw Error('Queue is Ended and Bot has been Disconnected');
  }
  if (VoiceConnection) {
    if (JerichoPlayerWorkload) throw Error('Queue is Ended and Bot has been Disconnected');
    VoiceConnection.disconnect();
  }

  throw Error('Voice Connection is not Found to disconnect/destroy');
}

module.exports = { join, disconnect };
