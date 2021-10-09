const YoutubeDL = require('youtube-dl-exec')
const isUrl = require('is-url')
const { createAudioResource } = require('@discordjs/voice')
const Track = require('../../Structures/Tracks.js')

async function YoutubeDLQueryExtractor(Query, CustomExtractor = 'youtube-dl') {
  if (!isUrl(Query)) Query = `ytsearch:` + Query
  const QueryResults = await YoutubeDL(Query, {
    dumpSingleJson: true,
    noWarnings: true,
    noCallHome: true,
    noCheckCertificate: true,
    preferFreeFormats: true,
    youtubeSkipDashManifest: true,
  })
  return Track.createYoutubeDLTrack(QueryResults, CustomExtractor)
}

function YoutubeDLAudioResourceExtractor(TrackData) {
  const AudioResource = createAudioResource(TrackData.stream_url, {
    inputType: TrackData.orignal_extractor,
    metadata: TrackData,
  })
  return AudioResource
}

module.exports = { YoutubeDLQueryExtractor, YoutubeDLAudioResourceExtractor }
