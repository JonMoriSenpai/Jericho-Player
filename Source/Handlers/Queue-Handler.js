const { Collection } = require('discord.js')

class Queue {
  static #QueueNumbers = 0
  constructor(
    Client,
    message,
    Type = null,
    Options = {
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
    this.Type = Type || `MusicPlayer`
    this.QueueId = Queue.#QueueNumbers
    this.QueueOptions = Options
    this.guild = message.guild
    this.metadata = metadata
    this.tracks = []
    this.guildId = message.guild.id
    this.StreamPacket = null
    this.destroyed = false
    this.TimeStamp = null
    this.playing = undefined
  }
  play(query) {
    
  }

  get current() {
    if (!this.playing) return undefined
    else return this.playing
  }

  #QueueDestruction() {
    this.destroyed = true
  }
}

module.exports = Queue
