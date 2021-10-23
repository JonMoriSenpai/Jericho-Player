import { Guild, Client, Message, Snowflake } from 'discord.js'
import { Queue, PlayerOptions, QueueOptions } from './Instances'
import EventEmitter from 'events'

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
