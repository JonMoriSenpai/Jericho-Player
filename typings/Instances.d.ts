import { AudioPlayer, VoiceConnection } from '@discordjs/voice'
import { Client, Guild, Message, Snowflake, VoiceChannel } from 'discord.js'

export type Queue = {
  readonly Client: Client
  readonly StreamPacket: StreamPacket
  readonly QueueOptions: {
    readonly extractor: String | 'play-dl' | 'youtube-dl'
    readonly metadata: Object
    readonly ExtractorStreamOptions: {
      Limit: Number
      Quality: String | 'high' | 'low' | 'medium'
      Proxy: String | Array<String> | 'IPAdress:PortNumber'
    }
    readonly LeaveOnEmpty: Boolean
    readonly LeaveOnEnd: Boolean
    readonly LeaveOnBotOnly: Boolean
    readonly LeaveOnEmptyTimedout: Number | 'Time in Seconds'
    readonly LeaveOnEndTimedout: Number | 'Time in Seconds'
    readonly LeaveOnBotOnlyTimedout: Number | 'Time in Seconds'
  }
  readonly guild: Guild
  metadata: Object
  readonly tracks: Array<Track>
  readonly guildId: Guild['id'] | Snowflake | String
  readonly destroyed: Boolean
  readonly playing: Boolean
  readonly IgnoreError: Boolean
  readonly MusicPlayer: AudioPlayer
}

export type Track = {
  readonly Id: Number
  readonly url: String
  readonly video_Id: String
  readonly title: String
  readonly description: String
  readonly duration: Number
  readonly thumbnail: String
  readonly channelId: String
  readonly channel_url: String
  readonly likes: Number
  readonly is_live: Boolean
  readonly dislikes: Number
}

export type StreamPacket = {
  readonly Client: Client
  readonly VoiceChannel: VoiceChannel
  readonly extractor: String | 'play-dl' | 'youtube-dl'
  readonly searches: Array<Track>
  readonly tracks: Array<Stream>
  readonly VoiceConnection: VoiceConnection
  metadata: Object
  readonly GuildId: Guild['id'] | Snowflake | String
  readonly ExtractorStreamOptions: {
    Limit: Number
    Quality: String | 'high' | 'low' | 'medium'
    Proxy: String | Array<String> | 'IPAdress:PortNumber'
  }
  readonly IgnoreError: Boolean
}

export type Stream = {
  readonly Id: Number
  readonly url: String
  readonly video_Id: String
  readonly title: String
  readonly description: String
  readonly stream: String
  readonly stream_type: String
  readonly duration: Number
  readonly thumbnail: String
  readonly channelId: String
  readonly channel_url: String
  readonly likes: Number
  readonly is_live: Boolean
  readonly dislikes: Number
}

export type PlayerOptions = {
  extractor: String | 'play-dl' | 'youtube-dl'
  ExtractorStreamOptions: {
    Limit: Number
    Quality: String | 'high' | 'low' | 'medium'
    Proxy: String | Array<String> | 'IPAdress:PortNumber'
  }
  IgnoreError: Boolean
  LeaveOnEmpty: Boolean
  LeaveOnEnd: Boolean
  LeaveOnBotOnly: Boolean
  LeaveOnEmptyTimedout: Number | 'Time in Seconds'
  LeaveOnEndTimedout: Number | 'Time in Seconds'
  LeaveOnBotOnlyTimedout: Number | 'Time in Seconds'
}

export type QueueOptions = {
  extractor: String | 'play-dl' | 'youtube-dl'
  metadata: Object
  ExtractorStreamOptions: {
    Limit: Number
    Quality: String | 'high' | 'low' | 'medium'
    Proxy: String | Array<String> | 'IPAdress:PortNumber'
  }
  LeaveOnEmpty: Boolean
  LeaveOnEnd: Boolean
  LeaveOnBotOnly: Boolean
  LeaveOnEmptyTimedout: Number | 'Time in Seconds'
  LeaveOnEndTimedout: Number | 'Time in Seconds'
  LeaveOnBotOnlyTimedout: Number | 'Time in Seconds'
}
