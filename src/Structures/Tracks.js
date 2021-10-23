const { StreamDownloader } = require('playdl-music-extractor');

class TrackGenerator {
  static async fetch(
    Query,
    FetchOptions = {
      IgnoreError: true,
      ExtractorStreamOptions: {
        Limit: 1,
        Quality: 'high',
        Proxy: null,
      },
    },
    extractor = 'play-dl',
    CacheLength = 0,
  ) {
    if (!Query || (Query && typeof Query === 'string')) {
      throw Error('Invalid Song Query is Detected');
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
      };
    }
    const Chunks = TrackGenerator.#Track_Id_Placement(
      RawData.tracks,
      CacheLength,
    );
    return {
      playlist: RawData.playlist,
      streamdatas: Chunks.streamdatas,
      tracks: Chunks.tracks,
    };
  }

  static #UserTrackModelGen(TrackData) {
    return {
      Id: TrackData.Id,
      url: TrackData.url,
      video_Id: TrackData.video_Id,
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

  static async #SongsFetching(
    Query,
    FetchOptions = {
      IgnoreError: true,
      ExtractorStreamOptions: {
        Limit: 1,
        Quality: 'high',
        Proxy: null,
      },
    },
    extractor = 'play-dl',
  ) {
    const RawData = (extractor.includes('youtube-dl')
      ? await TrackGenerator.#YoutubeDLExtractor(Query)
      : null)
      ?? (await StreamDownloader(Query, FetchOptions.ExtractorStreamOptions));
    return RawData;
  }

  static #Track_Id_Placement(Tracks, CacheLength) {
    const StreamDatas = [];
    const SearchTracks = [];
    for (let count = 0, len = Tracks.length; count < len; ++count) {
      Tracks[count].Id = CacheLength + 1;
      SearchTracks.push(TrackGenerator.#UserTrackModelGen(Tracks[count]));
      StreamDatas.push(Tracks[count]);
    }
    return {
      streamdatas: StreamDatas[0] ? StreamDatas : [],
      tracks: SearchTracks[0] ? SearchTracks : [],
    };
  }

  static async #YoutubeDLExtractor(Query) {
    const { StreamDownloader } = require('video-extractor');
    return await StreamDownloader(Query);
  }
}

module.exports = TrackGenerator;
