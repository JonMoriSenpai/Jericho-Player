const { createAudioResource } = require('@discordjs/voice');
const TracksGen = require('./Tracks');
const VoiceUtils = require('../Utilities/VoiceUtils');

class StreamPacketGen {
  static #PacketsCache = {}

  constructor(Client, GuildId) {
    this.Client = Client;
    this.Channel = null;
    this.searches = null;
    this.tracks = null;
    this.TracksInstance = null;
    this.VoiceConnection = null;
    this.GuildId = GuildId;
  }

  async create(Query, VoiceChannel, StreamCreateOptions) {
    this.TracksInstance = new TracksGen(StreamCreateOptions.extractor, {
      IgnoreError: StreamCreateOptions.IgnoreError,
    });
    this.searches = await this.TracksInstance.fetch(Query, StreamCreateOptions);
    this.tracks = this.TracksInstance.songs;
    this.VoiceConnection = await VoiceUtils.join(this.Client, VoiceChannel, {
      force: true,
    });
    StreamPacketGen.#PacketsCache[`${this.GuildId}`] = this;
    return StreamPacketGen.StreamAudioResourceExtractor();
  }

  destroy(
    DisconnectChannelOptions = {
      destroy: true,
    },
  ) {
    VoiceUtils.disconnect(this.GuildId, DisconnectChannelOptions);
    const Garbage = {};
    Garbage.TrackInstance = this.TracksInstance;
    delete Garbage.TrackInstance;
  }

  remove(Index) {
    this.TracksInstance.remove(Index);
  }

  insert(Index, Query, StreamFetchOptions) {
    this.TracksInstance.insert(Index, Query, StreamFetchOptions);
  }

  static DestroyStreamPacket(
    GuildId,
    DisconnectChannelOptions = {
      destroy: true,
    },
  ) {
    if (!StreamPacketGen.#PacketsCache[`${GuildId}`]) { throw Error('No Stream packet was found'); }
    const StreamPacketInstance = StreamPacketGen.#PacketsCache[`${GuildId}`];
    StreamPacketInstance.destroy(GuildId, DisconnectChannelOptions);
    const GarbageCollector = {};
    GarbageCollector.TrackInstance = StreamPacketInstance;
    delete GarbageCollector.TrackInstance;
  }

  static StreamAudioResourceExtractor(
    TrackData,
    StreamPacketInstance,
    MetadataValue,
  ) {
    try {
      return createAudioResource(TrackData.stream, {
        inputType: TrackData.stream_type,
        metadata: {
          metadata: MetadataValue,
          TrackData,
          StreamPacketData: StreamPacketInstance,
        },
      });
    } catch (error) {
      return void null;
    }
  }
}

module.exports = StreamPacketGen;
