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
  constructor(
    Client,
    message,
    QueueOptions = {
      extractor: undefined,
      metadata: null,
      ExtractorStreamOptions: {
        Limit: undefined,
        Quality: undefined,
        Cookies: undefined,
        YoutubeDLCookiesFilePath: undefined,
        Proxy: undefined,
      },
      IgnoreError: undefined,
      LeaveOnEmpty: undefined,
      LeaveOnEnd: undefined,
      LeaveOnBotOnly: undefined,
      LeaveOnEmptyTimedout: undefined,
      LeaveOnEndTimedout: undefined,
      LeaveOnBotOnlyTimedout: undefined,
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
          && this.tracks
          && this.tracks[0]
          && this.StreamPacket.AudioResource
        ) {
          this.StreamPacket.AudioResource = undefined;
          this.StreamPacket.previousTracks.push(this.StreamPacket.searches[0]);
          this.JerichoPlayer.emit('trackEnd', this, this.tracks[0]);
        }
        if (!this.destroyed) this.#__CleaningTrackMess();
        this.#__ResourcePlay();
      } else if (newState && newState.status === AudioPlayerStatus.Playing) {
        this.StreamPacket.TrackTimeStamp.Starting = new Date().getTime();
        this.StreamPacket.TimedoutId = undefined;
      }
    });
  }

  async play(
    Query,
    VoiceChannel,
    User,
    PlayOptions = {
      IgnoreError: true,
      extractor: undefined,
      metadata: this.metadata,
      ExtractorStreamOptions: {
        Limit: 1,
        Quality: 'high',
        Cookies: undefined,
        YoutubeDLCookiesFilePath: undefined,
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
      User ?? undefined,
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
    if (Number(TrackIndex) <= 0 && Number(TrackIndex) >= this.tracks.length) {
      return void this.JerichoPlayer.emit(
        'error',
        'Invalid Index',
        this,
        Number(TrackIndex),
      );
    }

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
    if (this.MusicPlayer.pause(true)) {
      this.StreamPacket.TrackTimeStamp.Paused = new Date().getTime();
      return true;
    }
    return false;
  }

  resume() {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (!this.playing) return void this.JerichoPlayer.emit('error', 'Not Playing', this);
    if (!this.StreamPacket.tracks[0]) return void this.JerichoPlayer.emit('error', 'Empty Queue', this);
    if (!this.paused) return void this.JerichoPlayer.emit('error', 'Not Paused', this);
    if (this.MusicPlayer.unpause()) {
      this.StreamPacket.TrackTimeStamp.Starting
        += new Date().getTime() - this.StreamPacket.TrackTimeStamp.Paused;
      return true;
    }
    return true;
  }

  async insert(
    Query,
    TrackIndex = -1,
    User,
    InsertOptions = {
      IgnoreError: true,
      extractor: undefined,
      metadata: this.metadata,
      ExtractorStreamOptions: {
        Limit: 1,
        Quality: 'high',
        Cookies: undefined,
        YoutubeDLCookiesFilePath: undefined,
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
      User ?? undefined,
    )) ?? this.StreamPacket;
    this.tracks = this.StreamPacket.searches;
    return true;
  }

  remove(Index = -1, Amount = 1) {
    if (this.destroyed) {
      return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    }
    if (Index && !(typeof Index === 'number' || typeof Index === 'string')) {
      return void this.JerichoPlayer.emit('error', 'Invalid Index', this, Index);
    }
    if (Number(Index) < -1 && Number(Index) >= this.tracks.length) {
      return void this.JerichoPlayer.emit(
        'error',
        'Invalid Index',
        this,
        Number(Index),
      );
    }
    this.StreamPacket = this.StreamPacket.remove(Number(Index), Number(Amount));
    return true;
  }

  destroy(connectionTimedout = 0) {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    this.StreamPacket.tracks = [];
    this.StreamPacket.searches = [];
    this.StreamPacket.volume = 0.095;
    this.StreamPacket.AudioResource = undefined;
    this.StreamPacket.previousTracks = [];
    this.StreamPacket.TrackTimeStamp = {
      Starting: undefined,
      Paused: undefined,
    };
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
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (!this.playing) return void this.JerichoPlayer.emit('error', 'Not Playing', this);
    if (!this.StreamPacket.tracks[0]) return void this.JerichoPlayer.emit('error', 'Empty Queue', this);
    this.volume = 0;
    return true;
  }

  unmute(Volume) {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (!this.playing) return void this.JerichoPlayer.emit('error', 'Not Playing', this);
    if (!this.StreamPacket.tracks[0]) return void this.JerichoPlayer.emit('error', 'Empty Queue', this);
    this.volume = Volume ?? 95;
    return this.volume;
  }

  clear(TracksAmount = this.tracks.length - 1) {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (!this.playing) return void this.JerichoPlayer.emit('error', 'Not Playing', this);
    if (!this.StreamPacket.tracks[0] || !this.StreamPacket.tracks[1]) return void this.JerichoPlayer.emit('error', 'Empty Queue', this);
    if (
      Number(TracksAmount) < 1
      && Number(TracksAmount) >= this.tracks.length
    ) {
      return void this.JerichoPlayer.emit(
        'error',
        'Invalid Index',
        this,
        Number(TracksAmount),
      );
    }
    this.#__CleaningTrackMess(1, Number(TracksAmount));
    return true;
  }

  async back(
    TracksBackwardIndex = 0,
    requestedBy = undefined,
    PlayOptions = {
      IgnoreError: true,
      extractor: undefined,
      metadata: this.metadata,
      ExtractorStreamOptions: {
        Limit: 1,
        Quality: 'high',
        Cookies: undefined,
        YoutubeDLCookiesFilePath: undefined,
        Proxy: undefined,
      },
    },
    forceback = true,
  ) {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (!this.previousTrack) {
      return void this.JerichoPlayer.emit(
        'error',
        'Empty Previous Tracks',
        this,
      );
    }
    if (
      Number(TracksBackwardIndex) < 0
      && Number(TracksBackwardIndex) > this.StreamPacket.previousTracks.length
    ) {
      return void this.JerichoPlayer.emit(
        'error',
        'Previous Track Limit Exceeding',
        this,
        Number(TracksBackwardIndex),
      );
    }
    PlayOptions = ClassUtils.stablizingoptions(PlayOptions, this.QueueOptions);
    return await this.StreamPacket.back(
      TracksBackwardIndex,
      requestedBy,
      PlayOptions,
      forceback,
    );
  }

  createProgressBar(
    Work = 'track',
    DefaultType = undefined,
    Bar = {
      CompleteIcon: '▬',
      TargetIcon: '🔘',
      RemainingIcon: '▬',
      StartingIcon: undefined,
      EndIcon: undefined,
    },
  ) {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);

    switch (Work.toLowerCase().trim()) {
      case 'track':
        if (!this.StreamPacket.tracks[0]) return void this.JerichoPlayer.emit('error', 'Nothing Playing', this);
        return this.#__StructureProgressBar(
          Bar,
          Number(this.currentTimestamp.track_ms),
          Number(this.currentTimestamp.totaltrack_ms),
          DefaultType,
        );
      case 'queue':
        if (!this.StreamPacket.tracks[0] || !this.StreamPacket.tracks[1]) return void this.JerichoPlayer.emit('error', 'Empty Queue', this);
        return this.#__StructureProgressBar(
          Bar,
          Number(this.currentTimestamp.queue_ms),
          Number(this.currentTimestamp.totalqueue_ms),
          DefaultType,
        );
      case 'tracks':
        if (!this.StreamPacket.tracks[0] || !this.StreamPacket.tracks[1]) return void this.JerichoPlayer.emit('error', 'Empty Queue', this);
        return this.#__StructureProgressBar(
          Bar,
          Number(this.currentTimestamp.track_ms),
          Number(this.currentTimestamp.queue_ms),
          DefaultType,
        );
      case 'previousTracks':
        if (!this.previousTrack) {
          return void this.JerichoPlayer.emit(
            'error',
            'Empty Previous Tracks',
            this,
          );
        }
        return this.#__StructureProgressBar(
          Bar,
          Number(this.currentTimestamp.previoustracks_ms),
          Number(this.currentTimestamp.totalqueue_ms),
          DefaultType,
        );
      default:
        if (!this.StreamPacket.tracks[0]) return void this.JerichoPlayer.emit('error', 'Nothing Playing', this);
        return this.#__StructureProgressBar(
          Bar,
          Number(this.currentTimestamp.track_ms),
          Number(this.currentTimestamp.totaltrack_ms),
          DefaultType,
        );
    }
  }

  get volume() {
    if (this.destroyed) return void null;
    return (this.StreamPacket.volume ?? 0.095) * 1000;
  }

  set volume(Volume = 0) {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (
      !(typeof Volume === 'number' || typeof Volume === 'string')
      && (Number(Volume) > 200 || Number(Volume) < 0)
    ) {
      return void this.JerichoPlayer.emit(
        'error',
        'Invalid Volume',
        this,
        Volume,
      );
    }
    this.StreamPacket.volume = Number(Volume) / 1000;
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
    if (!this.playing || this.destroyed) return undefined;
    return this.StreamPacket.searches[0];
  }

  get currentTimestamp() {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (!this.StreamPacket.tracks[0]) return void this.JerichoPlayer.emit('error', 'Empty Queue', this);

    const TimeStamp = {
      track_ms: `${
        this.paused
          ? this.StreamPacket.TrackTimeStamp.Paused
            - this.StreamPacket.TrackTimeStamp.Starting
          : new Date().getTime() - this.StreamPacket.TrackTimeStamp.Starting
      }`,
      totaltrack_ms: `${this.StreamPacket.tracks[0].duration}`,
      previoustracks_ms: `${
        this.StreamPacket.previousTracks && this.StreamPacket.previousTracks[0]
          ? this.StreamPacket.previousTracks.reduce(
            (TotalValue, CurrentTrack) => TotalValue + CurrentTrack.duration,
            0,
          )
          : 0
      }`,
      totalqueue_ms: `${
        (this.StreamPacket.previousTracks && this.StreamPacket.previousTracks[0]
          ? this.StreamPacket.previousTracks.reduce(
            (TotalValue, CurrentTrack) => TotalValue + CurrentTrack.duration,
            0,
          )
          : 0)
        + this.StreamPacket.tracks.reduce(
          (TotalValue, CurrentTrack) => TotalValue + CurrentTrack.duration,
          0,
        )
      }`,

      queue_ms: `${
        this.StreamPacket.tracks && this.StreamPacket.tracks[0]
          ? this.StreamPacket.tracks.reduce(
            (TotalValue, CurrentTrack) => TotalValue + CurrentTrack.duration,
            0,
          )
          : 0
      }`,
      remainqueue_ms: `${
        this.StreamPacket.tracks.reduce(
          (TotalValue, CurrentTrack) => TotalValue + CurrentTrack.duration,
          0,
        )
        - (this.paused
          ? this.StreamPacket.TrackTimeStamp.Paused
            - this.StreamPacket.TrackTimeStamp.Starting
          : new Date().getTime() - this.StreamPacket.TrackTimeStamp.Starting)
      }`,
    };
    return {
      ...TimeStamp,
      human_track: this.StreamPacket.HumanTimeConversion(TimeStamp.track_ms),
      human_totaltrack: this.StreamPacket.HumanTimeConversion(
        TimeStamp.totaltrack_ms,
      ),
      human_previoustracks: this.StreamPacket.HumanTimeConversion(
        TimeStamp.previoustracks_ms,
      ),
      human_totalqueue: this.StreamPacket.HumanTimeConversion(
        TimeStamp.totalqueue_ms,
      ),
      human_queue: this.StreamPacket.HumanTimeConversion(TimeStamp.queue_ms),
      human_remainqueue: this.StreamPacket.HumanTimeConversion(
        TimeStamp.remainqueue_ms,
      ),
    };
  }

  get previousTrack() {
    if (this.destroyed) return void null;
    if (this.StreamPacket.previousTracks.length < 1) return void null;
    return this.StreamPacket.previousTracks[
      this.StreamPacket.previousTracks.length - 1
    ];
  }

  async #__ResourcePlay() {
    if (this.destroyed) return void null;
    if (
      this.StreamPacket
      && !(
        this.StreamPacket
        && this.StreamPacket.tracks
        && this.StreamPacket.tracks[0]
      )
    ) {
      this.StreamPacket.TimedoutId = this.#__QueueAudioPlayerStatusManager();
      return void this.JerichoPlayer.emit('queueEnd', this);
    }
    this.StreamPacket.TimedoutId = this.StreamPacket.TimedoutId
      ? clearTimeout(Number(this.StreamPacket.TimedoutId))
      : undefined;
    try {
      const AudioResource = await this.StreamPacket.StreamAudioResourceExtractor(
        this.StreamPacket.tracks[0],
      );
      this.JerichoPlayer.emit('trackStart', this, this.tracks[0]);
      this.MusicPlayer.play(AudioResource);
      if (
        !this.StreamPacket.subscription
        && this.StreamPacket.VoiceConnection
      ) {
        this.StreamPacket.subscription = this.StreamPacket.VoiceConnection.subscribe(this.MusicPlayer)
          ?? undefined;
      }
      return void (await entersState(
        this.MusicPlayer,
        AudioPlayerStatus.Playing,
        5e3,
      ));
    } catch (error) {
      this.JerichoPlayer.emit(
        'connectionError',
        this,
        this.StreamPacket.VoiceConnection,
        this.guildId,
      );
      if (this.tracks[1]) return void this.MusicPlayer.stop();
      return void this.destroy();
    }
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
      this.StreamPacket.TimedoutId
        ? clearTimeout(Number(this.StreamPacket.TimedoutId))
        : undefined;
      return (
        this.destroy(this.QueueOptions.LeaveOnEndTimedout ?? 0) ?? undefined
      );
    }
    return void null;
  }

  #__StructureProgressBar(Credentials, FirstValue, TotalValue, DefaultType) {
    if (DefaultType || DefaultType === 0) {
      switch (`${DefaultType}`) {
        case '1':
          Credentials.CompleteIcon = Credentials.CompleteIcon ?? '●';
          Credentials.TargetIcon = Credentials.TargetIcon ?? '●';
          Credentials.RemainingIcon = Credentials.RemainingIcon ?? '○';
          Credentials.StartingIcon = Credentials.StartingIcon
            ?? `${this.StreamPacket.HumanTimeConversion(undefined, {
              Time: FirstValue,
              ignore: ['milliseconds'],
            })} |  `;
          Credentials.EndIcon = Credentials.EndIcon
            ?? `  | ${this.StreamPacket.HumanTimeConversion(undefined, {
              Time: TotalValue,
              ignore: ['milliseconds'],
            })}`;
          break;
        case '2':
          Credentials.CompleteIcon = Credentials.CompleteIcon ?? '○';
          Credentials.TargetIcon = Credentials.TargetIcon ?? '●';
          Credentials.RemainingIcon = Credentials.RemainingIcon ?? '○';
          Credentials.StartingIcon = Credentials.StartingIcon
            ?? `${this.StreamPacket.HumanTimeConversion(undefined, {
              Time: FirstValue,
              ignore: ['milliseconds'],
            })} |  `;
          Credentials.EndIcon = Credentials.EndIcon
            ?? `  | ${this.StreamPacket.HumanTimeConversion(undefined, {
              Time: TotalValue,
              ignore: ['milliseconds'],
            })}`;
          break;
        case '3':
          Credentials.CompleteIcon = Credentials.CompleteIcon ?? '○';
          Credentials.TargetIcon = Credentials.TargetIcon ?? '◉';
          Credentials.RemainingIcon = Credentials.RemainingIcon ?? '○';
          Credentials.StartingIcon = Credentials.StartingIcon
            ?? `${this.StreamPacket.HumanTimeConversion(undefined, {
              Time: FirstValue,
              ignore: ['milliseconds'],
            })} |  `;
          Credentials.EndIcon = Credentials.EndIcon
            ?? `  | ${this.StreamPacket.HumanTimeConversion(undefined, {
              Time: TotalValue,
              ignore: ['milliseconds'],
            })}`;
          break;
        case '4':
          Credentials.CompleteIcon = Credentials.CompleteIcon ?? '■';
          Credentials.TargetIcon = Credentials.TargetIcon ?? '■';
          Credentials.RemainingIcon = Credentials.RemainingIcon ?? '□';
          Credentials.StartingIcon = Credentials.StartingIcon
            ?? `${this.StreamPacket.HumanTimeConversion(undefined, {
              Time: FirstValue,
              ignore: ['milliseconds'],
            })} |  `;
          Credentials.EndIcon = Credentials.EndIcon
            ?? `  | ${this.StreamPacket.HumanTimeConversion(undefined, {
              Time: TotalValue,
              ignore: ['milliseconds'],
            })}`;
          break;
        case '5':
          Credentials.CompleteIcon = Credentials.CompleteIcon ?? '◉';
          Credentials.TargetIcon = Credentials.TargetIcon ?? '◉';
          Credentials.RemainingIcon = Credentials.RemainingIcon ?? '○';
          Credentials.StartingIcon = Credentials.StartingIcon
            ?? `${this.StreamPacket.HumanTimeConversion(undefined, {
              Time: FirstValue,
              ignore: ['milliseconds'],
            })} |  `;
          Credentials.EndIcon = Credentials.EndIcon
            ?? `  | ${this.StreamPacket.HumanTimeConversion(undefined, {
              Time: TotalValue,
              ignore: ['milliseconds'],
            })}`;
          break;
        default:
          Credentials.CompleteIcon = Credentials.CompleteIcon ?? '▬';
          Credentials.TargetIcon = Credentials.TargetIcon ?? '🔘';
          Credentials.RemainingIcon = Credentials.RemainingIcon ?? '▬';
          Credentials.StartingIcon = Credentials.StartingIcon
            ?? `${this.StreamPacket.HumanTimeConversion(undefined, {
              Time: FirstValue,
              ignore: ['milliseconds'],
            })} |  `;
          Credentials.EndIcon = Credentials.EndIcon
            ?? `  | ${this.StreamPacket.HumanTimeConversion(undefined, {
              Time: TotalValue,
              ignore: ['milliseconds'],
            })}`;
          break;
      }
    }
    const Size = Math.floor(
      (
        parseFloat(parseInt(FirstValue * 100) / parseInt(TotalValue)) / 10
      ).toFixed(1),
    ) + 1;
    const ProgressBar = [];
    const TargetHit = undefined;
    for (let count = 0.7; count <= 10.5; count += 0.7) {
      if (count === 0.7) {
        ProgressBar.push(
          Credentials.StartingIcon
            ?? `${this.StreamPacket.HumanTimeConversion(undefined, {
              Time: FirstValue,
              ignore: ['milliseconds'],
            })} |  `,
        );
      }
      if (count <= Size && count >= Size - 0.7 && TargetHit) ProgressBar.push(Credentials.TargetIcon);
      else if (count < Size) ProgressBar.push(Credentials.CompleteIcon);
      else ProgressBar.push(Credentials.RemainingIcon);
    }
    if (Size >= 11) ProgressBar.push(Credentials.TargetIcon);
    ProgressBar.push(
      Credentials.EndIcon
        ?? `  | ${this.StreamPacket.HumanTimeConversion(undefined, {
          Time: TotalValue,
          ignore: ['milliseconds'],
        })}`,
    );
    return ProgressBar.join('').trim();
  }
}

module.exports = Queue;
