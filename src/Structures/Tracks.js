class Track {
  Id = undefined;

  url = undefined;

  title = undefined;

  author = undefined;

  channel = undefined;

  description = undefined;

  duration = undefined;

  human_duration = undefined;

  thumbnail = undefined;

  channelId = undefined;

  channel_url = undefined;

  lyrics = undefined;

  likes = undefined;

  is_live = undefined;

  dislikes = undefined;

  requestedBy = undefined;

  constructor(extractorData, requestedBy, readable = false) {
    readable
      ? this.#__patch(extractorData, requestedBy)
      : this.#__parse(extractorData, requestedBy);
  }

  #__patch(rawData, requestedBy) {
    this.Id = rawData?.Id;
    this.url = rawData?.url;
    this.title = rawData?.title;
    this.author = rawData?.author?.name;
    this.description = rawData?.description;
    this.custom_extractor = rawData?.extractorModel?.custom;
    this.duration = rawData?.duration?.ms;
    this.orignal_extractor =
      rawData?.orignal_extractor ?? rawData?.extractorModel?.orignal;
    this.human_duration =
      rawData?.human_duration ?? rawData?.duration?.readable;
    this.thumbnail = rawData?.thumbnail?.url;
    this.channelId = rawData?.channel?.Id;
    this.channel_url = rawData?.channel?.url;
    this.lyrics = rawData?.lyrics;
    this.likes = rawData?.ratings?.likes;
    this.is_live = rawData?.isLive;
    this.dislikes = rawData?.ratings?.dislikes;
    this.requestedBy = requestedBy ?? rawData?.requestedBy;
    return undefined;
  }

  #__parse(rawData, requestedBy) {
    this.Id = rawData?.Id;
    this.url = rawData?.url;
    this.title = rawData?.title;
    this.author = rawData?.author?.name;
    this.description = rawData?.description;
    this.custom_extractor = rawData?.extractorModel?.custom;
    this.duration = rawData?.duration?.ms;
    this.preview_stream_url = rawData?.preview_stream_url;
    this.stream = rawData?.stream?.buffer;
    this.stream_url = rawData?.stream_url ?? rawData?.stream?.url;
    this.stream_type = rawData?.stream_type ?? rawData?.stream?.type;
    this.stream_duration =
      rawData?.stream_duration ?? rawData?.stream?.duration?.ms;
    this.stream_video_Id = rawData?.stream_video_Id ?? rawData?.stream?.videoId;
    this.stream_human_duration =
      rawData?.stream_human_duration ?? rawData?.stream?.duration?.readable;
    this.orignal_extractor =
      rawData?.orignal_extractor ?? rawData?.extractorModel?.orignal;
    this.human_duration =
      rawData?.human_duration ?? rawData?.duration?.readable;
    this.thumbnail = rawData?.thumbnail?.url;
    this.channelId = rawData?.channel?.Id;
    this.channel_url = rawData?.channel?.url;
    this.lyrics = rawData?.lyrics;
    this.likes = rawData?.ratings?.likes;
    this.is_live = rawData?.isLive;
    this.dislikes = rawData?.ratings?.dislikes;
    this.requestedBy = requestedBy ?? rawData?.requestedBy;
    return undefined;
  }
}

module.exports = Track;
