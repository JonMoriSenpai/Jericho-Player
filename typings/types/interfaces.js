const DefaultJerichoPlayerOptions = {
  extractor: 'play-dl',
  ExtractorStreamOptions: {
    Limit: 1,
    Quality: 'high',
    Proxy: null,
  },
  IgnoreError: true,
  LeaveOnEmpty: true,
  LeaveOnEnd: true,
  LeaveOnBotOnly: false,
  LeaveOnEmptyTimedout: 0,
  LeaveOnEndTimedout: 0,
  LeaveOnBotOnlyTimedout: 0,
}

const DefaultQueueCreateOptions = {
  extractor: 'play-dl',
  metadata: null,
  ExtractorStreamOptions: {
    Limit: 1,
    Quality: 'high',
    Proxy: null,
  },
  IgnoreError: true,
  LeaveOnEmpty: true,
  LeaveOnEnd: true,
  LeaveOnBotOnly: false,
  LeaveOnEmptyTimedout: 0,
  LeaveOnEndTimedout: 0,
  LeaveOnBotOnlyTimedout: 0,
}

module.exports = { DefaultQueueCreateOptions, DefaultJerichoPlayerOptions }
