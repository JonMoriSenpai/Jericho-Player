const fileSystem = require('fs');
const path = require('path');
const { Options } = require('../misc/enums');

class eventEmitter {
  constructor(
    player,
    config = {
      ignoreCrash: false,
      emitPlayer: true,
      errorName: 'Error',
      debugRegister: true,
    },
  ) {
    this.player = player;
    this.config = config;
  }

  emitError(
    eventMetadata,
    extraMetadata,
    eventLocation = 'unknown-location',
    eventVariable = undefined,
    config = {
      ignoreCrash: false,
      emitPlayer: true,
      errorName: 'Error',
      debugRegister: true,
    },
  ) {
    let processedError = '';
    config = { ...this.config, ...config };
    if (eventMetadata && eventMetadata instanceof Error && eventMetadata)
      processedError = `[ Error Name ] : ${eventMetadata?.name}\n[ Error Message ] :${eventMetadata?.message}\n[ Error Stack ] :\n${eventMetadata?.stack}`;
    else if (
      eventMetadata &&
      typeof eventMetadata === 'string' &&
      eventMetadata !== ''
    )
      processedError = eventMetadata;
    else if (
      extraMetadata &&
      typeof extraMetadata === 'string' &&
      extraMetadata !== ''
    )
      processedError = `${processedError}\n\nExtra Info :\n${extraMetadata}`;
    processedError += `\n\n Error Location: ${eventLocation}`;
    this.player?.emit('raw', new Date(), processedError, eventVariable);
    if (config?.emitPlayer && !config?.ignoreCrash)
      this.player?.emit(
        'error',
        new Date(),
        eventVariable?.queue ?? eventVariable?.player,
        eventMetadata,
        eventVariable,
        eventLocation,
      );
    if (config?.debugRegister)
      this.emitDebug(
        eventMetadata?.name ?? config?.errorName ?? 'Error',
        eventMetadata?.message ?? 'Unknown-Metadata',
        eventVariable,
      );
    if (config?.ignoreCrash)
      this.__writeOff(
        eventMetadata?.name ?? config?.errorName ?? 'Error',
        eventLocation,
        eventMetadata,
      );
    return true;
  }

  emitEvent(
    eventName,
    extraMetadata,
    eventVariable = {},
    config = {
      emitPlayer: true,
      debugRegister: true,
    },
  ) {
    config = { ...this.config, ...config };
    this.player?.emit('raw', new Date(), extraMetadata, eventVariable);
    if (config?.emitPlayer && eventName)
      this.player?.emit(
        eventName,
        new Date(),
        extraMetadata,
        ...Object.entries(eventVariable)?.map((d) => d?.[1]),
      );
    if (config?.debugRegister)
      this.emitDebug(
        eventName ?? 'Unknown-Event',
        extraMetadata ?? 'Unknown-Metadata',
        eventVariable,
      );
    return true;
  }

  emitDebug(eventName, extraMetadata, eventVariable = undefined) {
    this.player?.emit(
      'debug',
      new Date(),
      this.player,
      `( ${eventName} ) - ${extraMetadata}`,
      eventVariable,
    );
    return true;
  }

  __writeOff(errorName, eventLocation, eventMetadata) {
    if (!fileSystem.existsSync(path.join(__dirname, '/cache')))
      fileSystem.mkdirSync(path.join(__dirname, '/cache'));

    const __cacheLocation = path.join(__dirname, '/cache', '/__errorLogs.txt');
    if (!__cacheLocation) return undefined;
    if (!fileSystem.existsSync(__cacheLocation)) {
      fileSystem.writeFileSync(
        __cacheLocation,
        `${new Date()} | [ ${errorName} ]` +
          `\n ErrorMessage: ${
            eventMetadata?.message ?? `${eventMetadata}`
          }\n ErrorStack: ${
            eventMetadata?.stack ?? 'Unknown-Stack'
          }\n Error Location: ${eventLocation}`,
      );
    } else if (
      (fileSystem.readFileSync(__cacheLocation)?.length ?? 0) < 500000
    ) {
      fileSystem.appendFileSync(
        __cacheLocation,
        `\n\n${new Date()} | [ ${errorName} ]` +
          `\n ErrorMessage: ${
            eventMetadata?.message ?? `${eventMetadata}`
          }\n ErrorStack: ${
            eventMetadata?.stack ?? 'Unknown-Stack'
          }\n Error Location: ${eventLocation}`,
        'utf8',
      );
    } else {
      fileSystem.writeFileSync(
        __cacheLocation,
        `${new Date()} | [ ${errorName} ]` +
          `\n ErrorMessage: ${
            eventMetadata?.message ?? `${eventMetadata}`
          }\n ErrorStack: ${
            eventMetadata?.stack ?? 'Unknown-Stack'
          }\n Error Location: ${eventLocation}`,
      );
    }
    return true;
  }
}

module.exports = eventEmitter;
