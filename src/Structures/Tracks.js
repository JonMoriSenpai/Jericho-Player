const ClassUtils = require('../Utilities/Class-Utils');
const {
  DefaultExtractorStreamOptions,
} = require('../../typings/types/interfaces');

class TrackGenerator {
  static async fetch(
    Query,
    RequestedByUser = undefined,
    FetchOptions = {
      IgnoreError: true,
      ExtractorStreamOptions: {
        Limit: 1,
        Quality: 'high',
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
        error: 'Search Not Found',
      };
    }
    const Chunks = TrackGenerator.#Track_Id_Placement(
      RawData.tracks,
      CacheLength,
      RequestedByUser,
    );
    return {
      playlist: RawData.playlist,
      streamdatas: Chunks.streamdatas,
      tracks: Chunks.tracks,
    };
  }

  static #Track_Id_Placement(Tracks, CacheLength, RequestedByUser = undefined) {
    const StreamDatas = [];
    const SearchTracks = [];
    for (let count = 0, len = Tracks.length; count < len; ++count) {
      Tracks[count] ? (Tracks[count].Id = ++CacheLength) : undefined;
      Tracks[count]
        ? SearchTracks.push(
          TrackGenerator.#UserTrackModelGen(Tracks[count], RequestedByUser),
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
        Proxy: undefined,
      },
    },
    extractor = 'play-dl',
  ) {
    let RawData = (extractor
      && extractor.includes('youtube-dl')
      && ClassUtils.ScanDeps('video-extractor')
      ? await TrackGenerator.#YoutubeDLExtractor(Query)
      : undefined)
      ?? (ClassUtils.ScanDeps('playdl-music-extractor')
        ? await TrackGenerator.#PlayDLExtractor(
          Query,
          FetchOptions.ExtractorStreamOptions,
        )
        : undefined);
    if (
      !RawData
      || (RawData && !RawData.tracks)
      || (RawData && RawData.tracks && !RawData.tracks[0])
    ) {
      RawData = (ClassUtils.ScanDeps('playdl-music-extractor')
        ? await TrackGenerator.#PlayDLExtractor(
          Query,
          FetchOptions.ExtractorStreamOptions,
        )
        : undefined)
        ?? (extractor
        && extractor.includes('youtube-dl')
        && ClassUtils.ScanDeps('video-extractor')
          ? await TrackGenerator.#YoutubeDLExtractor(Query)
          : undefined);
      return RawData;
    }
    return RawData;
  }

  static async #YoutubeDLExtractor(Query) {
    const { StreamDownloader } = require('video-extractor');
    return await StreamDownloader(Query);
  }

  static async #PlayDLExtractor(Query, ExtractorStreamOptions) {
    const { StreamDownloader } = require('playdl-music-extractor');
    return await StreamDownloader(Query, ExtractorStreamOptions);
  }

  static #UserTrackModelGen(TrackData, RequestedByUser) {
    return {
      Id: TrackData.Id,
      RequestedByUser,
      url: TrackData.url,
      video_Id: TrackData.video_Id ?? undefined,
      title: TrackData.title,
      description: TrackData.description,
      duration: TrackData.duration,
      thumbnail: TrackData.thumbnail,
      channelId: TrackData.author ?? TrackData.channelId,
      channel_url: TrackData.author_link ?? TrackData.channel_url,
      likes: 0,
      is_live: false,
      dislikes: 0,
    };
  }
}

module.exports = TrackGenerator;
