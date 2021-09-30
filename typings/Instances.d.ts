import {
  ApplicationCommandData,
  ApplicationCommandOptionData,
  ApplicationCommandType,
  Channel,
  Client,
  Guild,
  Message,
  Snowflake,
  ThreadChannel
} from 'discord.js'

export type ThreadInstance = {
  readonly ThreadCode: Number
  readonly Client: Client
  readonly channel: Channel
  readonly guild: Guild
  metadata: any | 'Anything to Cache for ThreadInstance'
  readonly thread: ThreadChannel
  destroy(DestroyThreadOptions: {
    Delay: Number
    Reason: String
    IgnoreError: Boolean,
  }): Promise<Boolean> | undefined
}

export type SlashCommandHandlerInstance = {
  readonly client: Client
  readonly guild: Guild | Message | Channel | Snowflake | String
  readonly global: Boolean
  readonly SlashCommands: Array<RawSlashCommand>
  readonly ApplicationCommands: Array<ApplicationCommandData>
  set(commands: []): Promise<ApplicationCommandData> | undefined
  deploy(): Promise<SlashCommandHandlerInstance> | undefined
  get(
    CommandId: Number | Snowflake | String
  ): Promise<ApplicationCommandData> | undefined
  destroy(
    CommandId: Number | Snowflake | String
  ): Array<Promise<ApplicationCommandData>> | undefined
}

export type RawSlashCommand =
  | ApplicationCommandData
  | {
      name: String
      description: String
      type: ApplicationCommandType
      options: Array<Promise<ApplicationCommandOptionData>>
      defaultPermission: Boolean
    }
