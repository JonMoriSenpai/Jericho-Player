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
  StageChannel,
  User,
  VoiceChannel
} from 'discord.js'
import { Player } from './index'

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
      ByPassYoutubeDLRatelimit: Boolean | void
      YoutubeDLCookiesFilePath: String | '/path/to/Cookie.txt'
      Proxy: String | Array<String> | 'IPAdress:PortNumber'
      UserAgents: Array<String>
    }
    readonly LeaveOnEmpty: Boolean
    readonly LeaveOnEnd: Boolean
    readonly LeaveOnBotOnly: Boolean
    readonly LeaveOnEmptyTimedout: Number | 'Time in Seconds'
    readonly LeaveOnEndTimedout: Number | 'Time in Seconds'
    readonly LeaveOnBotOnlyTimedout: Number | 'Time in Seconds'
    readonly NoMemoryLeakMode: Boolean | 'No Memory Leak Mode for Music Player'
  }
  metadata: any
  volume: Number
  readonly tracks: Array<Track>
  readonly guildId: Guild['id'] | Snowflake | String
  readonly destroyed: Boolean | Number
  readonly Player: Player
  readonly playing: Boolean
  readonly paused: Boolean
  readonly IgnoreError: Boolean
  readonly MusicPlayer: AudioPlayer
  readonly previousTrack: Track | void
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
  readonly playerMode: PlayerMode | void
  readonly filters: QueueAudioFilters | void
  readonly enabledFilters: String[] | void
  readonly disabledFilters: String[] | void
  play(
    Query: String,
    VoiceChannel: VoiceChannel,
    User: User | GuildMember | void,
    PlayOptions?: PlayOptions
  ): Promise<Boolean> | Promise<undefined> | void
  playTracks(
    QueryArray: String[],
    VoiceChannel: VoiceChannel,
    User: User | GuildMember | void,
    PlayOptions?: PlayOptions
  ): Promise<Boolean> | Promise<undefined> | void
  skip(TrackIndex: Number): Boolean | void
  stop(): Boolean | void
  pause(): Boolean | void
  resume(): Boolean | void
  insert(
    Query: String,
    TrackIndex: Number,
    User: User | GuildMember | void,
    InsertOptions: PlayOptions
  ): Promise<Boolean> | Promise<undefined> | void
  destroy(connectionTimedout?: Number): Number | Boolean | void
  remove(Index?: Number, Amount?: Number): Boolean | void
  mute(): Boolean | void
  unmute(Volume?: Number): Boolean | Number | void
  clear(TracksAmount?: Number): Boolean | void
  back(
    TracksBackwardIndex?: Number,
    requestedBy?: User | GuildMember | void,
    PlayOptions?: PlayOptions,
    forceback?: Boolean
  ): Promise<Boolean> | Promise<undefined> | void
  createProgressBar(
    Work?: String | void | 'track' | 'queue' | 'previousTracks',
    DefaultType?: Number | String | void | '1' | '3',
    Bar?:
      | {
        CompleteIcon: String | '▬'
        TargetIcon: String | '🔘'
        RemainingIcon: String | '▬'
        StartingIcon: String | void
        EndIcon: String | void
      }
      | void
  ): String | void

  loop(
    Choice: 'track' | 'queue' | 'off' | String | void
  ): Boolean | void
  repeat(
    Choice: 'track' | 'queue' | 'off' | String | void,
    Times: number | String | void
  ): Boolean | void
  autoplay(
    ChoiceORQuery: 'off' | 'Despacito' | 'Urls' | String | Number | void
  ): Boolean | void
  search(
    Query: String,
    User: User,
    SearchOptions: PlayOptions | void
  ): Promise<{ playlist: Boolean; tracks: Track[] } | void> | void
  seek(
    StartingPoint: String | Number,
    EndingPoint?: String | Number | void
  ): Boolean | void
  setFilters(FiltersStructure: QueueAudioFilters,forceApply?: Boolean): Boolean | void
  shuffle(): Boolean | void
}

