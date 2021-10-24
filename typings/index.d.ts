import { Guild, Client, Message, Snowflake, VoiceChannel } from 'discord.js'
import { Queue, PlayerOptions, QueueOptions } from './Instances'
import EventEmitter from 'events'
import { VoiceConnection } from '@discordjs/voice'

export class JerichoPlayer extends EventEmitter {
  public constructor (Client: Client, PlayerOptions?: PlayerOptions)
  public readonly Client: Client
  public readonly PlayerOptions: PlayerOptions
  public CreateQueue (
    message: Message,
    QueueCreateOptions: QueueOptions
  ): Queue | undefined
  public GetQueue (guildId: Guild['id'] | Snowflake | String): Queue | undefined
  public DeleteQueue (guildId: Guild['id'] | Snowflake | String): undefined
}

export class Utils {
  public static ScanDeps (
    PackageName: String | undefined
  ): String | Number | undefined
}

export class VoiceUtils {
  public static join (
    Client: Client,
    Channel: VoiceChannel,
    JoinChannelOptions?: {
      force: Boolean
    }
  ): Promise<VoiceConnection> | undefined

  public static disconnect (
    guildId: Guild['id'] | String | Number,
    DisconnectChannelOptions: {
      destroy: Boolean
    },
    Timedout?: Number | String | undefined
  ): undefined
}
