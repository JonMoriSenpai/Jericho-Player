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
        this.JerichoPlayer.emit('NowPlaying', this.tracks[0], this);
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
    if (TrackIndex && typeof TrackIndex !== 'number') {
      this.JerichoPlayer.emit('error', 'Invalid Index', this, TrackIndex);
    } else if (!this.playing || (this.playing && !this.StreamPacket.tracks[1])) this.JerichoPlayer.emit('error', 'Empty Queue', this);
    TrackIndex && TrackIndex > 1
      ? this.#__CleaningTrackMess(undefined, TrackIndex - 1 ?? undefined)
      : undefined;
    this.MusicPlayer.stop();
    return true;
  }

  stop() {
    if (!this.playing) this.JerichoPlayer.emit('error', 'Not Playing', this);
    else if (!this.StreamPacket.tracks[0]) this.JerichoPlayer.emit('error', 'Empty Queue', this);
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

  destroy(connection = true) {
    if (connection) {
      disconnect(this.guildId, { destroy: true }, undefined, this.JerichoPlayer);
    }
    this.destroyed = true;
    const Garbage = {};
    Garbage.container = this.StreamPacket;
    delete Garbage.container;
    this.StreamPacket = undefined;
  }

  get current() {
    if (!this.playing) return undefined;
    return this.StreamPacket.searches[0];
  }

  async #__ResourcePlay() {
    if (!this.StreamPacket.tracks[0]) {
      this.playing = false;
      Queue.#TimedoutIds[
        `${this.guildId}`
      ] = this.#__QueueAudioPlayerStatusManager();
      if (!Queue.#TimedoutIds[`${this.guildId}`]) this.JerichoPlayer.emit('QueueEnd', this);
      else return void null;
    }
    Queue.#TimedoutIds[`${this.guildId}`] = Queue.#TimedoutIds[
      `${this.guildId}`
    ]
      ? clearTimeout(Number(Queue.#TimedoutIds[`${this.guildId}`]))
      : undefined;
    const AudioResource = await this.StreamPacket.StreamAudioResourceExtractor(
      this.StreamPacket.tracks[0],
    );
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
      ? this.tracks.splice(StartingTrackIndex ?? 0, DeleteTracksCount)
      : this.tracks.shift();
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
