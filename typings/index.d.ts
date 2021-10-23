import { Guild, Client, Message, Snowflake } from 'discord.js'
import { Queue, PlayerOptions, QueueOptions } from './Instances'

export class JerichoPlayer {
  public constructor (Client: Client, PlayerOptions: PlayerOptions)
  public readonly Client: Client
  public readonly PlayerOptions: PlayerOptions
  public CreateQueue (message: Message, QueueCreateOptions: QueueOptions): Queue
  public GetQueue (GuildId: Guild['id'] | Snowflake | String): Queue
  public DeleteQueue (GuildId: Guild['id'] | Snowflake | String): undefined
}
