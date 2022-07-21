const { playdl } = require('playdl-music-extractor');
const packets = require('./packets');

class downloader {
  /**
   *
   * @param {packets} packet
   * @param {object<any>} options
   */
  constructor(packet, options) {
    this.packet = packet;
    this.queue = packet?.queue;
    this.player = packet?.player;
    this.eventEmitter = packet?.eventEmitter;
    this.options = options;
    this.playdl = new playdl(options?.playdlOptions);

    this.playdl.on('playlist', (playlist) => (playlist ? this.packet?.__playlistMod(playlist) : undefined));

    this.playdl.on(
      'track',
      async (extractor, playlist, rawTrack, metadata) => await this.packet.__tracksMod(extractor, playlist, rawTrack, metadata),
    );
  }

  async get(rawQuery, requestedBy, options) {
    if (!(rawQuery && typeof rawQuery === 'string' && rawQuery !== ''))
      return undefined;
    else
      return await this.getPlaydl(
        rawQuery,
        requestedBy,
        options?.playdlOptions,
      );
  }

  async getPlaydl(rawQuery, requestedBy, options) {
    this.eventEmitter.emitDebug(
      'playdl - Extractor',
      'Making Request to playdl extractors for parsing and fetch required Track Data',
      {
        rawQuery,
        downloaderOptions: options,
      },
    );
    return await this.playdl.exec(rawQuery, {
      ...options,
      streamDownload: true,
    });
  }
}

module.exports = downloader;
