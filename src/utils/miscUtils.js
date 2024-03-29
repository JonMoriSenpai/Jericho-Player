const { Client, IntentsBitField } = require('discord.js');
const { resolve, dirname } = require('path');
const { FFmpeg } = require('prism-media');
const prettyMs = require('pretty-mslux');

class miscUtils {
  /**
   * scanDeps() -> Scanning Dependencies in package.json or node_modules for package or versions list
   * @param {String|void} packageName Package name for publishing it versions in project
   * @returns {String|void} Publish Data which was requested for like checks and versions
   */

  static scanDeps(packageName) {
    if (!packageName) {
      const report = [];
      const addVersion = (name) => report.push(
        `- ${name}: ${miscUtils.__findPkgVersion(name) ?? 'not found'}`,
      );
      // general
      report.push('Core Dependencies');
      addVersion('@discordjs/voice');
      addVersion('prism-media');
      report.push('');

      // opus
      report.push('Opus Libraries');
      addVersion('@discordjs/opus');
      addVersion('opusscript');
      report.push('');

      // encryption
      report.push('Encryption Libraries');
      addVersion('sodium');
      addVersion('libsodium-wrappers');
      addVersion('tweetnacl');
      report.push('');

      // ffmpeg
      report.push('FFmpeg');
      try {
        const info = FFmpeg.getInfo();
        report.push(`- version: ${info.version}`);
        report.push(
          `- libopus: ${
            info.output.includes('--enable-libopus') ? 'yes' : 'no'
          }`,
        );
      } catch (err) {
        report.push('- not found');
      }
      addVersion('ffmpeg-static');
      report.push('');

      // Extractors
      report.push('Extractors');
      addVersion('playdl-music-extractor');
      addVersion('video-extractor');

      return ['-'.repeat(50), ...report, '-'.repeat(50)].join('\n');
    }
    return (
      miscUtils.__findPkgVersion(packageName) ??
      miscUtils.__findPkgVersion(packageName.toLowerCase().trim())
    );
  }

  /**
   * @private __findPkgVersion() -> Searching Versions of Packages
   * @param {String} name NPM Package Name
   * @returns {String|void} Returns Package Version
   */

  static __findPkgVersion(name) {
    try {
      const pkg =
        name === '@discordjs/voice'
          ? require('../../package.json')
          : miscUtils.__searchPackageJson(
            dirname(require.resolve(name)),
            name,
            8,
          );
      return pkg?.version ?? undefined;
    } catch (err) {
      return undefined;
    }
  }
  /**
   * @private __searchPackageJson() -> Searching Every package.json with deps
   * @param {String} dir Directory name | value
   * @param {String} packageName NPM Package Name
   * @param {Number} depth Depth to go in Directories or outward
   * @returns {Object} pacakge.json file with accurate versions
   */

  static __searchPackageJson(dir, packageName, depth) {
    if (depth === 0) return undefined;
    const attemptedPath = resolve(dir, './package.json');
    try {
      const pkg = require(attemptedPath);
      if (pkg.name !== packageName)
        throw new Error('package.json does not match');
      return pkg;
    } catch (err) {
      return miscUtils.__searchPackageJson(
        resolve(dir, '..'),
        packageName,
        depth - 1,
      );
    }
  }

