class Track {
  Id = undefined

  url = undefined

  title = undefined

  author = undefined

  channel = undefined

  description = undefined

  duration = undefined

  human_duration = undefined

  thumbnail = undefined

  channelId = undefined

  channel_url = undefined

  lyrics = undefined

  likes = undefined

  is_live = undefined

  dislikes = undefined

  requestedBy = undefined

  constructor(extractorData, requestedBy, readable = false) {
    readable
      ? this.#__patch(extractorData, requestedBy)
      : this.#__parse(extractorData, requestedBy)
  }

  #__patch(rawData, requestedBy) {
    this.Id = rawData?.Id
    this.url = rawData?.url
    this.title = rawData?.title
    this.author = rawData?.author
    this.channel = rawData?.author
    this.description = rawData?.description
    this.duration = rawData?.duration
    this.human_duration = rawData?.human_duration
    this.thumbnail = rawData?.thumbnail
    this.channelId = rawData?.channelId
    this.channel_url = rawData?.channel_url
    this.lyrics = rawData?.lyrics
    this.likes = rawData?.likes
    this.is_live = rawData?.is_live
    this.dislikes = rawData?.dislikes
    this.requestedBy = requestedBy ?? rawData?.requestedBy
    return undefined
  }

  #__parse(rawData, requestedBy) {
    this.Id = rawData?.Id
    this.url = rawData?.url
    this.title = rawData?.title
    this.author = rawData?.author
    this.description = rawData?.description
    this.custom_extractor = rawData?.custom_extractor
    this.duration = rawData?.duration
    this.preview_stream_url = rawData?.preview_stream_url
    this.stream = rawData?.stream
    this.stream_url = rawData?.stream_url
    this.stream_type = rawData?.stream_type
    this.stream_duration = rawData?.stream_duration
    this.stream_video_Id = rawData?.stream_video_Id
    this.stream_human_duration = rawData?.stream_human_duration
    this.orignal_extractor = rawData?.orignal_extractor
    this.human_duration = rawData?.human_duration
    this.thumbnail = rawData?.thumbnail
    this.channelId = rawData?.channelId
    this.channel_url = rawData?.channel_url
    this.lyrics = rawData?.lyrics
    this.likes = rawData?.likes
    this.is_live = rawData?.is_live
    this.dislikes = rawData?.dislikes
    this.requestedBy = requestedBy ?? rawData?.requestedBy
    return undefined
  }
}

module.exports = Track
