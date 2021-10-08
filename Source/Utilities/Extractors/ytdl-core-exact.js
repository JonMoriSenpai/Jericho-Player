const YTDL = require('ytdl-core')
const HttpsProxyAgent = require('https-proxy-agent')

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
  if (YTDL.validateURL(Query) && YTDL.validateID(Query)) {
    const ProxyAgent = ExtractorOptions.Proxy
      ? HttpsProxyAgent(ExtractorOptions.Proxy)
      : undefined
    return await YTDL.getInfo(Query, {
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
  }
}

module.exports = YTDLQueryExtractor
