import {
  AudioPlayer,
  AudioResource,
  PlayerSubscription,
  VoiceConnection
} from '@discordjs/voice'
import {
  Client,
  Guild,
  Message,
  Snowflake,
  User,
  VoiceChannel
} from 'discord.js'
import { JerichoPlayer } from './index'

export type Queue = {
  readonly Client: Client
  readonly StreamPacket: StreamPacket
  readonly QueueOptions: {
    readonly extractor: String | 'play-dl' | 'youtube-dl'
    metadata: any
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
  message: Message
  metadata: any
  volume: Number
  readonly tracks: Array<Track>
  readonly guildId: Guild['id'] | Snowflake | String
  readonly destroyed: Boolean
  readonly JerichoPlayer: JerichoPlayer
  readonly playing: Boolean
  readonly paused: Boolean
  readonly IgnoreError: Boolean
  readonly MusicPlayer: AudioPlayer
  play(
    Query: String,
    VoiceChannel: VoiceChannel,
    message: Message | undefined,
    PlayOptions?: PlayOptions
  ): Promise<Boolean> | undefined
  skip(TrackIndex: Number): Boolean | undefined
  stop(): Boolean | undefined
  pause(): Boolean | undefined
  resume(): Boolean | undefined
  insert(
    Query: String,
    TrackIndex: Number,
    message: Message | undefined,
    InsertOptions: PlayOptions
  ): Boolean | undefined
  destroy(connectionTimedout?: Number): Number | Boolean | undefined
  remove(Index?: Number, Amount?: Number): Boolean | undefined
  mute(): Boolean | undefined
  unmute(Volume?: Number): Boolean | Number | undefined
}

export type Track = {
  readonly Id: Number
  readonly url: String
  readonly video_Id: String
  readonly RequestedByUser: User | undefined
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
  readonly subscription: PlayerSubscription
  readonly VoiceConnection: VoiceConnection
  metadata: any
  readonly guildId: Guild['id'] | Snowflake | String
  readonly ExtractorStreamOptions: {
    Limit: Number
    Quality: String | 'high' | 'low' | 'medium'
    Proxy: String | Array<String> | 'IPAdress:PortNumber'
  }
  readonly IgnoreError: Boolean
  readonly JerichoPlayer: JerichoPlayer
}

export type Stream = {
  readonly Id: Number
  readonly url: String
  readonly video_Id: String
  readonly RequestedByUser: User | undefined
  readonly title: String
  readonly description: String
  readonly stream: String
  readonly stream_type: String
  readonly volume: Number
  readonly AudioResource: AudioResource
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
  ExtractorStreamOptions?: {
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
export type PlayOptions = {
  extractor: String | 'play-dl' | 'youtube-dl'
  metadata: any
  ExtractorStreamOptions?: {
    Limit: Number
    Quality: String | 'high' | 'low' | 'medium'
    Proxy: String | Array<String> | 'IPAdress:PortNumber'
  }
  IgnoreError: Boolean
}

export type QueueOptions = {
  extractor: String | 'play-dl' | 'youtube-dl'
  metadata: any
  IgnoreError: Boolean
  ExtractorStreamOptions?: {
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
