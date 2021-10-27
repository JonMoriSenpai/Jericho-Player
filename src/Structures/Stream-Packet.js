const { createAudioResource, StreamType } = require('@discordjs/voice');
const TracksGen = require('./Tracks');
const VoiceUtils = require('../Utilities/Voice-Utils');
const ClassUtils = require('../Utilities/Class-Utils');
const { DefaultExtractorStreamOptions } = require('../types/interfaces');

class StreamPacketGen {
  constructor(
    Client,
    guildId,
    MetadataValue = null,
    extractor = 'play-dl',
    ExtractorStreamOptions = {
      Limit: 1,
      Quality: 'high',
      Cookies: undefined,
      YoutubeDLCookiesFilePath: undefined,
      Proxy: undefined,
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
    this.ExtractorStreamOptions = ExtractorStreamOptions = ClassUtils.stablizingoptions(
      ExtractorStreamOptions,
      DefaultExtractorStreamOptions,
    );
    this.IgnoreError = IgnoreError ?? true;
    this.JerichoPlayer = JerichoPlayer;
    this.volume = 0.095;
    this.AudioResource = undefined;
    this.previousTracks = [];
    this.TimedoutId = undefined;
    this.TrackTimeStamp = { Starting: undefined, Paused: undefined };
  }

  async create(
    Query,
    VoiceChannel,
    StreamCreateOptions = {
      IgnoreError: true,
      ExtractorStreamOptions: {
        Limit: 1,
        Quality: 'high',
        Cookies: undefined,
        YoutubeDLCookiesFilePath: undefined,
        Proxy: undefined,
      },
    },
    extractor = 'play-dl',
    requestedBy = undefined,
  ) {
    StreamCreateOptions.ExtractorStreamOptions = ClassUtils.stablizingoptions(
      StreamCreateOptions.ExtractorStreamOptions,
      this.ExtractorStreamOptions,
    );
    const Chunks = await TracksGen.fetch(
      Query,
      requestedBy ?? undefined,
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
        this.JerichoPlayer.GetQueue(this.guildId),
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
        Cookies: undefined,
        YoutubeDLCookiesFilePath: undefined,
        Proxy: undefined,
      },
    },
    extractor,
    requestedBy = undefined,
  ) {
    StreamFetchOptions.ExtractorStreamOptions = ClassUtils.stablizingoptions(
      StreamFetchOptions.ExtractorStreamOptions,
      this.ExtractorStreamOptions,
    );
    if (!this.VoiceChannel && !this.VoiceConnection) {
      return void this.JerichoPlayer.emit(
        'error',
        'Invalid Connection',
        this.VoiceConnection,
        this.guildId,
      );
    }
    if (Number(Index) <= -1 && Number(Index) >= this.searches.length) {
      return void this.JerichoPlayer.emit(
        'error',
        'Invalid Index',
        this.JerichoPlayer.GetQueue(this.guildId),
        Number(Index),
      );
    }
    const Chunk = await TracksGen.fetch(
      Query,
      requestedBy ?? undefined,
      StreamFetchOptions,
      extractor ?? this.extractor,
      this.tracks.length > 0
        ? Number(this.tracks[this.tracks.length - 1].Id)
        : 0,
    );
    if (Chunk.error) {
      return void this.JerichoPlayer.emit(
        'error',
        Chunk.error,
        this.JerichoPlayer.GetQueue(this.guildId),
      );
    }
    Chunk.playlist === true || Chunk.playlist
      ? this.JerichoPlayer.emit(
        'playlistAdd',
        this.JerichoPlayer.GetQueue(this.guildId),
        Chunk.tracks,
        'insert',
      )
      : undefined;
    this.JerichoPlayer.emit(
      'tracksAdd',
      this.JerichoPlayer.GetQueue(this.guildId),
      Chunk.tracks,
      'insert',
    );
    this.#__HandleInsertion(Number(Index) ?? -1, Chunk);
    this.JerichoPlayer.emit(
      'tracksAdd',
      this.JerichoPlayer.GetQueue(this.guildId),
      Chunk.tracks,
    );
    return this;
  }

