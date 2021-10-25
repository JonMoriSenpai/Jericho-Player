const {
  createAudioPlayer,
  AudioPlayerStatus,
  entersState,
  NoSubscriberBehavior,
} = require('@discordjs/voice');
const StreamPacketGen = require('../Structures/Stream-Packet');
const ClassUtils = require('../Utilities/Class-Utils');
const { disconnect } = require('../Utilities/Voice-Utils');
const { DefaultQueueCreateOptions } = require('../types/interfaces');

class Queue {
  static #TimedoutIds = {}

  constructor(
    Client,
    message,
    QueueOptions = {
      extractor: 'play-dl',
      metadata: null,
      ExtractorStreamOptions: {
        Limit: 1,
        Quality: 'high',
        Proxy: undefined,
      },
      IgnoreError: true,
      LeaveOnEmpty: true,
      LeaveOnEnd: true,
      LeaveOnBotOnly: false,
      LeaveOnEmptyTimedout: 0,
      LeaveOnEndTimedout: 0,
      LeaveOnBotOnlyTimedout: 0,
    },
    JerichoPlayer = undefined,
  ) {
    this.Client = Client;
    this.QueueOptions = QueueOptions = ClassUtils.stablizingoptions(
      QueueOptions,
      DefaultQueueCreateOptions,
    );
    this.StreamPacket = new StreamPacketGen(
      Client,
      message.guild.id,
      QueueOptions.metadata,
      QueueOptions.extractor,
      QueueOptions.ExtractorStreamOptions,
      JerichoPlayer,
    );
    this.message = message;
    this.metadata = QueueOptions.metadata;
    this.tracks = [];
    this.guildId = message.guild.id;
    this.destroyed = false;
    this.MusicPlayer = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
      },
    });
    this.JerichoPlayer = JerichoPlayer;

    this.MusicPlayer.on('stateChange', (oldState, newState) => {
      if (newState.status === AudioPlayerStatus.Idle) {
        if (
          this.StreamPacket
          && this.track
          && this.tracks[0]
          && this.StreamPacket.AudioResource
        ) {
          this.StreamPacket.AudioResource = undefined;
          this.JerichoPlayer.emit('trackEnd', this, this.tracks[0]);
        }
        if (!this.destroyed) this.#__CleaningTrackMess();
        this.#__ResourcePlay();
      } else if (newState && newState.status === AudioPlayerStatus.Playing) {
        Queue.#TimedoutIds[`${this.guildId}`] = undefined;
      }
    });
  }

  async play(
    Query,
    VoiceChannel,
    message,
    PlayOptions = {
      IgnoreError: true,
      extractor: 'play-dl',
      metadata: this.metadata,
      ExtractorStreamOptions: {
        Limit: 1,
        Quality: 'high',
        Proxy: undefined,
      },
    },
  ) {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (
      !VoiceChannel
      || !(
        VoiceChannel
        && VoiceChannel.id
        && VoiceChannel.guild
        && VoiceChannel.guild.id
        && VoiceChannel.type
        && ['guild_voice', 'guild_stage_voice'].includes(
          VoiceChannel.type.toLowerCase().trim(),
        )
      )
    ) {
      throw Error(
        'Invalid Guild VoiceChannel , Please Provide Correct Guild VoiceChannel Correctly',
      );
    }
    PlayOptions = ClassUtils.stablizingoptions(PlayOptions, this.QueueOptions);
    this.StreamPacket = this.StreamPacket
      ? this.StreamPacket
      : new StreamPacketGen(
        this.Client,
        this.guildId,
        PlayOptions.metadata,
        PlayOptions.extractor,
        PlayOptions.ExtractorStreamOptions,
        this.JerichoPlayer,
      );
    this.StreamPacket = (await this.StreamPacket.create(
      Query,
      VoiceChannel,
      PlayOptions,
      PlayOptions.extractor,
      message ? message.author : undefined ?? undefined,
    )) ?? this.StreamPacket;
    this.tracks = this.StreamPacket.searches;
    if (!this.playing && !this.paused && this.tracks && this.tracks[0]) await this.#__ResourcePlay();
    return true;
  }

  skip(TrackIndex) {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (
      TrackIndex
      && !(typeof TrackIndex === 'number' || typeof TrackIndex === 'string')
    ) {
      return void this.JerichoPlayer.emit(
        'error',
        'Invalid Index',
        this,
        TrackIndex,
      );
    }
    if (!this.playing || (this.playing && !this.StreamPacket.tracks[1])) return void this.JerichoPlayer.emit('error', 'Empty Queue', this);
    TrackIndex
    && Number(TrackIndex) > 1
    && Number(TrackIndex) < this.tracks.length
      ? this.#__CleaningTrackMess(
        undefined,
        Number(TrackIndex) - 1 ?? undefined,
      )
      : undefined;
    this.MusicPlayer.stop();
    return true;
  }

  stop() {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (!this.playing) return void this.JerichoPlayer.emit('error', 'Not Playing', this);
    if (!this.StreamPacket.tracks[0]) return void this.JerichoPlayer.emit('error', 'Empty Queue', this);
    this.#__CleaningTrackMess(
      0,
      (this.StreamPacket.tracks.length > 1
        ? this.StreamPacket.tracks.length
        : undefined) ?? undefined,
    );
    this.MusicPlayer.stop();
    this.StreamPacket.subscription.unsubscribe();
    return true;
  }

  pause() {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (!this.playing) return void this.JerichoPlayer.emit('error', 'Not Playing', this);
    if (!this.StreamPacket.tracks[0]) return void this.JerichoPlayer.emit('error', 'Empty Queue', this);
    return this.MusicPlayer.pause(true);
  }

  resume() {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (!this.playing) return void this.JerichoPlayer.emit('error', 'Not Playing', this);
    if (!this.StreamPacket.tracks[0]) return void this.JerichoPlayer.emit('error', 'Empty Queue', this);
    if (!this.paused) return void this.JerichoPlayer.emit('error', 'Not Paused', this);
    if (!this.MusicPlayer) return this.MusicPlayer.unpause();
    return void null;
  }

  async insert(
    Query,
    TrackIndex = -1,
    message,
    InsertOptions = {
      IgnoreError: true,
      extractor: 'play-dl',
      metadata: this.metadata,
      ExtractorStreamOptions: {
        Limit: 1,
        Quality: 'high',
        Proxy: undefined,
      },
    },
  ) {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (
      TrackIndex
      && !(typeof TrackIndex === 'number' || typeof TrackIndex === 'string')
    ) {
      return void this.JerichoPlayer.emit(
        'error',
        'Invalid Index',
        this,
        TrackIndex,
      );
    }
    InsertOptions = ClassUtils.stablizingoptions(
      InsertOptions,
      this.QueueOptions,
    );
    this.StreamPacket
      ? this.StreamPacket
      : new StreamPacketGen(
        this.Client,
        this.guildId,
        InsertOptions.metadata,
        InsertOptions.extractor,
        InsertOptions.ExtractorStreamOptions,
        this.JerichoPlayer,
      );
    this.StreamPacket = (await this.StreamPacket.insert(
      Number(TrackIndex) ?? -1,
      Query,
      InsertOptions.ExtractorStreamOptions,
      InsertOptions.extractor,
      message ? message.author : undefined ?? undefined,
    )) ?? this.StreamPacket;
    this.tracks = this.StreamPacket.searches;
    return true;
  }

  remove(Index = -1, Amount = 1) {
    if (this.destroyed) {
      return void this.JerichoPlayer.emit(
        'error',
        'Destroyed Queue',
        this.JerichoPlayer.GetQueue(this.guildId),
      );
    }
    if (Index && !(typeof Index === 'number' || typeof Index === 'string')) {
      return void this.JerichoPlayer.emit('error', 'Invalid Index', this, Index);
    }
    if (Number(Index) < -1 && Number(Index) >= this.tracks.length) {
      return void this.JerichoPlayer.emit(
        'error',
        'Invalid Index',
        this.JerichoPlayer.GetQueue(this.guildId),
        Index,
      );
    }
    this.StreamPacket = this.StreamPacket.remove(Number(Index), Number(Amount));
    return true;
  }

  destroy(connectionTimedout = 0) {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    this.StreamPacket.tracks = [];
    this.StreamPacket.searches = [];
    this.StreamPacket.volume = 0.8;
    this.StreamPacket.AudioResource = undefined;
    const NodeTimeoutId = connectionTimedout || connectionTimedout === 0
      ? disconnect(
        this.guildId,
        { destroy: true },
        Number(connectionTimedout) ?? 0,
        this,
      )
      : undefined;

    this.destroyed = true;
    const Garbage = {};
    Garbage.container = this.StreamPacket;
    delete Garbage.container;
    this.StreamPacket = undefined;
    return NodeTimeoutId ?? undefined;
  }

  mute() {
    this.volume = 0;
    return true;
  }

  unmute(Volume) {
    this.volume = Volume ?? 0.8;
    return this.volume;
  }

  get volume() {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    return (this.StreamPacket.volume ?? 0.8) * 100;
  }

  set volume(Volume) {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (
      !Volume
      || (Volume
        && !(typeof Volume === 'number' || typeof Volume === 'string')
        && (Number(Volume) > 200 || Number(Volume) < 0))
    ) {
      return void this.JerichoPlayer.emit(
        'error',
        'Invalid Volume',
        this,
        Volume,
      );
    }
    this.StreamPacket.volume = Number(Volume) / 100;
    if (this.tracks && this.tracks[0] && this.StreamPacket.AudioResource) this.StreamPacket.AudioResource.volume.setVolume(this.StreamPacket.volume);
    return this.StreamPacket.volume;
  }

  get paused() {
    if (
      !(
        this.MusicPlayer
        && this.MusicPlayer.state
        && this.MusicPlayer.state.status
      )
    ) return false;
    return (
      this.MusicPlayer.state.status === AudioPlayerStatus.Paused
      || this.MusicPlayer.state.status === AudioPlayerStatus.AutoPaused
    );
  }

  get playing() {
    if (
      !(
        this.MusicPlayer
        && this.MusicPlayer.state
        && this.MusicPlayer.state.status
      )
    ) return false;
    return this.MusicPlayer.state.status !== AudioPlayerStatus.Idle;
  }

  get current() {
    if (!this.playing || !this.destroyed) return undefined;
    return this.StreamPacket.searches[0];
  }

  async #__ResourcePlay() {
    if (
      !(
        this.StreamPacket
        && this.StreamPacket.tracks
        && this.StreamPacket.tracks[0]
      )
    ) {
      Queue.#TimedoutIds[
        `${this.guildId}`
      ] = this.#__QueueAudioPlayerStatusManager();
      return void this.JerichoPlayer.emit('queueEnd', this);
    }
    if (this.destroyed) return void null;
    Queue.#TimedoutIds[`${this.guildId}`] = Queue.#TimedoutIds[
      `${this.guildId}`
    ]
      ? clearTimeout(Number(Queue.#TimedoutIds[`${this.guildId}`]))
      : undefined;
    const AudioResource = await this.StreamPacket.StreamAudioResourceExtractor(
      this.StreamPacket.tracks[0],
    );
    this.JerichoPlayer.emit('trackStart', this, this.tracks[0]);
    this.MusicPlayer.play(AudioResource);
    if (!this.StreamPacket.subscription && this.StreamPacket.VoiceConnection) {
      this.StreamPacket.subscription = this.StreamPacket.VoiceConnection.subscribe(this.MusicPlayer)
        ?? undefined;
    }
    return void (await entersState(
      this.MusicPlayer,
      AudioPlayerStatus.Playing,
      5e3,
    ));
  }

  #__CleaningTrackMess(StartingTrackIndex = 0, DeleteTracksCount) {
    DeleteTracksCount
      ? this.StreamPacket.tracks.splice(
        StartingTrackIndex ?? 0,
        DeleteTracksCount,
      )
      : this.StreamPacket.tracks.shift();
    DeleteTracksCount
      ? this.StreamPacket.searches.splice(
        StartingTrackIndex ?? 0,
        DeleteTracksCount,
      )
      : this.StreamPacket.searches.shift();
  }

  #__QueueAudioPlayerStatusManager() {
    if (this.destroyed) return void null;
    if (this.QueueOptions.LeaveOnEnd && !this.tracks[0]) {
      return (
        this.destroy(this.QueueOptions.LeaveOnEndTimedout ?? 0) ?? undefined
      );
    }
    return void null;
  }
}

module.exports = Queue;
