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
    return this.#QueueCacheAdd(QueueInstance)
  }
  DeleteQueue(GuildId) {
    if (
      this.#QueueCacheRemove(GuildId) &&
      this.#QueueCacheRemove(GuildId).destroyed
    )
      return true
    else if (
      this.#QueueCacheRemove(GuildId) &&
      !this.#QueueCacheRemove(GuildId).destroyed
    ) {
      var QueueInstance = this.#QueueCacheFetch(GuildId)
      QueueInstance
    } else
      throw Error(
        `[Invalid Queue] Queue is not Present for GuildId: "${GuildId}"`,
      )
  }

  #QueueCacheAdd(QueueInstance) {
    Player.#QueueCaches[`${QueueInstance.GuildId}`] = QueueInstance
    return QueueInstance
  }
  #QueueCacheFetch(GuildId) {
    return Player.#QueueCaches[`${QueueInstance.GuildId}`]
  }
  #QueueCacheRemove(GuildId) {
    if (!this.#QueueCacheFetch(GuildId)) return false
    var QueueInstance = Player.#QueueCaches[`${QueueInstance.GuildId}`]
    Player.#QueueCaches[`${QueueInstance.GuildId}`] = null
    return QueueInstance
  }
}