  async back(
    TracksBackwardIndex,
    requestedBy,
    StreamCreateOptions = {
      IgnoreError: true,
      ExtractorStreamOptions: {
        Limit: 1,
        Quality: 'high',
        Cookies: undefined,
        YoutubeDLCookiesFilePath: undefined,
        Proxy: undefined,
      },
    },
    forceback,
  ) {
    if (
      !this.JerichoPlayer.GetQueue(this.guildId)
      || (this.JerichoPlayer.GetQueue(this.guildId)
        && this.JerichoPlayer.GetQueue(this.guildId).destroyed)
    ) return void null;
    StreamCreateOptions.ExtractorStreamOptions = ClassUtils.stablizingoptions(
      StreamCreateOptions.ExtractorStreamOptions,
      this.ExtractorStreamOptions,
    );
    const Chunks = await TracksGen.fetch(
      this.previousTracks[this.previousTracks.length - TracksBackwardIndex - 1]
        .url,
      requestedBy
        ?? this.previousTracks[
          this.previousTracks.length - TracksBackwardIndex - 1
        ].requestedBy
        ?? undefined,
      StreamCreateOptions,
      StreamCreateOptions.extractor,
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

    this.tracks.splice(forceback ? 1 : 0, 0, Chunks.streamdatas[0]);
    this.searches.splice(forceback ? 1 : 0, 0, Chunks.tracks[0]);
    forceback ? this.searches.splice(2, 0, this.searches[0]) : undefined;
    forceback ? this.tracks.splice(2, 0, this.tracks[0]) : undefined;
    this.previousTracks.splice(
      this.previousTracks.length - TracksBackwardIndex - 1,
      1,
    );
    forceback ? this.JerichoPlayer.GetQueue(this.guildId).skip() : undefined;
    return true;
  }

  async StreamAudioResourceExtractor(Track) {
    try {
      const AudioResource = createAudioResource(Track.stream, {
        inputType: Track.stream_type ?? StreamType.Arbitrary,
        metadata: {
          metadata: this.metadata,
          Track,
        },
        inlineVolume: true,
      });
      this.AudioResource = AudioResource;
      AudioResource.volume.setVolume(this.volume ?? 0.095);
      return this.AudioResource;
    } catch (error) {
      this.AudioResource = undefined;
      return void this.JerichoPlayer.emit(
        'connectionError',
        this.JerichoPlayer.GetQueue(this.guildId),
        this.VoiceConnection,
        this.guildId,
      );
    }
  }

  HumanTimeConversion(Type1 = undefined, Type2 = undefined) {
    if (Type1) {
      const DurationMilliSeconds = Type1 / 1000;
      let ProcessedString = '';
      for (
        let DurationArray = [
            [Math.floor(DurationMilliSeconds / 31536e3), 'Years'],
            [Math.floor((DurationMilliSeconds % 31536e3) / 86400), 'Days'],
            [
              Math.floor(((DurationMilliSeconds % 31536e3) % 86400) / 3600),
              'Hours',
            ],
            [
              Math.floor(
                (((DurationMilliSeconds % 31536e3) % 86400) % 3600) / 60,
              ),
              'Minutes',
            ],
            [
              Math.floor(
                (((DurationMilliSeconds % 31536e3) % 86400) % 3600) % 60,
              ),
              'Seconds',
            ],
          ],
          SideArray = 0,
          GarbageValue = DurationArray.length;
        SideArray < GarbageValue;
        SideArray++
      ) {
        DurationArray[SideArray][0] !== 0
          && (ProcessedString += ` ${DurationArray[SideArray][0]} ${
            DurationArray[SideArray][0] === 1
              ? DurationArray[SideArray][1].substr(
                0,
                DurationArray[SideArray][1].length - 1,
              )
              : DurationArray[SideArray][1]
          }`);
      }
      return ProcessedString.trim();
    }
    if (Type2) {
      const TimeData = new Date(Type2.Time);
      const days = TimeData.getUTCDate() - 1;
      const hours = TimeData.getUTCHours();
      const minutes = TimeData.getUTCMinutes();
      const seconds = TimeData.getUTCSeconds();
      const milliseconds = TimeData.getUTCMilliseconds();

      const TimeString = [];
      if (days) TimeString.push(days);
      if (hours && !Type2.ignore.includes('hour')) TimeString.push(hours < 10 && days > 0 ? `0${hours}` : hours);
      !Type2.ignore.includes('min')
        ? TimeString.push(minutes < 10 && hours > 0 ? `0${minutes}` : minutes)
        : undefined;
      !Type2.ignore.includes('sec')
        ? TimeString.push(seconds < 10 && minutes > 0 ? `0${seconds}` : seconds)
        : undefined;
      !Type2.ignore.includes('milliseconds')
        ? TimeString.push(
          milliseconds < 10 && seconds > 0
            ? `0${milliseconds}`
            : milliseconds,
        )
        : undefined;
      return TimeString.join(':');
    }
    return '0 Seconds';
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
}

module.exports = StreamPacketGen;
