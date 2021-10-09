const YTDL = require('ytdl-core')
const HttpsProxyAgent = require('https-proxy-agent')
const { YoutubeDLQueryExtractor } = require('./youtube-dl-extract')
const { validate } = require('play-dl')

async function YTDLQueryExtractor(
  Query,
  ExtractorOptions = {
    Cookies: undefined,
    Proxy: undefined,
    HighWaterMark: undefined,
    BufferTimeout: 20 * 1000,
    Quality: 'highestaudio',
    Filter: 'audioandvideo',
  } || undefined,
) {
  const ValidateUrlResult = validate(query)
  const ProxyAgent = ExtractorOptions.Proxy
    ? HttpsProxyAgent(ExtractorOptions.Proxy)
    : undefined
  const QueryResults = await YTDL.getInfo(Query, {
    requestOptions: ExtractorOptions.Cookies
      ? {
          headers: {
            cookie: ExtractorOptions.Cookies,
          },
        }
      : ProxyAgent
      ? { ProxyAgent }
      : undefined,
    highWaterMark: ExtractorOptions.HighWaterMark,
    liveBuffer: ExtractorOptions.BufferTimeout,
    quality: ExtractorOptions.Quality,
    filter: ExtractorOptions.Filter,
  })
  var YoutubeDLTracks = {
    playlist: ValidateUrlResult === 'yt_playlist' ?? false,
    tracks: [],
  }
  var CacheData = null
  var count = 0
  for (count = 0; count < QueryResults.length; ++count) {
    CacheData = await YoutubeDLQueryExtractor(
      QueryResults[count].url,
      ValidateUrlResult === 'yt_playlist' ?? false,
    )
    CacheData.tracks[0]
      ? YoutubeDLTracks.tracks.push(CacheData.tracks[0])
      : null
    if (!YoutubeDLTracks.playlist) break
  }
  return YoutubeDLTracks
}

module.exports = YTDLQueryExtractor
