const ValidateUri = require('../Utilities/Extractors/validate-uri')
const {
  YoutubeDLAudioResourceExtractor,
  YoutubeDLQueryExtractor,
} = require('../Utilities/Extractors/youtube-dl-extract')
const {
  PlayDLQueryExtractor,
  PlayDLAudioResourceExtractor,
} = require('../Utilities/Extractors/play-dl-extract')
const YTDLQueryExtractor = require('../Utilities/Extractors/ytdl-core-extract')

class StreamPacket {
  constructor(Queue) {
    this.Queue = Queue
  }

  async create(Query, StreamCreateOptions) {
    var StreamAudioResource = null
    var TrackData =
      !ValidateUri(Query) ||
      (ValidateUri(Query) && ValidateUri(Query) !== 'youtube')
        ? await YoutubeDLQueryExtractor(Query)
        : (await PlayDLQueryExtractor(Query, StreamCreateOptions)) ??
          (await YTDLQueryExtractor(Query, {
            Cookies: StreamCreateOptions.cookie || StreamCreateOptions.Cookies,
            Proxy: StreamCreateOptions.Proxy || StreamCreateOptions.Proxies,
            HighWaterMark:
              StreamCreateOptions.HighWaterMark ||
              StreamCreateOptions.highWaterMark,
          }))

    if (!TrackData) return void null
    else if (
      TrackData.tracks &&
      TrackData.tracks[0].custom_extractor === 'play-dl'
    ) {
      StreamAudioResource = await PlayDLAudioResourceExtractor(
        TrackData.RawData,
        StreamOptions,
      )
    } else if (
      TrackData.tracks &&
      TrackData.tracks[0].custom_extractor === 'youtube-dl'
    ) {
      StreamAudioResource = YoutubeDLAudioResourceExtractor(TrackData.tracks[0])
    } else if (
      TrackData.tracks &&
      TrackData.tracks[0].custom_extractor === 'ytdl-core'
    ) {
      StreamAudioResource = YTDLAudioResourceExtractor(TrackData.tracks[0])
    }
  }
}

module.exports = StreamPacket
