const YTDL = require('ytdl-core')

function ValidateQuery(Query) {
  const YoutubeUrlRegex = /^.*(youtu.be\/|list=|watch=|v=)([^#\&\?]*).*/
  const SpotifyUrlRegex = /^(?:spotify:|(?:https?:\/\/(?:open|play)\.spotify\.com\/))(?:embed)?\/?(album|track|playlist)(?::|\/)((?:[0-9a-zA-Z]){22})/
  const SoundCloundUrlRegex = /^(?:(https?):\/\/)?(?:(?:www|m)\.)?(soundcloud\.com|snd\.sc)\/(.*)$/

  if (Query.match(YoutubeUrlRegex) || YTDL.validateID(Query)) return 'youtube'
  else if (Query.match(SpotifyUrlRegex)) return 'spotify'
  else if (Query.match(SoundCloundUrlRegex)) return 'soundcloud'
  else return void null
}

module.exports = ValidateQuery