export type Track = {
  readonly Id: Number
  readonly url: String
  readonly video_Id: String
  readonly requestedBy: User | GuildMember | void
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
  readonly metadata: any
  readonly guildId: Guild['id'] | Snowflake | String
  readonly ExtractorStreamOptions: {
    readonly Limit: Number
    readonly Quality: String | 'high' | 'low' | 'medium'
    readonly Cookies: String | 'YTCookies'
    readonly ByPassYoutubeDLRatelimit: Boolean | void
    readonly YoutubeDLCookiesFilePath: String | '/path/to/Cookie.txt'
    readonly Proxy: String | Array<String> | 'IPAdress:PortNumber'
    readonly UserAgents: Array<String>
  }
  readonly IgnoreError: Boolean
  readonly Player: Player
  readonly volume: Number
  readonly AudioResource: AudioResource
  readonly previousTracks: Track[] | void
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
    readonly ByPassYoutubeDLRatelimit: Boolean | void
    readonly YoutubeDLCookiesFilePath: String | '/path/to/Cookie.txt'
    readonly Proxy: String | Array<String> | 'IPAdress:PortNumber'
    readonly UserAgents: Array<String>
  }
  readonly IgnoreError: Boolean
  readonly LeaveOnEmpty: Boolean
  readonly LeaveOnEnd: Boolean
  readonly LeaveOnBotOnly: Boolean
  readonly readonlyLeaveOnEmptyTimedout: Number | 'Time in Seconds'
  readonly LeaveOnEndTimedout: Number | 'Time in Seconds'
  readonly LeaveOnBotOnlyTimedout: Number | 'Time in Seconds'
  readonly NoMemoryLeakMode: Boolean | 'No Memory Leak Mode for Music Player'
}
export type PlayOptions = {
  readonly extractor: String | 'play-dl' | 'youtube-dl'
  readonly metadata: any
  readonly ExtractorStreamOptions?: {
    readonly Limit: Number
    readonly Quality: String | 'high' | 'low' | 'medium'
    readonly Cookies: String | 'YTCookies'
    readonly ByPassYoutubeDLRatelimit: Boolean | void
    readonly YoutubeDLCookiesFilePath: String | '/path/to/Cookie.txt'
    readonly Proxy: String | Array<String> | 'IPAdress:PortNumber'
    readonly UserAgents: Array<String>
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
    readonly ByPassYoutubeDLRatelimit: Boolean | void
    readonly YoutubeDLCookiesFilePath: String | '/path/to/Cookie.txt'
    readonly Proxy: String | Array<String> | 'IPAdress:PortNumber'
    readonly UserAgents: Array<String>
  }
  readonly LeaveOnEmpty: Boolean
  readonly LeaveOnEnd: Boolean
  readonly LeaveOnBotOnly: Boolean
  readonly LeaveOnEmptyTimedout: Number | 'Time in Seconds'
  readonly LeaveOnEndTimedout: Number | 'Time in Seconds'
  readonly LeaveOnBotOnlyTimedout: Number | 'Time in Seconds'
  readonly NoMemoryLeakMode: Boolean | 'No Memory Leak Mode for Music Player'
}

export type PlayerMode = {
  mode: String
  type: String | void
  times: String | Number | void
}

export enum DefaultModesTypes {
  Track = 'track',
  Queue = 'queue',
  Off = 'off'
}
export type Awaitable<T> = T | PromiseLike<T>

export interface PlayerEvents {
  error: [
    message: string,
    queue: Queue | Player | void,
    extradata: any | void,
  ]
  channelEmpty: [
    queue: Queue,
    voiceChannel: VoiceChannel | StageChannel | void,
  ]
  botDisconnect: [
    queue: Queue,
    voiceChannel: VoiceChannel | StageChannel | void,
  ]
  trackEnd: [
    queue: Queue,
    track: Track,
  ]
  trackStart: [
    queue: Queue,
    track: Track,
  ]
  connectionError: [
    message: string,
    queue: Queue,
    connection: VoiceConnection | void,
    guildId: String | Snowflake,
  ]
  playlistAdd: [
    queue: Queue,
    tracks: Track[],
  ]
  tracksAdd: [
    queue: Queue,
    tracks: Track[],
  ]
}

export interface QueueAudioFilters {
  bassboost_low?: boolean;
  bassboost?: boolean;
  bassboost_high?: boolean;
  "3D"?: boolean;
  "8D"?: boolean;
  vaporwave?: boolean;
  nightcore?: boolean;
  phaser?: boolean;
  tremolo?: boolean;
  vibrato?: boolean;
  reverse?: boolean;
  treble?: boolean;
  normalizer?: boolean;
  normalizer2?: boolean;
  surrounding?: boolean;
  pulsator?: boolean;
  subboost?: boolean;
  karaoke?: boolean;
  flanger?: boolean;
  gate?: boolean;
  haas?: boolean;
  mcompand?: boolean;
  mono?: boolean;
  mstlr?: boolean;
  mstrr?: boolean;
  compressor?: boolean;
  expander?: boolean;
  softlimiter?: boolean;
  chorus?: boolean;
  chorus2d?: boolean;
  chorus3d?: boolean;
  fadein?: boolean;
  dim?: boolean;
  earrape?: boolean;
  echo?: boolean;
}

export enum PlayerRepeatModes  {
  AutoPlay = 'autoplay',
  Loop = 'loop',
  Repeat = 'repeat'
}
