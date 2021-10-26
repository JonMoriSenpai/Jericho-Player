const DefaultExtractorStreamOptions = {
  Limit: 1,
  Quality: 'high',
  Proxy: undefined,
};

const DefaultStreamCreateOptions = {
  requestedBy: undefined,
  IgnoreError: true,
  ExtractorStreamOptions: DefaultExtractorStreamOptions,
};

const DefaultJerichoPlayerOptions = {
  extractor: 'play-dl',
  ExtractorStreamOptions: DefaultExtractorStreamOptions,
  IgnoreError: true,
  LeaveOnEmpty: true,
  LeaveOnEnd: true,
  LeaveOnBotOnly: true,
  LeaveOnEmptyTimedout: 0,
  LeaveOnEndTimedout: 0,
  LeaveOnBotOnlyTimedout: 0,
};

const DefaultQueueCreateOptions = {
  extractor: 'play-dl',
  metadata: null,
  ExtractorStreamOptions: DefaultExtractorStreamOptions,
  IgnoreError: true,
  LeaveOnEmpty: true,
  LeaveOnEnd: true,
  LeaveOnBotOnly: true,
  LeaveOnEmptyTimedout: 0,
  LeaveOnEndTimedout: 0,
  LeaveOnBotOnlyTimedout: 0,
};

module.exports = {
  DefaultQueueCreateOptions,
  DefaultJerichoPlayerOptions,
  DefaultExtractorStreamOptions,
  DefaultStreamCreateOptions,
};
