import { VoiceConnection } from '@discordjs/voice'
import {
  Channel,
  Guild,
  Client,
  ThreadChannel,
  Message,
  Snowflake,
  ApplicationCommand,
  VoiceChannel,
  StageChannel
} from 'discord.js'
import {
  ThreadInstance,
  SlashCommandHandlerInstance,
  RawSlashCommand
} from './Instances'

export class ThreadHandler {
  public constructor (
    Client: Client,
    ThreadHandlerInterfaceOptions: {
      guild: Guild | Message | Channel | Snowflake | String
      channel: Channel | Message | Snowflake | String
      metadata: any | 'Anything to Cache for ThreadInstance'
    }
  )
  public CreateThread (
    CreateThreadOptions:
      | {
          channel: Message | Channel | Snowflake | String
          metadata: any | 'Anything to Cache for ThreadInstance'
          Type: String
          Name: String
          Reason: String
          AutoArchiveDuration: Number | 'Time in Seconds'
          IgnoreError: Boolean
        }
      | null
      | undefined
  ): Promise<ThreadInstance>
  public GetThread (
    Channel: Message | Channel | Snowflake | String
  ): Promise<ThreadChannel>
  public GetThreadInstances (
    Instance: [],
    Amount: Number
  ): Array<Promise<ThreadInstance>>
  public DestroyThread (
    ThreadInstance: ThreadInstance,
    DestroyThreadOptions: {
      Delay: Number
      Reason: String | 'Destroy Thread Instances'
      IgnoreError: Boolean
    }
  ): undefined
}

export class SlashCommandHandler {
  public constructor (
    client: Client,
    SlashCommandHandlerInterfaceOptions:
      | {
          guild: Guild | Message | Channel | Snowflake | String
          global: false
          SlashCommands: Array<RawSlashCommand>
        }
      | null
      | undefined
  )
  public set (commands: []): Promise<ApplicationCommand> | undefined
  public deploy (): Promise<SlashCommandHandlerInstance> | undefined
  public get (
    CommandId: Number | Snowflake | String
  ): Promise<ApplicationCommand> | undefined
  public destroy (
    CommandId: Number | Snowflake | String
  ): Array<Promise<ApplicationCommand>> | undefined
}

export class VoiceHandler {
  public constructor (
    Client: Client,
    VoiceHandlerInterfaceOptions: {
      LeaveOnEmpty: Boolean
      LeaveOnOnlyBot: Boolean
      LeaveOnOnlyUsers: Boolean
      LeaveDelay: Number
      selfDeaf: Boolean
      selfMute: Boolean
      StageTopic: String
      StageSuppress: Boolean
    }
  )
  public join (
    channel: VoiceChannel | StageChannel,
    JoinVoiceChannelOptions: {
      Adapter: Object | 'Guild Adapter from @discordjs/voice'
      LeaveOnEmpty: Boolean
      LeaveOnOnlyBot: Boolean
      LeaveOnOnlyUsers: Boolean
      LeaveDelay: Number | 'Time in Seconds for Delay'
      selfDeaf: Boolean
      selfMute: Boolean
      StageTopic: String
      StageSuppress: Boolean
      ActiveChannel: Boolean
    }
  ): Promise<VoiceConnection> | undefined
  public disconnect (
    GuildId: Guild['id'],
    Delay: Number | 'Time in Seconds for Delay'
  ): Promise<Boolean>
  public destroy (
    GuildId: Guild['id'],
    Delay: Number | 'Time in Seconds for Delay',
    AdapterAvailable: Boolean
  ): Promise<Boolean>
}

export function GuildResolver (
  Client: Client,
  GuildResolve: Guild | Message | Channel | Snowflake | String,
  Extraif: {
    ifmessage: Boolean
  }
): Promise<Guild> | undefined

export function ChannelResolver (
  Client: Client,
  ChannelResolve: Message | Channel | Snowflake | String,
  Extraif: { ifmessage: Boolean; type: String }
): Promise<Channel> | undefined

export function BooleanResolver (
  FirstHand: Boolean,
  SecondHand: Boolean
): Promise<Boolean>
