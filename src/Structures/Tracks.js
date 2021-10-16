const { Extractor } = require('playdl-music-extractor')

class TrackGenerator {
  constructor(
    extractor = null,
    FetchOptions = {
      IgnoreError: true,
    },
  ) {
    this.extractor = extractor !== 'youtube-dl' ? 'play-dl' : 'youtube-dl'
    this.FetchOptions = FetchOptions
    this.songs = []
  }
  async fetch(
    Query,
    FetchOptions = {
      IgnoreError: true,
    },
    NotCacheSongs = false,
  ) {
    if (!Query || (Query && typeof Query === 'string'))
      throw Error(`Invalid Song Query is Detected`)
    const RawData = await this.#SongsFetching(Query, FetchOptions)
    if (
      !RawData ||
      (RawData && !RawData.tracks) ||
      (RawData && RawData.tracks && !RawData.tracks[0])
    ) {
      return {
        playlist: false,
        tracks: [],
      }
    }
    const Chunks = this.#Track_Id_Placement(RawData.tracks, NotCacheSongs)
    return {
      playlist: RawData.playlist,
      tracks: Chunks,
    }
  }

  remove(index = 0) {
    if (!index || (index && typeof index !== 'number'))
      throw Error(`InValid Song's is mentioned`)
    else if (!this.songs || (this.songs && !this.songs[Number(index)]))
      throw Error(`Song Index is not present in Cache`)
    return this.songs.splice(index, 1).length
  }

  async insert(
    index = 0,
    Query,
    FetchOptions = {
      IgnoreError: true,
    },
  ) {
    if (!Query || (Query && typeof Query === 'string'))
      throw Error(`Invalid Song Query is Detected`)
    if (!index || (index && typeof index !== 'number'))
      throw Error(`InValid Song's is mentioned`)
    else if (!this.songs || (this.songs && !this.songs[Number(index)]))
      throw Error(`Song Index is not present in Cache`)
    const Chunks = await this.fetch(Query, FetchOptions, true)
    if (
      !Chunks ||
      (Chunks && !Chunks.tracks) ||
      (Chunks && Chunks.tracks && !Chunks.tracks[0])
    )
      throw Error(`No Song is found based on given Query`)
    else
      return void this.songs.splice(
        index,
        0,
        Chunks && Chunks.playlist ? Chunks.tracks : Chunks.tracks[0],
      )
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
    }
  }

  async #SongsFetching(Query, FetchOptions) {
    FetchOptions = FetchOptions ?? this.FetchOptions
    const RawData =
      (this.extractor.includes('youtube-dl')
        ? await this.#YoutubeDLExtractor(Query)
        : null) ?? (await Extractor(Query, FetchOptions))
    return RawData
  }

  #Track_Id_Placement(Tracks, NotCacheSongs = false) {
    var ProcessTracks = []
    for (
      var count = 0, len = Tracks.length, Cachelength = this.songs.length;
      count < len;
      ++count
    ) {
      Tracks[count].Id = Cachelength + 1
      if (!NotCacheSongs) this.songs.push(Tracks[count])
      ProcessTracks.push(TrackGenerator.#UserTrackModelGen(Tracks[count]))
    }
    return ProcessTracks[0] ? ProcessTracks : []
  }
  async #YoutubeDLExtractor(Query) {
    const Downloader = require('video-extractor').Extractor
    return await Downloader(Query)
  }
}

module.exports = TrackGenerator
