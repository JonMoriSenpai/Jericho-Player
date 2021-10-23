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
  ) {
    this.Client = Client;
    this.StreamPacket = new StreamPacketGen(
      Client,
      message.guild.id,
      QueueOptions.metadata,
      QueueOptions.extractor,
      QueueOptions.ExtractorStreamOptions,
    );
    this.QueueOptions = QueueOptions;
    this.guild = message.guild;
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

    this.MusicPlayer.on('stateChange', (oldState, newState) => {
      if (
        oldState.status === AudioPlayerStatus.Idle
        && newState.status === AudioPlayerStatus.Playing
      ) {
        this.playing = true;
        // console.log('Playing audio output on audio player'); //Work to be Done with Player Events
      } else if (newState.status === AudioPlayerStatus.Idle) {
        this.#__CleaningTrackMess();
        this.#__ResourcePlay();
        // console.log('Playback has stopped. Attempting to restart or next Song.'); //Work to be Done with Player Events
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
      throw Error(
        'Invalid Track Index : Invalid Value has been Provided , it should be Number',
      );
    } else if (!this.playing || (this.playing && !this.StreamPacket.tracks[1])) throw Error('No Songs are Present in Queue!');
    this.#__CleaningTrackMess(
      undefined,
      (TrackIndex > 1 ? TrackIndex - 1 : undefined) ?? undefined,
    );
    this.MusicPlayer.stop();
    return true;
  }

  stop() {
    if (!this.playing) throw Error('Queue is not Playing');
    else if (!this.StreamPacket.tracks[0]) throw Error('Tracks are not in Queue to Stop');
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
      if (!Queue.#TimedoutIds[`${this.guildId}`]) throw Error('Queue has been Ended');
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
        true,
      );
    }
    return void null;
  }
}

module.exports = Queue;
