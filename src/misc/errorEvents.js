class invalidGuild extends Error {
  constructor(message) {
    super();
    this.name = 'invalidGuild';
    this.message =
      message ?? 'Guild/Guild-Snowflake Data is Invalid or got Corrupt';
  }
}

class invalidRequiredSource extends Error {
  constructor(message) {
    super();
    this.name = 'invalidRequiredSource';
    this.message =
      message ??
      'Invalid or Wrong Required-Source Data for Checking of requested By User Data';
  }
}

class invalidVoiceChannel extends Error {
  constructor(message) {
    super();
    this.name = 'invalidVoiceChannel';
    this.message =
      message ??
      'Wrong/Invalid/Corrupt Voice Channel Data in the Respective Guild';
  }
}

class invalidQueue extends Error {
  constructor(message) {
    super();
    this.name = 'invalidQueue';
    this.message =
      message ?? 'Wrong/Invalid/Corrupt Queue Data for the Respective Guild';
  }
}

class destroyedQueue extends Error {
  constructor(message) {
    super();
    this.name = 'destroyedQueue';
    this.message =
      message ??
      "Queue has already Been destroyed and can't be used for queue Methods";
  }
}

class invalidQuery extends Error {
  constructor(message) {
    super();
    this.name = 'invalidQuery';
    this.message =
      message ??
      'Wrong/Invalid/Corrupt Raw Query Data for the Extractors to fetch Tracks and Playlsit Data';
  }
}

class invalidTracksCount extends Error {
  constructor(message) {
    super();
    this.name = 'invalidTracksCount';
    this.message =
      message ?? 'Wrong/Invalid/Corrupt Data of Tracks Count for the method';
  }
}

module.exports = {
  invalidGuild,
  invalidRequiredSource,
  invalidVoiceChannel,
  invalidQueue,
  destroyedQueue,
  invalidQuery,
  invalidTracksCount,
};