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
    var ProcessedResults = !ValidationResults
      ? YoutubeDLQueryExtractor(Query)
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

    if (!ProcessedResults) return void null
    else if (ProcessedResults.Extractor === 'play-dl') {
      StreamAudioResource = await PlayDLAudioResourceExtractor(
        ProcessedResults.RawData,
        null,
      )
    } else if (ProcessedResults.Extractor === 'youtube-dl') {
      StreamAudioResource = await YoutubeDLAudioResourceExtractor()
    }
  }
}

module.exports = StreamPacket
