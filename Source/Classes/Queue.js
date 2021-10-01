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
    this.Type = Type
    this.QueueId = Queue.#QueueNumbers
    this.QueueOptions = Options
    this.message = message
    this.metadata = metadata
    this = Queue.#QueueItemsCreation(this)
  }
  play() {}
  search() {}
  destroy() {}
  skip() {}
  stop() {}
  skipTo() {}
  jump() {}
  clear() {}
  insert() {}
  NowPlaying() {}
  volume() {}
  TrackAdd() {}
  TracksAdd() {}
  remove() {}
  position() {}

  static #QueueItemsCreation(QueueInstance) {
    QueueInstance.tracks = []
    QueueInstance.guildId = QueueInstance.message.guild.id
    QueueInstance.StreamDispacher = null
    return QueueInstance
  }
}

module.exports = Queue
