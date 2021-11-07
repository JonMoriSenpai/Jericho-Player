const {
  User, Client, VoiceChannel, StageChannel,
} = require('discord.js');
const { AudioResource, PlayerSubscription } = require('@discordjs/voice');

/**
 * @typedef {Object} DefaultProgressBar
 * @property {String} CompleteIcon
 * @property {String} TargetIcon
 * @property {String} RemainingIcon
 * @property {String} StartingIcon
 * @property {String} EndIcon
 */
const DefaultProgressBar = {
  CompleteIcon: '▬',
  TargetIcon: '🔘',
  RemainingIcon: '▬',
  StartingIcon: undefined,
  EndIcon: undefined,
};

/**
 * @typedef {Object} DefaultcurrentTimestamp
 * @property {String} track_ms
 * @property {String} totaltrack_ms
 * @property {String} previoustracks_ms
 * @property {String} saved_queue_ms
 * @property {String} queue_ms
 * @property {String} remainqueue_ms
 * @property {String} human_track
 * @property {String} human_totaltrack
 * @property {String} human_previoustracks
 * @property {String} human_totalqueue
 * @property {String} human_saved_queue
 * @property {String} human_queue
 * @property {String} human_remainqueue
 */

const DefaultcurrentTimestamp = {
  track_ms: '',
  totaltrack_ms: '',
  previoustracks_ms: '',
  totalqueue_ms: '',
  saved_queue_ms: '',
  queue_ms: '',
  remainqueue_ms: '',
  human_track: '',
  human_totaltrack: '',
  human_previoustracks: '',
  human_totalqueue: '',
  human_saved_queue: '',
  human_queue: '',
  human_remainqueue: '',
};

/**
 * @typedef {Object} DefaultPlayerMode
 * @property {String} mode
 * @property {String} type
 * @property {String} times
 */

const DefaultPlayerMode = {
  mode: '',
  type: '',
  times: '',
};

/**
 * @typedef {Object} DefaultModesName
 * @property {String} Loop
 * @property {String} Repeat
 * @property {String} Autoplay
 */
const DefaultModesName = {
  Loop: 'loop',
  Repeat: 'repeat',
  Autoplay: 'autoplay',
};

/**
 * @typedef {Object} DefaultModesType
 * @property {String} Track
 * @property {String} Queue
 * @property {String} Off
 */
const DefaultModesType = {
  Track: 'track',
  Queue: 'queue',
  Off: 'off',
};

/**
 * @typedef {Object} DefaultJoinChannelOptions
 * @property {Boolean} force
 */
const DefaultJoinChannelOptions = {
  force: false,
};

/**
 * @typedef {Object} DefaultDisconnectChannelOptions
 * @property {Boolean} destroy
 */
const DefaultDisconnectChannelOptions = {
  destroy: true,
};

/**
 * @typedef {Object} DefaultExtractorStreamOptions
 * @property {Number} Limit
 * @property {String} Quality
 * @property {String} Cookies
 * @property {Boolean} ByPassYoutubeDLRatelimit
 * @property {String} YoutubeDLCookiesFilePath
 * @property {String[]} Proxy
 */
const DefaultExtractorStreamOptions = {
  Limit: 1,
  Quality: 'high',
  Cookies: undefined,
  ByPassYoutubeDLRatelimit: true,
  YoutubeDLCookiesFilePath: undefined,
  Proxy: undefined,
};

/**
 * @typedef {Object} DefaultTrack
 * @property {Number} Id
 * @property {String} url
 * @property {String} video_Id
 * @property {User} requestedBy
 * @property {String} title
 * @property {String} description
 * @property {Number} duration
 * @property {String} human_duration
 * @property {String} thumbnail
 * @property {String} channelId
 * @property {String} channel_url
 * @property {Number} likes
 * @property {Boolean} is_live
 * @property {Number} dislikes
 */

const DefaultTrack = {
  Id: 0,
  url: undefined,
  video_Id: undefined,
  requestedBy: undefined,
  title: undefined,
  description: undefined,
  duration: 0,
  human_duration: undefined,
  thumbnail: undefined,
  channelId: undefined,
  channel_url: undefined,
  likes: 0,
  is_live: false,
  dislikes: 0,
};

/**
 * @private
 * @typedef {Object} DefaultStream
 * @property {Number} Id
 * @property {String} url
 * @property {String} video_Id
 * @property {User} requestedBy
 * @property {String} title
 * @property {String} description
 * @property {String} custom_extractor
 * @property {String} duration
 * @property {String} human_duration
 * @property {String} preview_stream_url
 * @property {String} stream
 * @property {String} stream_type
 * @property {String} stream_duration
 * @property {String} stream_video_Id
 * @property {Number} stream_human_duration
 * @property {String} orignal_extractor
 * @property {String} thumbnail
 * @property {String} channelId
 * @property {String} channel_url
 * @property {Number} likes
 * @property {Boolean} is_live
 * @property {Number} dislikes
 */

const DefaultStream = {
  Id: 0,
  url: undefined,
  video_Id: undefined,
  title: undefined,
  author: undefined,
  author_link: undefined,
  description: undefined,
  custom_extractor: undefined,
  duration: 0,
  human_duration: undefined,
  preview_stream_url: undefined,
  stream: undefined,
  stream_type: undefined,
  stream_duration: 0,
  stream_video_Id: undefined,
  stream_human_duration: undefined,
  orignal_extractor: undefined,
  thumbnail: undefined,
  channelId: undefined,
  channel_url: undefined,
  likes: 0,
  is_live: false,
  dislikes: 0,
};

