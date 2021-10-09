const { createAudioResource } = require('@discordjs/voice')
function AudioExtractorManager(TrackData) {
  const AudioResource = createAudioResource(TrackData.stream_url, {
    inputType: TrackData.orignal_extractor,
    metadata: TrackData,
  })
  return AudioResource
}
