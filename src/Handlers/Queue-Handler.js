const {
  createAudioPlayer,
  AudioPlayerStatus,
  entersState,
  NoSubscriberBehavior,
} = require('@discordjs/voice');
const StreamPacketGen = require('../Structures/Stream-Packet');
const ClassUtils = require('../Utilities/Class-Utils');
const { disconnect } = require('../Utilities/Voice-Utils');

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
        Proxy: null,
      },
      IgnoreError: true,
      LeaveOnEmpty: false,
      LeaveOnEnd: false,
      LeaveOnBotOnly: false,
      LeaveOnEmptyTimedout: 0,
      LeaveOnEndTimedout: 0,
      LeaveOnBotOnlyTimedout: 0,
    },
    JerichoPlayer = undefined,
  ) {
    this.Client = Client;
    this.StreamPacket = new StreamPacketGen(
      Client,
      message.guild.id,
      QueueOptions.metadata,
      QueueOptions.extractor,
      QueueOptions.ExtractorStreamOptions,
      JerichoPlayer,
    );
    this.QueueOptions = QueueOptions;
    this.message = message;
    this.metadata = QueueOptions.metadata;
    this.tracks = [];
    this.guildId = message.guild.id;
    this.destroyed = false;
    this.playing = false;
    this.paused = false;
    this.MusicPlayer = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
      },
    });
    this.JerichoPlayer = JerichoPlayer;

    this.MusicPlayer.on('stateChange', (oldState, newState) => {
      if (
        oldState.status === AudioPlayerStatus.Idle
        && newState.status === AudioPlayerStatus.Playing
      ) {
        this.playing = true;
      } else if (newState.status === AudioPlayerStatus.Idle) {
        this.JerichoPlayer.emit('TrackEnd', this.tracks[0], this);
        this.#__CleaningTrackMess();
        this.#__ResourcePlay();
      }
    });
  }

  async play(
    Query,
    VoiceChannel,
    PlayOptions = {
      IgnoreError: true,
      extractor: 'play-dl',
      metadata: this.metadata,
      ExtractorStreamOptions: {
        Limit: 1,
        Quality: 'high',
        Proxy: null,
      },
      LeaveOnEmpty: false,
      LeaveOnEnd: false,
      LeaveOnBotOnly: false,
      LeaveOnEmptyTimedout: 0,
      LeaveOnEndTimedout: 0,
      LeaveOnBotOnlyTimedout: 0,
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
    this.StreamPacket
      ? this.StreamPacket
      : new StreamPacketGen(
        this.Client,
        this.guildId,
        PlayOptions.metadata,
        PlayOptions.extractor,
        PlayOptions.ExtractorStreamOptions,
        this.JerichoPlayer,
      );
    this.StreamPacket = await this.StreamPacket.create(
      Query,
      VoiceChannel,
      PlayOptions,
      PlayOptions.extractor,
    );
    this.tracks = this.StreamPacket.searches;
    await this.#__ResourcePlay();
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
    TrackIndex && TrackIndex > 1
      ? this.#__CleaningTrackMess(undefined, TrackIndex - 1 ?? undefined)
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
    this.paused = true;
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
    InsertOptions = {
      IgnoreError: true,
      extractor: 'play-dl',
      metadata: this.metadata,
      ExtractorStreamOptions: {
        Limit: 1,
        Quality: 'high',
        Proxy: null,
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
    this.StreamPacket = await this.StreamPacket.insert(
      Number(TrackIndex) ?? -1,
      Query,
      InsertOptions.ExtractorStreamOptions,
      InsertOptions.extractor,
    );
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
    if (Number(Index) < -1) {
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

  destroy(connection = true) {
    if (this.destroyed) return void this.JerichoPlayer.emit('error', 'Destroyed Queue', this);
    if (connection) {
      disconnect(this.guildId, { destroy: true }, undefined, this.JerichoPlayer);
    }
    this.destroyed = true;
    this.StreamPacket.tracks = [];
    this.StreamPacket.searches = [];
    const Garbage = {};
    Garbage.container = this.StreamPacket;
    delete Garbage.container;
    this.StreamPacket = undefined;
    return true;
  }

  get current() {
    if (!this.playing || !this.destroyed) return undefined;
    return this.StreamPacket.searches[0];
  }

  async #__ResourcePlay() {
    if (!this.StreamPacket.tracks[0]) {
      this.playing = false;
      Queue.#TimedoutIds[
        `${this.guildId}`
      ] = this.#__QueueAudioPlayerStatusManager();
      if (!Queue.#TimedoutIds[`${this.guildId}`]) return void this.JerichoPlayer.emit('QueueEnd', this);
      return void null;
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
    this.JerichoPlayer.emit('NowPlaying', this.tracks[0], this);
    this.MusicPlayer.play(AudioResource);
    if (!this.StreamPacket.subscription && this.StreamPacket.VoiceConnection) {
      this.StreamPacket.subscription = this.StreamPacket.VoiceConnection.subscribe(
        this.MusicPlayer,
      )
        ? true
        : undefined;
    }
    this.playing = true;
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
    Queue.#TimedoutIds[`${this.guildId}`] = Queue.#TimedoutIds[
      `${this.guildId}`
    ]
      ? clearTimeout(Number(Queue.#TimedoutIds[`${this.guildId}`]))
      : undefined;
    if (this.QueueOptions.LeaveOnEnd && this.playing && !this.tracks[0]) {
      return disconnect(
        this.guildId,
        { destroy: true },
        this.QueueOptions.LeaveOnEndTimedout,
        this.JerichoPlayer,
      );
    }
    return void null;
  }
}

module.exports = Queue;
