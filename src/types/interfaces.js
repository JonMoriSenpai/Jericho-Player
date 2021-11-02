/**
 * @param {Object} ProgressBar ->  Progress bar Credentials
 */
const DefaultProgressBar = {
  CompleteIcon: '▬',
  TargetIcon: '🔘',
  RemainingIcon: '▬',
  StartingIcon: undefined,
  EndIcon: undefined,
};

/**
 * @param {Object} JoinChannelOptions ->  Join Channel Credentials/Options
 */
const DefaultJoinChannelOptions = {
  force: false,
};

/**
 * @param {Object} DisconnectChannelOptions ->  Disconnect/Destroy Channel Connection Credentials/Options
 */
const DefaultDisconnectChannelOptions = {
  destroy: true,
};

/**
 * @param {Object} ExtractorStreamOptions ->  Extractor Options to fetch Songs
 */
const DefaultExtractorStreamOptions = {
  Limit: 1,
  Quality: 'high',
  Cookies: undefined,
  ByPassYoutubeDLRatelimit: undefined,
  YoutubeDLCookiesFilePath: undefined,
  Proxy: undefined,
};

/**
 * @param {Object} Track ->  Song Track
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
 * @param {Object} Stream ->  Song Track's STream Data / Raw Data from Extractors
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
 * @param {Object} Chunk ->  Song Track's STream Data And Raw Data from Extractors for StreamPacket
 */

const DefaultChunk = {
  playlist: false,
  tracks: [DefaultTrack],
  streamdatas: [DefaultStream],
};

/**
 * @param {Object} StreamPacket ->  StreamPacket Instance for Queue for handlind backend Workloads
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
  JerichoPlayer: undefined,
  volume: 0,
  AudioResource: undefined,
  previousTracks: undefined,
  TimedoutId: 0,
  TrackTimeStamp: undefined,
};

/**
 * @param {Object} FetchOptions ->  Fetch Options for SongFetching function for Extractors
 */

const DefaultFetchOptions = {
  IgnoreError: true,
  ExtractorStreamOptions: DefaultExtractorStreamOptions,
};

/**
 * @param {Object} ExtractorData Extractor Data Raw from Extractor Download/Extractor Options
 */
const DefaultExtractorData = {
  playlist: false,
  tracks: DefaultStream,
  error: undefined,
};

/**
 * @param {Object} StreamCreateOptions Stream Create Options for Extractors
 */

const DefaultStreamCreateOptions = {
  requestedBy: undefined,
  IgnoreError: true,
  ExtractorStreamOptions: DefaultExtractorStreamOptions,
};

/**
 * @param {Object} JerichoPlayerOptions Jericho Player's Default Options
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
 * @param {Object} QueueCreateOptions Queue's Default Options
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
};