/**
 * @typedef {Object} DefaultChunk
 * @property {Boolean} playlist
 * @property {DefaultTrack[]} tracks
 * @property {DefaultStream[]} streamdatas
 * @property {String} error
 */

const DefaultChunk = {
  playlist: false,
  tracks: [DefaultTrack],
  streamdatas: [DefaultStream],
  error: undefined,
};

/**
 * @typedef {Object} DefaultStreamPacket
 * @property {Client} Client
 * @property {VoiceChannel|StageChannel} VoiceChannel
 * @property {String} extractor
 * @property {DefaultTrack[]} searches
 * @property {DefaultStream[]} tracks
 * @property {PlayerSubscription} subscription
 * @property {VoiceConnection} VoiceConnection
 * @property {any} metadata
 * @property {String} guildId
 * @property {DefaultExtractorStreamOptions} ExtractorStreamOptions
 * @property {Boolean} IgnoreError
 * @property {any} Player
 * @property {Number} volume
 * @property {AudioResource} AudioResource
 * @property {DefaultTrack[]} previousTracks
 */

const DefaultStreamPacket = {
  Client: undefined,
  VoiceChannel: undefined,
  extractor: undefined,
  searches: undefined,
  tracks: undefined,
  subscription: undefined,
  VoiceConnection: undefined,
  metadata: undefined,
  guildId: undefined,
  ExtractorStreamOptions: DefaultExtractorStreamOptions,
  IgnoreError: undefined,
  Player: undefined,
  volume: 0,
  AudioResource: undefined,
  previousTracks: undefined,
  TimedoutId: 0,
  TrackTimeStamp: undefined,
};

/**
 * @typedef {Object} DefaultFetchOptions
 * @property {Boolean} IgnoreError
 * @property {DefaultExtractorStreamOptions} ExtractorStreamOptions
 * @property {Boolean} NoStreamif
 */

const DefaultFetchOptions = {
  IgnoreError: true,
  ExtractorStreamOptions: DefaultExtractorStreamOptions,
  NoStreamif: false,
};

/**
 * @typedef {Object} DefaultExtractorData
 * @property {Boolean} playlist
 * @property {DefaultStream} tracks
 * @property {String} error
 */
const DefaultExtractorData = {
  playlist: false,
  tracks: DefaultStream,
  error: undefined,
};

/**
 * @typedef {Object} DefaultStreamCreateOptions
 * @property {User} requestedBy
 * @property {Boolean} IgnoreError
 * @property {DefaultExtractorStreamOptions} ExtractorStreamOptions
 */

const DefaultStreamCreateOptions = {
  requestedBy: undefined,
  IgnoreError: true,
  ExtractorStreamOptions: DefaultExtractorStreamOptions,
};

/**
 * @typedef {Object} DefaultJerichoPlayerOptions
 * @property {String} extractor
 * @property {DefaultExtractorStreamOptions} ExtractorStreamOptions
 * @property {Boolean} IgnoreError
 * @property {Boolean} LeaveOnEmpty
 * @property {Boolean} LeaveOnEnd
 * @property {Boolean} LeaveOnBotOnly
 * @property {Number} LeaveOnEmptyTimedout
 * @property {Number} LeaveOnEndTimedout
 * @property {Number} LeaveOnBotOnlyTimedout
 */

const DefaultJerichoPlayerOptions = {
  extractor: 'play-dl',
  ExtractorStreamOptions: DefaultExtractorStreamOptions,
  IgnoreError: true,
  LeaveOnEmpty: true,
  LeaveOnEnd: true,
  LeaveOnBotOnly: true,
  LeaveOnEmptyTimedout: 0,
  LeaveOnEndTimedout: 0,
  LeaveOnBotOnlyTimedout: 0,
};

/**
 * @typedef {Object} DefaultQueueCreateOptions
 * @property {String} extractor
 * @property {any} metadata
 * @property {DefaultExtractorStreamOptions} ExtractorStreamOptions
 * @property {Boolean} IgnoreError
 * @property {Boolean} LeaveOnEmpty
 * @property {Boolean} LeaveOnEnd
 * @property {Boolean} LeaveOnBotOnly
 * @property {Number} LeaveOnEmptyTimedout
 * @property {Number} LeaveOnEndTimedout
 * @property {Number} LeaveOnBotOnlyTimedout
 */

const DefaultQueueCreateOptions = {
  extractor: 'play-dl',
  metadata: null,
  ExtractorStreamOptions: DefaultExtractorStreamOptions,
  IgnoreError: true,
  LeaveOnEmpty: true,
  LeaveOnEnd: true,
  LeaveOnBotOnly: true,
  LeaveOnEmptyTimedout: 0,
  LeaveOnEndTimedout: 0,
  LeaveOnBotOnlyTimedout: 0,
};

module.exports = {
  DefaultQueueCreateOptions,
  DefaultJerichoPlayerOptions,
  DefaultExtractorStreamOptions,
  DefaultStreamCreateOptions,
  DefaultProgressBar,
  DefaultChunk,
  DefaultStream,
  DefaultTrack,
  DefaultStreamPacket,
  DefaultDisconnectChannelOptions,
  DefaultJoinChannelOptions,
  DefaultExtractorData,
  DefaultFetchOptions,
  DefaultModesName,
  DefaultModesType,
  DefaultPlayerMode,
  DefaultcurrentTimestamp,
};
