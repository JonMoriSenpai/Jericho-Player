const { createAudioResource } = require('@discordjs/voice')
const TracksGen = require('./Tracks')
const VoiceUtils = require('../Utilities/VoiceUtils')

class StreamPacketGen {
  static #PacketsCache = {}

  constructor(Client, GuildId, MetadataValue = null, extractor = 'play-dl') {
    this.Client = Client
    this.VoiceChannel = null
    this.extractor = extractor
    this.searches = []
    this.tracks = []
    this.VoiceConnection = null
    this.metadata = MetadataValue
    this.GuildId = GuildId
  }

  async create(
    Query,
    VoiceChannel,
    StreamCreateOptions = {
      IgnoreError: true,
    },
    extractor = 'play-dl',
  ) {
    var Chunks = await TracksGen.fetch(
      Query,
      StreamCreateOptions,
      extractor,
      this.tracks.length,
    )
    this.searches = Chunks.tracks
    this.tracks = Chunks.streamdatas
    this.VoiceChannel = VoiceChannel
    this.VoiceConnection = await VoiceUtils.join(this.Client, VoiceChannel, {
      force: true,
    })
    StreamPacketGen.#PacketsCache[`${this.GuildId}`] = this
    return void null
  }

  destroy(
    DisconnectChannelOptions = {
      destroy: true,
    },
  ) {
    return VoiceUtils.disconnect(this.GuildId, DisconnectChannelOptions)
  }

  remove(Index = 0, Amount = 1) {
    if (Index <= -1) throw Error(`Invalid Index Value is detected !`)
    this.tracks.splice(Index, Amount)
    this.searches.splice(Index, Amount)
    return true
  }

  async insert(Index = -1, Query, StreamFetchOptions, extractor) {
    var Chunk = await TracksGen.fetch(
      Query,
      StreamFetchOptions,
      extractor ?? this.extractor,
      this.tracks.length,
    )
    if (Index <= -1) throw Error(`Invalid Index Value is detected !`)
    this.tracks.splice(Index, 0, Chunk.streamdatas)
    this.searches.splice(Index, 0, Chunk.tracks)
    return true
  }

  static DestroyStreamPacket(
    GuildId,
    DisconnectChannelOptions = {
      destroy: true,
    },
  ) {
    if (!StreamPacketGen.#PacketsCache[`${GuildId}`]) {
      throw Error('No Stream packet was found')
    }
    const StreamPacketInstance = StreamPacketGen.#PacketsCache[`${GuildId}`]
    return StreamPacketInstance.destroy(GuildId, DisconnectChannelOptions)
  }

  async StreamAudioResourceExtractor(Track) {
    try {
      return createAudioResource(Track.stream, {
        inputType: Track.stream_type,
        metadata: {
          metadata: this.metadata,
          Track,
        },
      })
    } catch (error) {
      return void null
    }
  }
}

module.exports = StreamPacketGen
