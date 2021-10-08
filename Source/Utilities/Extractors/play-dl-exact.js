const { search, validate, stream, stream_from_info } = require('play-dl')
const { createAudioResource } = require('@discordjs/voice')

async function PlayDLQueryExtractor(query, QueryModeType, limit = 20) {
  const ValidateUrlResult = validate(query)
  var SearchSource = undefined
  if (
    ValidateUrlResult === 'yt_video' &&
    ['youtube', 'auto'].includes(QueryModeType)
  )
    SearchSource = { youtube: 'video' }
  else if (
    ValidateUrlResult === 'yt_playlist' &&
    ['youtube', 'auto'].includes(QueryModeType)
  )
    SearchSource = { youtube: 'playlist' }
  else if (
    ValidateUrlResult === 'sp_track' &&
    ['spotify', 'auto'].includes(QueryModeType)
  )
    SearchSource = { spotify: 'track' }
  else if (
    ValidateUrlResult === 'sp_album' &&
    ['spotify', 'auto'].includes(QueryModeType)
  )
    SearchSource = { spotify: 'album' }
  else if (
    ValidateUrlResult === 'sp_playlist' &&
    ['spotify', 'auto'].includes(QueryModeType)
  )
    SearchSource = { spotify: 'playlist' }
  else if (
    ValidateUrlResult === 'so_track' &&
    ['soundcloud', 'auto'].includes(QueryModeType)
  )
    SearchSource = { soundcloud: 'tracks' }
  else if (
    ValidateUrlResult === 'so_playlist' &&
    ['soundcloud', 'auto'].includes(QueryModeType)
  )
    SearchSource = { soundcloud: 'playlists' }
  else SearchSource = undefined

  const QueryResults = await search(query, {
    limit: limit,
    source: SearchSource,
  })
  return { RawData: QueryResults, Extractor: 'play-dl' }
}

async function PlayDLAudioResourceExtractor(
  Query,
  StreamOptions = {
    quality: undefined,
    cookie: undefined,
    proxy: undefined,
  } || undefined,
) {
  const StreamSource = validate(Query)
    ? await stream(Query, StreamOptions)
    : await stream_from_info(Query, StreamOptions)
  const AudioResource = createAudioResource(StreamSource.stream, {
    inputType: StreamSource.type,
  })
  return AudioResource
}

module.exports = { PlayDLQueryExtractor, PlayDLAudioResourceExtractor }
