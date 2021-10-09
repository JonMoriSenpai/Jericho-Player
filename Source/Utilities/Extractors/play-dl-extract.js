const { search, validate, stream_from_info } = require('play-dl')
const { createAudioResource } = require('@discordjs/voice')
const { YoutubeDLQueryExtractor } = require('./youtube-dl-extract')

async function PlayDLQueryExtractor(query, limit = 20) {
  const ValidateUrlResult = validate(query)
  var SearchSource = undefined
  if (ValidateUrlResult === 'yt_video') SearchSource = { youtube: 'video' }
  else if (ValidateUrlResult === 'yt_playlist')
    SearchSource = { youtube: 'playlist' }
  else return void SearchSource

  const QueryResults = await search(query, {
    limit: limit,
    source: SearchSource,
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

async function PlayDLAudioResourceExtractor(
  RawDataInfo,
  StreamOptions = {
    quality: undefined,
    cookie: undefined,
    proxy: undefined,
  } || undefined,
) {
  const StreamSource = await stream_from_info(RawDataInfo, StreamOptions)
  const AudioResource = createAudioResource(StreamSource.stream, {
    inputType: StreamSource.type,
    metadata: RawDataInfo,
  })
  return AudioResource
}

module.exports = { PlayDLQueryExtractor, PlayDLAudioResourceExtractor }
