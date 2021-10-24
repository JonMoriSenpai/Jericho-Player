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
      this.tracks.length > 0
        ? Number(this.tracks[this.tracks.length - 1].Id)
        : 0,
    );
    if (Chunks.error) {
      return void this.JerichoPlayer.emit(
        'error',
        Chunks.error,
        this.JerichoPlayer.GetQueue(this.guildId),
      );
    }
    this.searches = this.searches.concat(Chunks.tracks);
    this.tracks = this.tracks.concat(Chunks.streamdatas);
    Chunks.playlist === true || Chunks.playlist
      ? this.JerichoPlayer.emit(
        'playlistAdd',
        this.JerichoPlayer.GetQueue(this.guildId),
        Chunks.tracks,
      )
      : undefined;
    this.JerichoPlayer.emit(
      'tracksAdd',
      this.JerichoPlayer.GetQueue(this.guildId),
      Chunks.tracks,
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
      return void this.JerichoPlayer.emit(
        'connectionError',
        this.VoiceConnection,
        this.guildId,
      );
    }

    return this;
  }

  remove(Index = -1, Amount = 1) {
    this.tracks.splice(Index, Amount);
    this.searches.splice(Index, Amount);
    return this;
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
      this.tracks.length > 0
        ? Number(this.tracks[this.tracks.length - 1].Id)
        : 0,
    );
    if (Number(Index) < -1) {
      return void this.JerichoPlayer.emit(
        'error',
        'Invalid Index',
        this.JerichoPlayer.GetQueue(this.guildId),
        Number(Index),
      );
    }
    this.#__HandleInsertion(Number(Index) ?? -1, Chunk);
    this.JerichoPlayer.emit(
      'tracksAdd',
      this.JerichoPlayer.GetQueue(this.guildId),
      Chunk.tracks,
    );
    return this;
  }

  #__HandleInsertion(Index = -1, Chunk) {
    if (!Index || (Index && Index < 0)) {
      this.searches = this.searches.concat(Chunk.tracks);
      this.tracks = this.tracks.concat(Chunk.streamdatas);
    } else {
      let GarbageFirstPhase = this.searches.splice(0, Index);
      let GarbageSecondPhase = GarbageFirstPhase.concat(Chunk.tracks);
      this.searches = GarbageSecondPhase.concat(this.searches);
      GarbageFirstPhase = this.tracks.splice(0, Index);
      GarbageSecondPhase = GarbageFirstPhase.concat(Chunk.streamdatas);
      this.tracks = GarbageSecondPhase.concat(this.tracks);
    }
    return void null;
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
