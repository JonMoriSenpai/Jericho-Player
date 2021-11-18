const { resolve, dirname } = require('path');
const { FFmpeg } = require('prism-media');
const {
  DefaultUserDrivenAudioFilters,
  DefaultAudioFilters,
} = require('../types/interfaces');

/**
 * @class ClassUtils -> Class Util's methods are for Class's Support and helping basic or extract support neccassity tools
 */
class ClassUtils {
  /**
   * stablizingoptions() -> Stabilizing Local and Parent Options with accuracy 80%
   * @param {Object} Local Local function/method options
   * @param {Object} Parent Parent function/method options
   * @returns {Object} Finaliize Options
   */

  static stablizingoptions(Local, Parent) {
    if (!Local) return Parent;
    if (!Parent) return Local;
    const ProcessOptions = {};
    const Options = Object.keys(Local).length > Object.keys(Parent).length
      ? Object.keys(Local)
      : Object.keys(Parent);
    for (let count = 0, len = Options.length; count < len; ++count) {
      ProcessOptions[Options[count]] = (typeof Local[Options[count]] === 'object'
        && Local[Options[count]] !== undefined
        && Parent[Options[count]] !== undefined
        && Local[Options[count]]
        && !Local[Options[count]][0]
        ? ClassUtils.stablizingoptions(
          Local[Options[count]],
          Parent[Options[count]],
        )
        : undefined)
        ?? (Local[Options[count]] === undefined
          ? Parent[Options[count]]
          : Local[Options[count]]);
    }
    return ProcessOptions;
  }

  /**
   * ScanDeps() -> Scanning Dependencies in package.json or node_modules for package or versions list
   * @param {String|void} packageName Package name for publishing it sversion in project
   * @returns {String|void} Publish Data whaich was requested for
   */

  static ScanDeps(packageName) {
    if (!packageName) {
      const report = [];
      const addVersion = (name) => report.push(
        `- ${name}: ${ClassUtils.__versioning(name) ?? 'not found'}`,
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
      ClassUtils.__versioning(packageName)
      ?? ClassUtils.__versioning(packageName.toLowerCase().trim())
    );
  }

  /**
   * @private __versioning() -> Searching Versions of Packages
   * @param {String} name NPM Package Name
   * @returns {String|void} Returns Package Version
   */

  static __versioning(name) {
    try {
      const pkg = name === '@discordjs/voice'
        ? require('../../package.json')
        : ClassUtils.__SearchPackageJson(
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
   * @private __SearchPackageJson() -> Searching Every package.json with deps
   * @param {String} dir Directory name | value
   * @param {String} packageName NPM Package Name
   * @param {Number} depth Depth to go in Directories or outward
   * @returns {Object} pacakge.json file with accurate versions
   */

  static __SearchPackageJson(dir, packageName, depth) {
    if (depth === 0) return undefined;
    const attemptedPath = resolve(dir, './package.json');
    try {
      const pkg = require(attemptedPath);
      if (pkg.name !== packageName) throw new Error('package.json does not match');
      return pkg;
    } catch (err) {
      return ClassUtils.__SearchPackageJson(
        resolve(dir, '..'),
        packageName,
        depth - 1,
      );
    }
  }

  /**
   * HumanTimeConversion() -> Human Time Conversion Function with two categories
   * @param {String|Number|void} Type1 Convert Milliseconds to Human Time Language
   * @param {Object[]|void} Type2 Convert Milliseconds to Human Time variables
   * @param {String|void} Type3 Convert Standared hh:mm:ss to milliseoncds
   * @returns {String|void} Returns String with desired value
   */

  static HumanTimeConversion(
    Type1 = undefined,
    Type2 = undefined,
    Type3 = undefined,
  ) {
    if (Type1) {
      const DurationMilliSeconds = Type1 / 1000;
      let ProcessedString = '';
      for (
        let DurationArray = [
            [Math.floor(DurationMilliSeconds / 31536e3), 'Years'],
            [Math.floor((DurationMilliSeconds % 31536e3) / 86400), 'Days'],
            [
              Math.floor(((DurationMilliSeconds % 31536e3) % 86400) / 3600),
              'Hours',
            ],
            [
              Math.floor(
                (((DurationMilliSeconds % 31536e3) % 86400) % 3600) / 60,
              ),
              'Minutes',
            ],
            [
              Math.floor(
                (((DurationMilliSeconds % 31536e3) % 86400) % 3600) % 60,
              ),
              'Seconds',
            ],
          ],
          SideArray = 0,
          GarbageValue = DurationArray.length;
        SideArray < GarbageValue;
        SideArray++
      ) {
        DurationArray[SideArray][0] !== 0
          && (ProcessedString += ` ${DurationArray[SideArray][0]} ${
            DurationArray[SideArray][0] === 1
              ? DurationArray[SideArray][1].substr(
                0,
                DurationArray[SideArray][1].length - 1,
              )
              : DurationArray[SideArray][1]
          }`);
      }
      return ProcessedString.trim();
    }
    if (Type2) {
      const TimeData = new Date(Number(Type2.Time));
      const days = TimeData.getUTCDate() - 1;
      const hours = TimeData.getUTCHours();
      const minutes = TimeData.getUTCMinutes();
      const seconds = TimeData.getUTCSeconds();
      const milliseconds = TimeData.getUTCMilliseconds();

      const TimeString = [];
      if (days) TimeString.push(days);
      if (hours && !Type2.ignore.includes('hour')) TimeString.push(hours < 10 && days > 0 ? `0${hours}` : hours);
      !Type2.ignore.includes('min')
        ? TimeString.push(minutes < 10 ? `0${minutes}` : minutes)
        : undefined;
      !Type2.ignore.includes('sec')
        ? TimeString.push(seconds < 10 ? `0${seconds}` : seconds)
        : undefined;
      !Type2.ignore.includes('milliseconds')
        ? TimeString.push(milliseconds < 10 ? `0${milliseconds}` : milliseconds)
        : undefined;
      return TimeString.join(':');
    }
    if (Type3) {
      const TimeArray = typeof Type3 === 'string' ? Type3.split(':') : Type3;
      let milliseconds = 0;
      let GarbageValue = 1;

      while (TimeArray.length > 0) {
        milliseconds += GarbageValue * parseInt(TimeArray.pop(), 10);
        GarbageValue *= 60;
      }

      return milliseconds;
    }
    return '0 Seconds';
  }

  /**
   * @static
   * FiltersConverter() -> Converter for AudioFilters
   * @param {String[]|Object} FiltersArray
   */
  static AudioFiltersConverter(FiltersArray) {
    if (FiltersArray && FiltersArray[0]) {
      const ObjectKeys = Object.keys(DefaultAudioFilters);
      for (let count = 0, len = ObjectKeys.length; count < len; count++) {
        if (
          DefaultAudioFilters[`${ObjectKeys[count]}`]
          && FiltersArray.includes(
            DefaultAudioFilters[`${ObjectKeys[count]}`].trim(),
          )
        ) DefaultUserDrivenAudioFilters[`${ObjectKeys[count]}`] = true;
      }
      return DefaultUserDrivenAudioFilters;
    }
    const Filterkeys = Object.keys(FiltersArray);
    const CacheArray = [];
    for (let count = 0, len = Filterkeys.length; count < len; count++) {
      if (
        DefaultAudioFilters[`${Filterkeys[count]}`]
        && FiltersArray[`${Filterkeys[count]}`]
      ) {
        CacheArray.push(`${DefaultAudioFilters[`${Filterkeys[count]}`].trim()}`);
      }
    }
    return CacheArray;
  }
}

module.exports = ClassUtils;
