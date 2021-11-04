import {
  AudioPlayer,
  AudioResource,
  PlayerSubscription,
  VoiceConnection
} from '@discordjs/voice'
import {
  Client,
  Guild,
  GuildMember,
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
      Cookies: String | 'YTCookies'
      ByPassYoutubeDLRatelimit: Boolean | undefined
      YoutubeDLCookiesFilePath: String | '/path/to/Cookie.txt'
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
  readonly destroyed: Boolean | Number
  readonly JerichoPlayer: JerichoPlayer
  readonly playing: Boolean
  readonly paused: Boolean
  readonly IgnoreError: Boolean
  readonly MusicPlayer: AudioPlayer
  readonly previousTrack: Track | undefined
  readonly currentTimestamp: {
    track_ms: String
    totaltrack_ms: String
    previoustracks_ms: String
    totalqueue_ms: String
    saved_queue_ms: String
    queue_ms: String
    remainqueue_ms: String
    human_track: String
    human_totaltrack: String
    human_previoustracks: String
    human_totalqueue: String
    human_saved_queue: String
    human_queue: String
    human_remainqueue: String
  }
  readonly playerMode: PlayerMode | undefined
  play(
    Query: String,
    VoiceChannel: VoiceChannel,
    User: User | GuildMember | undefined,
    PlayOptions?: PlayOptions
  ): Promise<Boolean> | Promise<undefined> | undefined
  skip(TrackIndex: Number): Boolean | undefined
  stop(): Boolean | undefined
  pause(): Boolean | undefined
  resume(): Boolean | undefined
  insert(
    Query: String,
    TrackIndex: Number,
    User: User | GuildMember | undefined,
    InsertOptions: PlayOptions
  ): Promise<Boolean> | Promise<undefined> | undefined
  destroy(connectionTimedout?: Number): Number | Boolean | undefined
  remove(Index?: Number, Amount?: Number): Boolean | undefined
  mute(): Boolean | undefined
  unmute(Volume?: Number): Boolean | Number | undefined
  clear(TracksAmount?: Number): Boolean | undefined
  back(
    TracksBackwardIndex?: Number,
    requestedBy?: User | GuildMember | undefined,
    PlayOptions?: PlayOptions,
    forceback?: Boolean
  ): Promise<Boolean> | Promise<undefined> | undefined
  createProgressBar(
    Work?: String | undefined | 'track' | 'queue' | 'previousTracks',
    DefaultType?: Number | String | undefined | '1' | '3',
    Bar?:
      | {
          CompleteIcon: String | '▬'
          TargetIcon: String | '🔘'
          RemainingIcon: String | '▬'
          StartingIcon: String | undefined
          EndIcon: String | undefined
        }
      | undefined
  ): String | undefined

  loop(
    Choice: 'track' | 'queue' | 'off' | String | undefined
  ): Boolean | undefined
  repeat(
    Choice: 'track' | 'queue' | 'off' | String | undefined,
    Times: number | String | undefined
  ): Boolean | undefined
  autoplay(
    ChoiceORQuery: 'off' | 'Despacito' | 'Urls' | String | Number | undefined
  ): Boolean | undefined
  search(
    Query: String,
    User: User,
    SearchOptions: PlayOptions | undefined
  ): Promise<{ playlist: Boolean; tracks: Track[] } | undefined> | undefined
}

export type Track = {
  readonly Id: Number
  readonly url: String
  readonly video_Id: String
  readonly requestedBy: User | GuildMember | undefined
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
    readonly Cookies: String | 'YTCookies'
    readonly ByPassYoutubeDLRatelimit: Boolean | undefined
    readonly YoutubeDLCookiesFilePath: String | '/path/to/Cookie.txt'
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
    readonly Cookies: String | 'YTCookies'
    readonly ByPassYoutubeDLRatelimit: Boolean | undefined
    readonly YoutubeDLCookiesFilePath: String | '/path/to/Cookie.txt'
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
    readonly Cookies: String | 'YTCookies'
    readonly ByPassYoutubeDLRatelimit: Boolean | undefined
    readonly YoutubeDLCookiesFilePath: String | '/path/to/Cookie.txt'
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
    readonly Cookies: String | 'YTCookies'
    readonly ByPassYoutubeDLRatelimit: Boolean | undefined
    readonly YoutubeDLCookiesFilePath: String | '/path/to/Cookie.txt'
    readonly Proxy: String | Array<String> | 'IPAdress:PortNumber'
  }
  readonly LeaveOnEmpty: Boolean
  readonly LeaveOnEnd: Boolean
  readonly LeaveOnBotOnly: Boolean
  readonly LeaveOnEmptyTimedout: Number | 'Time in Seconds'
  readonly LeaveOnEndTimedout: Number | 'Time in Seconds'
  readonly LeaveOnBotOnlyTimedout: Number | 'Time in Seconds'
}

export type PlayerMode = {
  mode: String
  type: String | undefined
  times: String | Number | undefined
}

export type DefaultModesTypes = {
  Track: 'track'
  Queue: 'queue'
  Off: 'off'
}
