import {
  AudioPlayer,
  AudioResource,
  PlayerSubscription,
  VoiceConnection
} from '@discordjs/voice'
import {
  Client,
  Guild,
  Interaction,
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
  message: Message | Interaction
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
  readonly previousTrack: Track | undefined
  play(
    Query: String,
    VoiceChannel: VoiceChannel,
    User: User | undefined,
    PlayOptions?: PlayOptions
  ): Promise<Boolean> | Promise<undefined> | undefined
  skip(TrackIndex: Number): Boolean | undefined
  stop(): Boolean | undefined
  pause(): Boolean | undefined
  resume(): Boolean | undefined
  insert(
    Query: String,
    TrackIndex: Number,
    User: User | undefined,
    InsertOptions: PlayOptions
  ): Promise<Boolean> | Promise<undefined> | undefined
  destroy(connectionTimedout?: Number): Number | Boolean | undefined
  remove(Index?: Number, Amount?: Number): Boolean | undefined
  mute(): Boolean | undefined
  unmute(Volume?: Number): Boolean | Number | undefined
  clear(TracksAmount?: Number): Boolean | undefined
  back(
    TracksBackward: Number,
    requestedBy: User,
    VoiceChannel: VoiceChannel,
    backPlayoptions: PlayerOptions
  ): Promise<Boolean> | Promise<undefined> | undefined
}

export type Track = {
  readonly Id: Number
  readonly url: String
  readonly video_Id: String
  readonly requestedBy: User | undefined
  readonly title: String
  readonly description: String
  readonly duration: Number
  readonly human_duration: String
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
  readonly metadata: any
  readonly guildId: Guild['id'] | Snowflake | String
  readonly ExtractorStreamOptions: {
    readonly Limit: Number
    readonly Quality: String | 'high' | 'low' | 'medium'
    readonly Proxy: String | Array<String> | 'IPAdress:PortNumber'
  }
  readonly IgnoreError: Boolean
  readonly JerichoPlayer: JerichoPlayer
  readonly volume: Number
  readonly AudioResource: AudioResource
  readonly previousTracks: Track[] | undefined
  readonly TimedoutId: Number | undefined
}

export type Stream = {
  readonly Id: 0
  readonly url: String
  readonly video_Id: String
  readonly title: String
  readonly author: String
  readonly author_link: String
  readonly description: String
  readonly custom_extractor: String | 'play-dl' | 'youtube-dl'
  readonly duration: Number
  readonly human_duration: String
  readonly preview_stream_url: String
  readonly stream: String
  readonly stream_type: String
  readonly stream_duration: Number
  readonly stream_video_Id: String
  readonly stream_human_duration: String
  readonly orignal_extractor:
    | String
    | 'youtube'
    | 'spotify'
    | 'soundcloud'
    | 'facebook'
    | 'arbitrary'
  readonly thumbnail: String
  readonly channelId: String | Number
  readonly channel_url: String
  readonly likes: Number
  readonly is_live: Boolean
  readonly dislikes: Number
}

export type PlayerOptions = {
  readonly extractor: String | 'play-dl' | 'youtube-dl'
  readonly ExtractorStreamOptions?: {
    readonly Limit: Number
    readonly Quality: String | 'high' | 'low' | 'medium'
    readonly Proxy: String | Array<String> | 'IPAdress:PortNumber'
  }
  readonly IgnoreError: Boolean
  readonly LeaveOnEmpty: Boolean
  readonly LeaveOnEnd: Boolean
  readonly LeaveOnBotOnly: Boolean
  readonly readonlyLeaveOnEmptyTimedout: Number | 'Time in Seconds'
  readonly LeaveOnEndTimedout: Number | 'Time in Seconds'
  readonly LeaveOnBotOnlyTimedout: Number | 'Time in Seconds'
}
export type PlayOptions = {
  readonly extractor: String | 'play-dl' | 'youtube-dl'
  readonly metadata: any
  readonly ExtractorStreamOptions?: {
    readonly Limit: Number
    readonly Quality: String | 'high' | 'low' | 'medium'
    readonly Proxy: String | Array<String> | 'IPAdress:PortNumber'
  }
  readonly IgnoreError: Boolean
}

export type QueueOptions = {
  readonly extractor: String | 'play-dl' | 'youtube-dl'
  metadata: any
  readonly IgnoreError: Boolean
  readonly ExtractorStreamOptions?: {
    readonly Limit: Number
    readonly Quality: String | 'high' | 'low' | 'medium'
    readonly Proxy: String | Array<String> | 'IPAdress:PortNumber'
  }
  readonly LeaveOnEmpty: Boolean
  readonly LeaveOnEnd: Boolean
  readonly LeaveOnBotOnly: Boolean
  readonly LeaveOnEmptyTimedout: Number | 'Time in Seconds'
  readonly LeaveOnEndTimedout: Number | 'Time in Seconds'
  readonly LeaveOnBotOnlyTimedout: Number | 'Time in Seconds'
}
