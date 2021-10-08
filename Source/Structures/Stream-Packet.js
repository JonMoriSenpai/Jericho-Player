const ValidateUrl = require('../Utilities/Extractors/validate-exact')
const {
  YoutubeDLAudioResourceExtractor,
  YoutubeDLQueryExtractor,
} = require('../Utilities/Extractors/youtube-dl-exact')
const {
  PlayDLQueryExtractor,
  PlayDLAudioResourceExtractor,
} = require('../Utilities/Extractors/play-dl-exact')
const YTDLQueryExtractor = require('../Utilities/Extractors/ytdl-core-exact')

class StreamPacket {
  constructor(Queue) {
    this.Queue = Queue
  }

  async create(Query, StreamCreateOptions) {
    const ValidationResults = ValidateUrl(Query)
    var StreamAudioResource = null
    var TrackData = !ValidationResults
      ? await YoutubeDLQueryExtractor(Query)
      : (await PlayDLQueryExtractor(
          Query,
          ValidationResults,
          StreamCreateOptions,
        )) ??
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
      TrackData.tracks[0].orignal_extractor === 'play-dl'
    ) {
      StreamAudioResource = await PlayDLAudioResourceExtractor(
        TrackData.RawData,
        StreamOptions,
      )
    } else if (
      TrackData.tracks &&
      TrackData.tracks[0].orignal_extractor === 'youtube-dl'
    ) {
      StreamAudioResource = YoutubeDLAudioResourceExtractor(TrackData.tracks[0])
    } else if (
      TrackData.tracks &&
      TrackData.tracks[0].orignal_extractor === 'ytdl-core'
    ) {
      StreamAudioResource = YTDLAudioResourceExtractor(TrackData.tracks[0])
    }
  }
}

module.exports = StreamPacket
