const TracksGen = require('./Tracks')
const { createAudioResource } = require('@discordjs/voice')

class StreamPacket {
  constructor(Queue) {
    this.Queue = Queue
    this.searches = null
  }

  async create(Query, StreamCreateOptions) {
    const TracksInstance = new TracksGen(StreamCreateOptions.extractor, {
      IgnoreError: StreamCreateOptions.IgnoreError,
    })
    this.searches = await TracksInstance.fetch(Query)
    this.tracks = TracksInstance.songs
  }

  static AudioExtractorManager(TrackData) {
    try {
      return createAudioResource(TrackData.stream, {
        inputType: TrackData.stream_type,
        metadata: TrackData,
      })
    } catch (error) {
      return void null
    }
  }
}

module.exports = StreamPacket
