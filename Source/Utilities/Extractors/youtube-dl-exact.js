const YoutubeDL = require('youtube-dl-exec')

async function YoutubeDLQueryExtractor(Query) {
  return await YoutubeDL(Query, {
    dumpSingleJson: true,
    noWarnings: true,
    noCallHome: true,
    noCheckCertificate: true,
    preferFreeFormats: true,
    youtubeSkipDashManifest: true,
    referer: Query,
  }).then((QueryResults) => {
    return QueryResults
  })
}

module.exports = YoutubeDLQueryExtractor
