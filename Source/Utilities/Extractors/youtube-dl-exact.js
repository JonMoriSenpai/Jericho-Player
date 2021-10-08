const YoutubeDL = require('youtube-dl-exec').raw
const isUrl = require('is-url')
function YoutubeDLQueryExtractor(Query) {
  if (!isUrl(Query)) return undefined
  const QueryResults = YoutubeDL(
    Query,
    {
      o: '-',
      q: '',
      f: 'bestaudio[ext=webm+acodec=opus+asr=48000]/bestaudio',
      r: '100K',
    },
    { stdio: ['ignore', 'pipe', 'ignore'] },
  )
  return { RawData: QueryResults, Extractor: 'youtube-dl' }
}

async function YoutubeDLAudioResourceExtractor() {
  if (!isUrl(Query)) return undefined
}

module.exports = { YoutubeDLQueryExtractor, YoutubeDLAudioResourceExtractor }
