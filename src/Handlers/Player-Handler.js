const Queue = require('./Queue-Handler.js');
const ClassUtils = require('../Utilities/Class-Utils');

class Player {
  static #QueueCaches = []

  constructor(
    Client,
    PlayerOptions = {
      extractor: 'play-dl',
      ExtractorStreamOptions: {
        Limit: 1,
        Quality: 'high',
        Proxy: null,
      },
      IgnoreError: true,
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
    this.PlayerOptions = PlayerOptions;
  }

  CreateQueue(
    message,
    QueueCreateOptions = {
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
      LeaveOnUsersOnly: false,
      LeaveOnEmptyTimedout: 0,
      LeaveOnEndTimedout: 0,
      LeaveOnBotOnlyTimedout: 0,
      LeaveOnUsersOnlyTimedout: 0,
    },
  ) {
    QueueCreateOptions = ClassUtils.extractoptions(
      QueueCreateOptions,
      this.PlayerOptions,
    );
    const QueueInstance = new Queue(this.Client, message, QueueCreateOptions);
    return Player.#QueueCacheAdd(QueueInstance);
  }

  DeleteQueue(GuildId) {
    if (Player.#QueueCacheFetch(GuildId)) {
      return void Player.#QueueCacheRemove(GuildId);
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
    const Garbage = {};
    Garbage.Structure = QueueInstance;
    delete Garbage.Structure;
    return void null;
  }
}

module.exports = Player;
