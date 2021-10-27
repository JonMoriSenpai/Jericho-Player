const ClassUtils = require('../Utilities/Class-Utils');
const { DefaultExtractorStreamOptions } = require('../types/interfaces');

class TrackGenerator {
  static async fetch(
    Query,
    requestedBy = undefined,
    FetchOptions = {
      IgnoreError: true,
      ExtractorStreamOptions: {
        Limit: 1,
        Quality: 'high',
        Cookies: undefined,
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
          (RawData.error && RawData.error.message ? RawData.error.message : `${RawData.error}`)
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

  static async #SongsFetching(
    Query,
    FetchOptions = {
      IgnoreError: true,
      ExtractorStreamOptions: {
        Limit: 1,
        Quality: 'high',
        Cookies: undefined,
        YoutubeDLCookiesFilePath: undefined,
        Proxy: undefined,
      },
    },
    extractor = 'play-dl',
  ) {
    let RawData = extractor
      && extractor.includes('youtube-dl')
      && ClassUtils.ScanDeps('video-extractor')
      ? await TrackGenerator.#YoutubeDLExtractor(Query)
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
        ? await TrackGenerator.#YoutubeDLExtractor(Query)
        : { playlist: false, tracks: [], error: RawData.error }
      : { playlist: false, tracks: [], error: RawData.error };
    return RawData;
  }

  static async #YoutubeDLExtractor(Query, ExtractorStreamOptions) {
    const { StreamDownloader } = require('video-extractor');
    return await StreamDownloader(Query, {
      Proxy:
        typeof ExtractorStreamOptions.Proxy === 'object'
          ? ExtractorStreamOptions.Proxy[0]
          : undefined,
      YTCookies: ExtractorStreamOptions.Cookies,
      YoutubeDLCookiesFilePath: ExtractorStreamOptions.YoutubeDLCookiesFilePath,
    });
  }

  static async #PlayDLExtractor(Query, ExtractorStreamOptions) {
    const { StreamDownloader } = require('playdl-music-extractor');
    return await StreamDownloader(Query, ExtractorStreamOptions);
  }

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
