import {
  Guild,
  Client,
  Message,
  Snowflake,
  VoiceChannel,
  Interaction,
} from 'discord.js'
import {
  Queue,
  PlayerOptions,
  QueueOptions,
  DefaultModesTypes,
  PlayerEvents,
  QueueAudioFilters,
  Awaitable,
  PlayerRepeatModes
} from './instances'
import { VoiceConnection } from '@discordjs/voice'
import { EventEmitter } from 'events'

export class Player extends EventEmitter {
  public constructor(Client: Client, PlayerOptions?: PlayerOptions)
  public readonly Client: Client
  public readonly PlayerOptions: PlayerOptions
  public CreateQueue(
    message: Message | Interaction,
    QueueCreateOptions?: QueueOptions,
  ): Queue | void
  public GetQueue(guildId: Guild['id'] | Snowflake | String): Queue | void
  public DeleteQueue(guildId: Guild['id'] | Snowflake | String): undefined

  public on<K extends keyof PlayerEvents>(
    event: K,
    listener: (...args: PlayerEvents[K]) => Awaitable<void>,
  ): this
  public on<S extends string | symbol>(
    event: Exclude<S, keyof PlayerEvents>,
    listener: (...args: any[]) => Awaitable<void>,
  ): this
}

export class Utils {
  public static ScanDeps(
    PackageName: String | void,
  ): String | Number | void
}

export class VoiceUtils {
  public static join(
    Client: Client,
    Channel: VoiceChannel,
    JoinChannelOptions?: {
      force: Boolean
    },
  ): Promise<VoiceConnection> | void

  public static disconnect(
    guildId: Guild['id'] | String | Number,
    DisconnectChannelOptions: {
      destroy: Boolean
    },
    Timedout?: Number | String | void,
  ): undefined
}

export {
  DefaultModesTypes,
  DefaultModesTypes as PlayerModesTypes,
  QueueAudioFilters,
  QueueAudioFilters as AudioFilters,
  PlayerRepeatModes
}
