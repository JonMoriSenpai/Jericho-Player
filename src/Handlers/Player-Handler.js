const Queue = require('./Queue-Handler.js');

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
    this.Client = Client;
    this.Type = Type;
    this.PlayerOptions = PlayerOptions;
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
    const QueueInstance = new Queue(
      this.Client,
      message,
      this.Type,
      QueueCreateOptions,
    );
    return Player.#QueueCacheAdd(QueueInstance);
  }

  DeleteQueue(GuildId) {
    if (Player.#QueueCacheFetch(GuildId)) {
      const QueueInstance = Player.#QueueCacheRemove(GuildId);
      return QueueInstance;
    }
    throw Error(
      `[Invalid Queue] Queue is not Present for GuildId: "${GuildId}"`,
    );
  }

  GetQueue(GuildId) {
    const QueueInstance = Player.#QueueCacheFetch(GuildId);
    return QueueInstance;
  }

  static #QueueCacheAdd(QueueInstance) {
    Player.#QueueCaches[`${QueueInstance.GuildId}`] = QueueInstance;
    return QueueInstance;
  }

  static #QueueCacheFetch(GuildId) {
    return Player.#QueueCaches[`${GuildId || this.GuildId}`];
  }

  static #QueueCacheRemove(GuildId) {
    if (!this.#QueueCacheFetch(GuildId)) return false;
    const QueueInstance = Player.#QueueCaches[`${GuildId}`];
    Player.#QueueCaches[`${GuildId}`] = null;
    return QueueInstance;
  }
}

module.exports = Player;
