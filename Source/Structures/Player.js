const Queue = require('./Queue.js')

class Player {
  static #QueueCaches = []
  constructor(
    Client,
    Type = null,
    PlayerOptions = {
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
    this.Client = Client
    this.Type = Type
    this.PlayerOptions = PlayerOptions
  }
  CreateQueue(
    message,
    QueueCreateOptions = {
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
    const QueueOptions = {
      metadata: QueueCreateOptions.metadata,
      YTDLDownloadOptions:
        QueueCreateOptions.YTDLDownloadOptions ||
        PlayerOptions.YTDLDownloadOptions,
      LeaveOnEmpty:
        QueueCreateOptions.LeaveOnEmpty || PlayerOptions.LeaveOnEmpty,
      LeaveOnEnd: QueueCreateOptions.LeaveOnEnd || PlayerOptions.LeaveOnEnd,
      LeaveOnBotOnly:
        QueueCreateOptions.LeaveOnBotOnly || PlayerOptions.LeaveOnBotOnly,
      LeaveOnUsersOnly:
        QueueCreateOptions.LeaveOnUsersOnly || PlayerOptions.LeaveOnUsersOnly,
      LeaveOnEmptyTimedout:
        QueueCreateOptions.LeaveOnEmptyTimedout ||
        PlayerOptions.LeaveOnEmptyTimedout,
      LeaveOnEndTimedout:
        QueueCreateOptions.LeaveOnEndTimedout ||
        PlayerOptions.LeaveOnEndTimedout,
      LeaveOnBotOnlyTimedout:
        QueueCreateOptions.LeaveOnBotOnlyTimedout ||
        PlayerOptions.LeaveOnBotOnlyTimedout,
      LeaveOnUsersOnlyTimedout:
        QueueCreateOptions.LeaveOnUsersOnlyTimedout ||
        PlayerOptions.LeaveOnUsersOnlyTimedout,
    }
    var QueueInstance = new Queue(Client, message, this.Type, QueueOptions)
    return Player.#QueueCacheAdd(QueueInstance)
  }
  DeleteQueue(GuildId) {
    if (Player.#QueueCacheFetch(GuildId)) {
      var QueueInstance = Player.#QueueCacheRemove(GuildId)
      return QueueInstance
    } else
      throw Error(
        `[Invalid Queue] Queue is not Present for GuildId: "${GuildId}"`,
      )
  }
  GetQueue(GuildId) {
    const QueueInstance = Player.#QueueCacheFetch(GuildId)
    return QueueInstance
  }

  static #QueueCacheAdd(QueueInstance) {
    Player.#QueueCaches[`${QueueInstance.GuildId}`] = QueueInstance
    return QueueInstance
  }
  static #QueueCacheFetch(GuildId) {
    return Player.#QueueCaches[`${GuildId || QueueInstance.GuildId}`]
  }
  static #QueueCacheRemove(GuildId) {
    if (!this.#QueueCacheFetch(GuildId)) return false
    const QueueInstance = Player.#QueueCaches[`${GuildId}`]
    Player.#QueueCaches[`${GuildId}`] = null
    return QueueInstance
  }
}

module.exports = Player
