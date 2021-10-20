const {
  createAudioPlayer,
  AudioPlayerStatus,
  entersState,
  NoSubscriberBehavior,
} = require('@discordjs/voice')
const StreamPacketGen = require('../Structures/Stream-Packet')

class Queue {
  static #QueueNumbers = 0

  constructor(
    Client,
    message,
    QueueOptions = {
      extractor: 'play-dl',
      metadata: null,
      YTDLDownloadOptions: null,
      LeaveOnEmpty: false,
      LeaveOnEnd: false,
      LeaveOnBotOnly: false,
      LeaveOnUsersOnly: false,
      LeaveOnEmptyTimedout: 0,
      LeaveOnEndTimedout: 0,
      LeaveOnBotOnlyTimedout: 0,
      LeaveOnUsersOnlyTimedout: 0,
    },
  ) {
    Queue.#QueueNumbers += 1
    this.Client = Client
    this.StreamPacket = new StreamPacketGen(
      Client,
      message.guild.id,
      QueueOptions.metadata,
      QueueOptions.extractor,
    )
    this.QueueId = Queue.#QueueNumbers
    this.QueueOptions = QueueOptions
    this.guild = message.guild
    this.metadata = QueueOptions.metadata
    this.tracks = []
    this.guildId = message.guild.id
    this.destroyed = false
    this.playing = undefined
    this.MusicPlayer = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
      },
    })

    this.MusicPlayer.on('stateChange', (oldState, newState) => {
      if (
        oldState.status === AudioPlayerStatus.Idle &&
        newState.status === AudioPlayerStatus.Playing
      ) {
        this.playing = false
        console.log('Playing audio output on audio player')
      } else if (newState.status === AudioPlayerStatus.Idle) {
        this.tracks.shift()
        this.StreamPacket.tracks.shift()
        this.StreamPacket.searches.shift()
        this.#__ResourcePlay()
        console.log('Playback has stopped. Attempting to restart or next Song.')
      }
    })
  }

  async play(
    Query,
    VoiceChannel,
    PlayOptions = {
      IgnoreError: true,
      extractor: 'play-dl',
      metadata: this.metadata,
    },
  ) {
    await this.StreamPacket.create(
      Query,
      VoiceChannel,
      PlayOptions,
      PlayOptions.extractor,
    )
    this.tracks = this.StreamPacket.searches
    await this.#__ResourcePlay()
    return true
  }

  get current() {
    if (!this.playing) return undefined
    return this.StreamPacket.searches[0]
  }

  async #__ResourcePlay() {
    const AudioResource = await this.StreamPacket.StreamAudioResourceExtractor(
      this.StreamPacket.tracks[0],
    )
    this.MusicPlayer.play(AudioResource)
    this.playing = true
    return await entersState(this.MusicPlayer, AudioPlayerStatus.Playing, 5e3)
  }
}

module.exports = Queue
