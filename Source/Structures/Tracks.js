class Track {
  createYoutubeDLTrack(RawTracksData) {
    var track = {
      Id: 0,
      url: RawTracksData.webpage_url ?? RawTracksData.entries[0].webpage_url,
      title:
        RawTracksData.track ??
        RawTracksData.title ??
        RawTracksData.entries[0].title,
      author:
        RawTracksData.uploader ??
        RawTracksData.channel ??
        RawTracksData.entries[0].creator,
      author_link:
        RawTracksData.uploader_url ?? RawTracksData.entries[0].uploader_url,
      description:
        RawTracksData.description ?? RawTracksData.entries[0].description,
      custom_extractor: `youtube-dl`,
      duration: RawTracksData.duration ?? RawTracksData.entries[0].duration,
      stream_url:
        RawTracksData.url ??
        RawTracksData.entries[0].formats.find((rq_format) =>
          rq_format.format.includes('audio'),
        ).url ??
        RawTracksData.entries[0].requested_formats.find((rq_format) =>
          rq_format.format.includes('audio'),
        ).url,
      orignal_extractor:
        RawTracksData.extractor ??
        RawTracksData.extractor_key ??
        RawTracksData.entries[0].extractor ??
        RawTracksData.entries[0].extractor_key,
      thumbnail: RawTracksData.thumbnail ?? RawTracksData.entries[0].thumbnail,
      channelId:
        RawTracksData.channel_id ?? RawTracksData.entries[0].channel_id,
      channel_url:
        RawTracksData.channel_url ?? RawTracksData.entries[0].channel_url,
      likes: RawTracksData.like_count ?? RawTracksData.entries[0].like_count,
      is_live: RawTracksData.is_live ?? RawTracksData.entries[0].is_live,
      dislikes:
        RawTracksData.like_count ?? RawTracksData.entries[0].dislike_count,
      playlist: RawTracksData.playlist,
    }

    var CompleteTracks = {
      playlist: track.playlist ? true : undefined,
      tracks: [track] ?? undefined,
    }
    return CompleteTracks
  }
  createPlayDLTrack(RawTracksData) {
    var track = {
      Id: 0,
      url: RawTracksData.webpage_url ?? RawTracksData.entries[0].webpage_url,
      title:
        RawTracksData.track ??
        RawTracksData.title ??
        RawTracksData.entries[0].title,
      author:
        RawTracksData.uploader ??
        RawTracksData.channel ??
        RawTracksData.entries[0].creator,
      author_link:
        RawTracksData.uploader_url ?? RawTracksData.entries[0].uploader_url,
      description:
        RawTracksData.description ?? RawTracksData.entries[0].description,
      custom_extractor: `youtube-dl`,
      duration: RawTracksData.duration ?? RawTracksData.entries[0].duration,
      stream_url:
        RawTracksData.url ??
        RawTracksData.entries[0].formats.find((rq_format) =>
          rq_format.format.includes('audio'),
        ).url ??
        RawTracksData.entries[0].requested_formats.find((rq_format) =>
          rq_format.format.includes('audio'),
        ).url,
      orignal_extractor:
        RawTracksData.extractor ??
        RawTracksData.extractor_key ??
        RawTracksData.entries[0].extractor ??
        RawTracksData.entries[0].extractor_key,
      thumbnail: RawTracksData.thumbnail ?? RawTracksData.entries[0].thumbnail,
      channelId:
        RawTracksData.channel_id ?? RawTracksData.entries[0].channel_id,
      channel_url:
        RawTracksData.channel_url ?? RawTracksData.entries[0].channel_url,
      likes: RawTracksData.like_count ?? RawTracksData.entries[0].like_count,
      is_live: RawTracksData.is_live ?? RawTracksData.entries[0].is_live,
      dislikes:
        RawTracksData.like_count ?? RawTracksData.entries[0].dislike_count,
      playlist: RawTracksData.playlist,
    }

    var CompleteTracks = {
      playlist: track.playlist ? true : undefined,
      tracks: [track] ?? undefined,
    }
    return CompleteTracks
  }
}

module.exports = Track
