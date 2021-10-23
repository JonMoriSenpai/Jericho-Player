const { createAudioResource, StreamType } = require('@discordjs/voice');
const TracksGen = require('./Tracks');
const VoiceUtils = require('../Utilities/Voice-Utils');
const ClassUtils = require('../Utilities/Class-Utils');

class StreamPacketGen {
  constructor(
    Client,
    guildId,
    MetadataValue = null,
    extractor = 'play-dl',
    ExtractorStreamOptions = {
      Limit: 1,
      Quality: 'high',
      Proxy: null,
    },
    JerichoPlayer = undefined,
    IgnoreError = true,
  ) {
    this.Client = Client;
    this.VoiceChannel = null;
    this.extractor = extractor;
    this.searches = [];
    this.tracks = [];
    this.VoiceConnection = null;
    this.metadata = MetadataValue;
    this.subscription = undefined;
    this.guildId = guildId;
    this.ExtractorStreamOptions = ExtractorStreamOptions;
    this.IgnoreError = IgnoreError ?? true;
    this.JerichoPlayer = JerichoPlayer;
  }

  async create(
    Query,
    VoiceChannel,
    StreamCreateOptions = {
      IgnoreError: true,
      ExtractorStreamOptions: {
        Limit: 1,
        Quality: 'high',
        Proxy: null,
      },
    },
    extractor = 'play-dl',
  ) {
    StreamCreateOptions.ExtractorStreamOptions = ClassUtils.stablizingoptions(
      StreamCreateOptions.ExtractorStreamOptions,
      this.ExtractorStreamOptions,
    );
    const Chunks = await TracksGen.fetch(
      Query,
      StreamCreateOptions,
      extractor,
      this.tracks.length,
    );
    this.searches = this.searches.concat(Chunks.tracks);
    this.tracks = this.tracks.concat(Chunks.streamdatas);
    this.JerichoPlayer.emit(
      'TracksAdd',
      this.JerichoPlayer.getQueue(this.guildId),
      this.searches,
    );
    if (VoiceChannel) {
      this.VoiceChannel = !this.VoiceChannel
        || !this.VoiceConnection
        || (this.VoiceChannel && VoiceChannel.id !== this.VoiceChannel.id)
        ? VoiceChannel
        : this.VoiceChannel;
      this.VoiceConnection = !this.VoiceChannel
        || !this.VoiceConnection
        || (this.VoiceChannel && VoiceChannel.id !== this.VoiceChannel.id)
        ? await VoiceUtils.join(this.Client, VoiceChannel, {
          force: true,
        })
        : this.VoiceConnection;
    } else if (!VoiceChannel && !this.VoiceChannel && !this.VoiceConnection) {
      this.JerichoPlayer.emit(
        'ConnectionError',
        this.VoiceConnection,
        this.guildId,
      );
    }

    return this;
  }

  remove(Index = 0, Amount = 1) {
    if (Index <= -1) {
      this.JerichoPlayer.emit(
        'error',
        'Invalid Index',
        this.JerichoPlayer.getQueue(this.guildId),
        Index,
      );
    }
    this.tracks.splice(Index, Amount);
    this.searches.splice(Index, Amount);
    return true;
  }

  async insert(
    Index = -1,
    Query,
    StreamFetchOptions = {
      IgnoreError: true,
      ExtractorStreamOptions: {
        Limit: 1,
        Quality: 'high',
        Proxy: null,
      },
    },
    extractor,
  ) {
    StreamFetchOptions.ExtractorStreamOptions = ClassUtils.stablizingoptions(
      StreamFetchOptions.ExtractorStreamOptions,
      this.ExtractorStreamOptions,
    );
    const Chunk = await TracksGen.fetch(
      Query,
      StreamFetchOptions,
      extractor ?? this.extractor,
      this.tracks.length,
    );
    if (Index <= -1) {
      this.JerichoPlayer.emit(
        'error',
        'Invalid Index',
        this.JerichoPlayer.getQueue(this.guildId),
        Index,
      );
    }
    this.searches = this.searches.concat(Chunk.tracks);
    this.tracks = this.tracks.concat(Chunk.streamdatas);
    return true;
  }

  async StreamAudioResourceExtractor(Track) {
    try {
      return createAudioResource(Track.stream, {
        inputType: Track.stream_type ?? StreamType.Arbitrary,
        metadata: {
          metadata: this.metadata,
          Track,
        },
      });
    } catch (error) {
      return void null;
    }
  }
}

module.exports = StreamPacketGen;
