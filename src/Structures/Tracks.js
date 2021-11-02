const ClassUtils = require('../Utilities/Class-Utils');
const {
  DefaultExtractorStreamOptions,
  DefaultChunk,
  DefaultStream,
  DefaultTrack,
  DefaultFetchOptions,
  DefaultExtractorData,
} = require('../types/interfaces');

/**
 * @class TrackGenerator -> these class helps to genreate Tracks from Query and Stream options using methods
 * Tracks sometimes went wrong if Query doesn't match or Ratelimited and error event will trigger
 */
class TrackGenerator {
  /**
   * @method fetch() -> Fetch method , fetches Streams for Stream packet
   * @param {String} Query Query like URls or Youtube Searches | Default Extractor accept 5 supported and big websites like youtube , spotify , soundcloud , retribution , facebook and for "youtube-dl" , it accept any follows official "youtube" searches
   * @param {User|GuildMember|undefined} requestedBy user Data as who requested if given during insert or play method of Queue Instance
   * @param {DefaultExtractorStreamOptions<Object>} FetchOptions Extractor Options for Track Download from Extractors
   * @param {String|Boolean|undefined} extractor extractor to be used as "play-dl" or "youtube-dl"
   * @param {Nummber|String|undefined} CacheLength Last Track ID value
   * @returns {Promise<DefaultChunk<Object>>} returns Chunk value | like a packet of tracks and streamdata values
   */
  static async fetch(
    Query,
    requestedBy = undefined,
    FetchOptions = {
      IgnoreError: true,
      ExtractorStreamOptions: {
        Limit: 1,
        Quality: 'high',
        Cookies: undefined,
        ByPassYoutubeDLRatelimit: true,
        YoutubeDLCookiesFilePath: undefined,
        Proxy: undefined,
      },
    },
    extractor = 'play-dl',
    CacheLength = 0,
  ) {
    FetchOptions.ExtractorStreamOptions = ClassUtils.stablizingoptions(
      FetchOptions.ExtractorStreamOptions,
      DefaultExtractorStreamOptions,
    );
    if (!Query || (Query && typeof Query !== 'string')) {
      return {
        playlist: false,
        streamdatas: [],
        tracks: [],
        error: 'Invalid Query',
      };
    }
    if (
      !ClassUtils.ScanDeps('playdl-music-extractor')
      && !ClassUtils.ScanDeps('video-extractor')
    ) {
      return {
        playlist: false,
        streamdatas: [],
        tracks: [],
        error:
          '\'Extractors : "playdl-music-extractor" and "video-extractor" are not Present , Use "Utils.ScanDeps()" to See and Do - "npm i packageName"',
      };
    }
    const RawData = await TrackGenerator.#SongsFetching(
      Query,
      FetchOptions,
      extractor,
    );
    if (
      !RawData
      || (RawData && !RawData.tracks)
      || (RawData && RawData.tracks && !RawData.tracks[0])
    ) {
      return {
        playlist: false,
        streamdatas: [],
        tracks: [],
        error:
          (RawData.error && RawData.error.message
            ? RawData.error ?? RawData.error.message
            : undefined)
          ?? (RawData.error && RawData.error[0] ? RawData.error[0] : undefined)
          ?? 'Search Not Found',
      };
    }
    const Chunks = TrackGenerator.#Track_Id_Placement(
      RawData.tracks,
      CacheLength,
      requestedBy,
    );
    return {
      playlist: RawData.playlist,
      streamdatas: Chunks.streamdatas,
      tracks: Chunks.tracks,
    };
  }

  /**
   * @private #Track_Id_Placement -> Track Placement in Tracks Cache with Differing as stream tracks and normal tracks for users
   * @param {DefaultStream[]} Tracks Stream Tracks to be converted User fetchable
   * @param {Number|undefined} CacheLength last Cached Track's ID
   * @param {User|GuildMember|undefined} requestedBy RequestedBy User Object value for Track
   * @returns {DefaultChunk<Object>} Chunk Vlaue for Tracks Cache
   */

  static #Track_Id_Placement(Tracks, CacheLength, requestedBy = undefined) {
    const StreamDatas = [];
    const SearchTracks = [];
    for (let count = 0, len = Tracks.length; count < len; ++count) {
      Tracks[count] ? (Tracks[count].Id = ++CacheLength) : undefined;
      Tracks[count]
        ? SearchTracks.push(
          TrackGenerator.#UserTrackModelGen(Tracks[count], requestedBy),
        )
        : undefined;
      Tracks[count] ? StreamDatas.push(Tracks[count]) : undefined;
    }
    return {
      streamdatas: StreamDatas[0] ? StreamDatas : [],
      tracks: SearchTracks[0] ? SearchTracks : [],
    };
  }

  /**
   * @method #SongsFetching() -> Raw Track Data Fetching from various extractors like "play-dl" | "youtube-dl"
   * @param {String} Query Query like URls or Youtube Searches | Default Extractor accept 5 supported and big websites like youtube , spotify , soundcloud , retribution , facebook and for "youtube-dl" , it accept any follows official "youtube" searches
   * @param {DefaultFetchOptions<Object>} FetchOptions Fetching Options for Extractors
   * @param {String|Boolean|undefined} extractor extractor to be used as "play-dl" or "youtube-dl"
   * @returns {Promise<DefaultExtractorData<Object>>} Returns Extractor Value with no edits
   */

  static async #SongsFetching(
    Query,
    FetchOptions = {
      IgnoreError: true,
      ExtractorStreamOptions: {
        Limit: 1,
        Quality: 'high',
        Cookies: undefined,
        ByPassYoutubeDLRatelimit: true,
        YoutubeDLCookiesFilePath: undefined,
        Proxy: undefined,
      },
    },
    extractor = 'play-dl',
  ) {
    let RawData = extractor
      && extractor.includes('youtube-dl')
      && ClassUtils.ScanDeps('video-extractor')
      ? await TrackGenerator.#YoutubeDLExtractor(
        Query,
        FetchOptions.ExtractorStreamOptions,
      )
      : undefined;
    RawData = !RawData
      || (RawData && !RawData.tracks)
      || (RawData && RawData.tracks && !RawData.tracks[0])
      ? ClassUtils.ScanDeps('playdl-music-extractor')
        ? await TrackGenerator.#PlayDLExtractor(
          Query,
          FetchOptions.ExtractorStreamOptions,
        )
        : { playlist: false, tracks: [], error: RawData.error }
      : undefined;
    RawData = !RawData
      || (RawData && !RawData.tracks)
      || (RawData && RawData.tracks && !RawData.tracks[0])
      ? ClassUtils.ScanDeps('video-extractor')
        ? await TrackGenerator.#YoutubeDLExtractor(
          Query,
          FetchOptions.ExtractorStreamOptions,
        )
        : { playlist: false, tracks: [], error: RawData.error }
      : RawData;
    return RawData;
  }

  /**
   * @private #YoutubeDLExtractor -> Youtube-Dl Extractor for player
   * @param {String} Query Query like URls or Youtube Searches | Default Extractor accept 5 supported and big websites like youtube , spotify , soundcloud , retribution , facebook and for "youtube-dl" , it accept any follows official "youtube" searches
   * @param {DefaultExtractorStreamOptions<Object>} ExtractorStreamOptions Extractor Fetching Options
   * @returns {Promise<DefaultExtractorData<Object>>} Returns Extractor Value with no edits
   */

  static async #YoutubeDLExtractor(Query, ExtractorStreamOptions) {
    const { StreamDownloader } = require('video-extractor');
    return await StreamDownloader(Query, {
      Proxy:
        typeof ExtractorStreamOptions.Proxy === 'object'
          ? ExtractorStreamOptions.Proxy[0]
          : undefined,
      YTCookies: ExtractorStreamOptions.Cookies,
      BypassRatelimit:
        ExtractorStreamOptions.ByPassYoutubeDLRatelimit ?? undefined,
      YoutubeDLCookiesFilePath: ExtractorStreamOptions.YoutubeDLCookiesFilePath,
    });
  }

  /**
   * @private #PlayDLExtractor -> Play-Dl Extractor for player
   * @param {String} Query Query like URls or Youtube Searches | Default Extractor accept 5 supported and big websites like youtube , spotify , soundcloud , retribution , facebook and for "youtube-dl" , it accept any follows official "youtube" searches
   * @param {DefaultExtractorStreamOptions<Object>} ExtractorStreamOptions Extractor Fetching Options
   * @returns {Promise<DefaultExtractorData<Object>>} Returns Extractor Value with no edits
   */

  static async #PlayDLExtractor(Query, ExtractorStreamOptions) {
    const { StreamDownloader } = require('playdl-music-extractor');
    return await StreamDownloader(Query, ExtractorStreamOptions);
  }

  /**
   * @private #UserTrackModelGen -> Transfering Normal Stream Data to user readable Track
   * @param {DefaultStream} TrackData Stream Data about the Track
   * @param {User|GuildMember|undefined} requestedByUser Requested user for Track Object
   * @returns {DefaultTrack} Track Value for Queue.tracks[]
   */

  static #UserTrackModelGen(TrackData, requestedByUser) {
    return {
      Id: TrackData.Id,
      requestedBy: requestedByUser,
      url: TrackData.url,
      video_Id: TrackData.video_Id,
      title: TrackData.title,
      description: TrackData.description,
      duration: TrackData.stream_duration,
      human_duration: TrackData.stream_human_duration,
      thumbnail: TrackData.thumbnail,
      channelId: TrackData.author ?? TrackData.channelId,
      channel_url: TrackData.author_link ?? TrackData.channel_url,
      likes: TrackData.likes,
      is_live: TrackData.is_live,
      dislikes: TrackData.dislikes,
    };
  }
}

module.exports = TrackGenerator;
