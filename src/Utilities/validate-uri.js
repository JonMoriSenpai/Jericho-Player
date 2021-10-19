function ValidateQuery(Query) {
  const YoutubeUrlRegex = /^.*(youtu.be\/|list=|watch=|v=)([^#\&\?]*).*/;
  const SpotifyUrlRegex = /^(?:spotify:|(?:https?:\/\/(?:open|play)\.spotify\.com\/))(?:embed)?\/?(album|track|playlist)(?::|\/)((?:[0-9a-zA-Z]){22})/;
  const SoundCloundUrlRegex = /^(?:(https?):\/\/)?(?:(?:www|m)\.)?(soundcloud\.com|snd\.sc)\/(.*)$/;

  if (Query.match(YoutubeUrlRegex)) return 'youtube';
  if (Query.match(SpotifyUrlRegex)) return 'spotify';
  if (Query.match(SoundCloundUrlRegex)) return 'soundcloud';
  return void null;
}

module.exports = ValidateQuery;