  static __initialBuildChecks(discordClient, playerInstance) {
    let FmpeggGarbage;
    let LibopusGarbage;
    const MissingDeps = [' '];
    MissingDeps.push(
      '--[ Missing Dependencies from package.json | Do - "npm i packageName" ]--',
    );
    try {
      const GarbageInfo = FFmpeg.getInfo();
      FmpeggGarbage = !!`- version: ${GarbageInfo.version}`;
      LibopusGarbage = !!`- libopus: ${
        GarbageInfo.output.includes('--enable-libopus') ? 'yes' : 'no'
      }`;
    } catch (err) {
      LibopusGarbage = FmpeggGarbage = undefined;
    }
    !miscUtils.scanDeps('@discordjs/voice')
      ? MissingDeps.push(`${MissingDeps.length - 1})  "@discordjs/voice"`)
      : undefined;
    !miscUtils.scanDeps('prism-media')
      ? MissingDeps.push(`${MissingDeps.length - 1})  "prism-media"`)
      : undefined;

    !miscUtils.scanDeps('@discordjs/opus') && !miscUtils.scanDeps('opusscript')
      ? MissingDeps.push(
        `${MissingDeps.length - 1})  "@discordjs/opus" OR "opusscript"`,
      )
      : undefined;

    !miscUtils.scanDeps('tweetnacl') &&
    !(miscUtils.scanDeps('libsodium-wrapper') && miscUtils.scanDeps('sodium'))
      ? MissingDeps.push(
        `${
          MissingDeps.length - 1
        })  "tweetnacl" OR ("libsodium-wrapper" And "sodium")`,
      )
      : undefined;

    !miscUtils.scanDeps('ffmpeg-static') && !(LibopusGarbage && FmpeggGarbage)
      ? MissingDeps.push(
        `${
          MissingDeps.length - 1
        })  "ffmpeg-static" OR "Ffmpeg from [https://www.ffmpeg.org/download.html]"`,
      )
      : undefined;

    !miscUtils.scanDeps('playdl-music-extractor') &&
    !miscUtils.scanDeps('video-extractor')
      ? MissingDeps.push(
        `${
          MissingDeps.length - 1
        })  "playdl-music-extractor" OR "video-extractor"`,
      )
      : undefined;
    if (MissingDeps[2]) {
      setTimeout(() => {
        playerInstance.emit(
          'error',
          playerInstance,
          new Error(
            [
              '-'.repeat(50),
              ...MissingDeps,
              '--[ queue value will be undefined By-default as it will trigger as ->  player.on("error",errorMessage) => {} ]--',
              '-'.repeat(50),
            ].join('\n'),
          ),
          { discordClient },
          'miscUtils.#__initialBuildChecks()',
        );
      }, 2 * 1000);
    }
    if (!(discordClient && discordClient instanceof Client)) {
      throw Error(
        'Invalid Discord Client has been Detected! | And get some Voice and Channel Intents too',
      );
    }

    setTimeout(() => {
      if (
        !new IntentsBitField(discordClient.options.intents).has(
          IntentsBitField.Flags.GuildVoiceStates,
        ) &&
        !new IntentsBitField(discordClient.options.intents).has(
          IntentsBitField.Flags.Guilds,
        )
      ) {
        throw SyntaxError(
          'Missing Intents in Discord Client\n - IntentsBitField.Flags.GuildVoiceStates\n - - IntentsBitField.Flags.Guilds',
        );
      } else if (
        !new IntentsBitField(discordClient.options.intents).has(
          IntentsBitField.Flags.GuildVoiceStates,
        )
      ) {
        throw SyntaxError(
          'Missing Intents in Discord Client\n - IntentsBitField.Flags.GuildVoiceStates',
        );
      } else if (
        !new IntentsBitField(discordClient.options.intents).has(
          IntentsBitField.Flags.Guilds,
        )
      ) {
        throw SyntaxError(
          'Missing Intents in Discord Client\n -IntentsBitField.Flags.Guilds',
        );
      } else return undefined;
    }, 45 * 1000);
  }

  /**
   * @static
   * Wait for Milliseconds for Delay between processes
   * @param {Number|String|void} Milliseconds Time in Milliseconds
   * @returns {Promise<void>} return undefined for no return
   */
  static async TimeWait(Milliseconds = 1000) {
    return await new Promise((resolve) => setTimeout(resolve, Number(Milliseconds)));
  }

  /**
   * @static
   * Checks for Valid Url and returns Boolean Results
   * @param {String} Url Raw url for Url Checks
   * @return {Promise<Boolean>} returns undefined on completion
   */
  static async isUriCheck(Url) {
    if (!Url || (Url && typeof Url !== 'string')) {
      return false;
    }
    const ProtocolAndDomainRegEx = /^(?:\w+:)?\/\/(\S+)$/;
    const LocalHostDomainRegEx = /^localhost[\:?\d]*(?:[^\:?\d]\S*)?$/;
    const NonLocalHostDomainRegEx = /^[^\s\.]+\.\S{2,}$/;
    const SearchMatchResults = Url.match(ProtocolAndDomainRegEx);
    if (!SearchMatchResults || (SearchMatchResults && !SearchMatchResults[1])) {
      return false;
    }
    if (
      LocalHostDomainRegEx.test(SearchMatchResults[1]) ||
      NonLocalHostDomainRegEx.test(SearchMatchResults[1])
    ) {
      return true;
    }
    return false;
  }

  /**
   * @static
   * @method watchDestroyed Watch Destroyed Function for NodeJS.Timeout Value if any
   * @param {object} queue Queue Instance for destroyed checks
   * @returns {Boolean} Returns Boolean Value for if statement or checker
   */

  static watchDestroyed = (queue) => {
    if (!queue) return true
    else if (queue?.destroyed && typeof queue?.destroyed === 'number') {
      clearTimeout(queue?.destroyed);
      queue.destroyed = false;
      return false;
    } else
      return Boolean(queue?.destroyed);
  };

  /**
   * @static @method readableTime convert milliseconds to human-readable format
   * @param {number} rawData Time as milliseconds
   * @param {string} type String type for switch case for types of converting
   * @returns {string | undefined} String Value or undefined on converting
   */

  static readableTime(rawData, type = 'colon') {
    if (
      !(
        ((rawData && !isNaN(Number(rawData))) || parseInt(rawData) === 0) &&
        parseInt(rawData) >= 0 &&
        type &&
        typeof type === 'string' &&
        type?.trim() !== ''
      )
    )
      return undefined;
    switch (type?.toLowerCase()?.trim()) {
      case 'colon':
        return prettyMs(rawData, {
          colonNotation: true,
          keepDecimalsOnWholeSeconds: false,
        });
      case 'small':
        return prettyMs(rawData);
      case 'big':
        return prettyMs(rawData, { verbose: true });
      case 'compact':
        return prettyMs(rawData, {
          compact: true,
          keepDecimalsOnWholeSeconds: false,
        });
      default:
        return undefined;
    }
  }
}

module.exports = miscUtils;
