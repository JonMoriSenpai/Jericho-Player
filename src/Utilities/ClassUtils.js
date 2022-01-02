const { resolve, dirname } = require('path')
const { FFmpeg } = require('prism-media')
const {
  DefaultUserDrivenAudioFilters,
  DefaultAudioFilters,
} = require('../types/interfaces')

/**
 * @class ClassUtils -> Class Util's methods are for Class's Support and helping basic or extract support neccassity tools
 */
class ClassUtils {
  /**
   * stablizingoptions() -> Stabilizing Local and Parent Options with accuracy 80%
   * @param {Object} Local Local function/method options
   * @param {Object} Parent Parent function/method options
   * @param {Number|void} RecursiveTimes Limit for Infinite Loop of Stabilizing
   * @returns {Object} Finalized Options with Structure or Array Types
   */

  static stablizingoptions(Local, Parent, RecursiveTimes = 0) {
    if (RecursiveTimes > 3 || Array.isArray(Local) || Array.isArray(Parent))
      return Local
    if (!Local || typeof Local !== 'object') return Parent
    if (!Parent || typeof Parent !== 'object') return Local
    const ProcessOptions = {}
    const LocalObjects = Object.keys(Local)
    const ParentObjects = Object.keys(Parent)
    const Options =
      LocalObjects.length > ParentObjects.length ? LocalObjects : ParentObjects
    for (let count = 0, len = Options.length; count < len; ++count) {
      if (
        typeof Local[Options[count]] === 'object' &&
        Local[Options[count]] !== undefined &&
        Parent[Options[count]] !== undefined &&
        Local[Options[count]] &&
        !['metadata'].includes(Options[count].toLowerCase().trim()) &&
        !Array.isArray(Local[Options[count]])
      ) {
        ProcessOptions[Options[count]] = ClassUtils.stablizingoptions(
          Local[Options[count]],
          Parent[Options[count]],
          ++RecursiveTimes,
        )
      } else if (Local[Options[count]] === undefined)
        ProcessOptions[Options[count]] = Parent[Options[count]]
      else ProcessOptions[Options[count]] = Local[Options[count]]
    }
    return ProcessOptions
  }

  /**
   * ScanDeps() -> Scanning Dependencies in package.json or node_modules for package or versions list
   * @param {String|void} packageName Package name for publishing it versions in project
   * @returns {String|void} Publish Data which was requested for like checks and versions
   */

  static ScanDeps(packageName) {
    if (!packageName) {
      const report = []
      const addVersion = (name) => report.push(
        `- ${name}: ${ClassUtils.__versioning(name) ?? 'not found'}`,
      )
      // general
      report.push('Core Dependencies')
      addVersion('@discordjs/voice')
      addVersion('prism-media')
      report.push('')

      // opus
      report.push('Opus Libraries')
      addVersion('@discordjs/opus')
      addVersion('opusscript')
      report.push('')

      // encryption
      report.push('Encryption Libraries')
      addVersion('sodium')
      addVersion('libsodium-wrappers')
      addVersion('tweetnacl')
      report.push('')

      // ffmpeg
      report.push('FFmpeg')
      try {
        const info = FFmpeg.getInfo()
        report.push(`- version: ${info.version}`)
        report.push(
          `- libopus: ${
            info.output.includes('--enable-libopus') ? 'yes' : 'no'
          }`,
        )
      } catch (err) {
        report.push('- not found')
      }
      addVersion('ffmpeg-static')
      report.push('')

      // Extractors
      report.push('Extractors')
      addVersion('playdl-music-extractor')
      addVersion('video-extractor')

      return ['-'.repeat(50), ...report, '-'.repeat(50)].join('\n')
    }
    return (
      ClassUtils.__versioning(packageName) ??
      ClassUtils.__versioning(packageName.toLowerCase().trim())
    )
  }

  /**
   * @private __versioning() -> Searching Versions of Packages
   * @param {String} name NPM Package Name
   * @returns {String|void} Returns Package Version
   */

  static __versioning(name) {
    try {
      const pkg =
        name === '@discordjs/voice'
          ? require('../../package.json')
          : ClassUtils.__SearchPackageJson(
            dirname(require.resolve(name)),
            name,
            8,
          )
      return pkg?.version ?? undefined
    } catch (err) {
      return undefined
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
    if (depth === 0) return undefined
    const attemptedPath = resolve(dir, './package.json')
    try {
      const pkg = require(attemptedPath)
      if (pkg.name !== packageName)
        throw new Error('package.json does not match')
      return pkg
    } catch (err) {
      return ClassUtils.__SearchPackageJson(
        resolve(dir, '..'),
        packageName,
        depth - 1,
      )
    }
  }

  /**
   * HumanTimeConversion() -> Human Time Conversion Function with two categories
   * @param {String|Number|void} Type1 Convert Milliseconds to Human Time Language
   * @param {Object[]|void} Type2 Convert Milliseconds to Human Time variables
   * @param {String|void} Type3 Convert Standared hh:mm:ss to Seconds Data
   * @returns {String|void} Returns String with desired value
   */

  static HumanTimeConversion(
    Type1 = undefined,
    Type2 = undefined,
    Type3 = undefined,
  ) {
    if (Type1) {
      const DurationMilliSeconds = Type1 / 1000
      let ProcessedString = ''
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
        DurationArray[SideArray][0] !== 0 &&
          (ProcessedString += ` ${DurationArray[SideArray][0]} ${
            DurationArray[SideArray][0] === 1
              ? DurationArray[SideArray][1].substr(
                0,
                DurationArray[SideArray][1].length - 1,
              )
              : DurationArray[SideArray][1]
          }`)
      }
      return ProcessedString.trim()
    }
    if (Type2) {
      const TimeData = new Date(Number(Type2.Time))
      const days = TimeData.getUTCDate() - 1
      const hours = TimeData.getUTCHours()
      const minutes = TimeData.getUTCMinutes()
      const seconds = TimeData.getUTCSeconds()
      const milliseconds = TimeData.getUTCMilliseconds()

      const TimeString = []
      if (days) TimeString.push(days)
      if (hours && !Type2.ignore.includes('hour'))
        TimeString.push(hours < 10 && days > 0 ? `0${hours}` : hours)
      !Type2.ignore.includes('min')
        ? TimeString.push(minutes < 10 ? `0${minutes}` : minutes)
        : undefined
      !Type2.ignore.includes('sec')
        ? TimeString.push(seconds < 10 ? `0${seconds}` : seconds)
        : undefined
      !Type2.ignore.includes('milliseconds')
        ? TimeString.push(milliseconds < 10 ? `0${milliseconds}` : milliseconds)
        : undefined
      return TimeString.join(':')
    }
    if (Type3) {
      const TimeArray = typeof Type3 === 'string' ? Type3.split(':') : Type3
      let milliseconds = 0
      let GarbageValue = 1

      while (TimeArray.length > 0) {
        milliseconds += GarbageValue * parseInt(TimeArray.pop(), 10)
        GarbageValue *= 60
      }

      return milliseconds
    }
    return '0 Seconds'
  }

  /**
   * @static
   * FiltersConverter() -> Converter for AudioFilters (private function , but making public for if moments)
   * @param {String[]|Object} FiltersArray
   */
  static AudioFiltersConverter(FiltersArray) {
    if (FiltersArray && FiltersArray[0]) {
      const ObjectKeys = Object.keys(DefaultAudioFilters)
      for (let count = 0, len = ObjectKeys.length; count < len; count++) {
        if (
          DefaultAudioFilters[`${ObjectKeys[count]}`] &&
          FiltersArray.includes(
            DefaultAudioFilters[`${ObjectKeys[count]}`].trim(),
          )
        )
          DefaultUserDrivenAudioFilters[`${ObjectKeys[count]}`] = true
      }
      return DefaultUserDrivenAudioFilters
    }
    const Filterkeys = Object.keys(FiltersArray)
    const CacheArray = []
    for (let count = 0, len = Filterkeys.length; count < len; count++) {
      if (
        DefaultAudioFilters[`${Filterkeys[count]}`] &&
        FiltersArray[`${Filterkeys[count]}`]
      ) {
        CacheArray.push(`${DefaultAudioFilters[`${Filterkeys[count]}`].trim()}`)
      }
    }
    return CacheArray
  }

  /**
   * @static
   * Wait for Milliseconds for Delay between processes
   * @param {Number|String|void} Milliseconds Time in Milliseconds
   * @returns {Promise<void>} return undefined for no return
   */
  static async TimeWait(Milliseconds = 1000) {
    return await new Promise((resolve) => setTimeout(resolve, Number(Milliseconds)))
  }

  /**
   * @static
   * Checks for Valid Url and returns Boolean Results
   * @param {String} Url Raw url for Url Checks
   * @return {Promise<Boolean>} returns undefined on completion
   */
  static async isUriCheck(Url) {
    if (!Url || (Url && typeof Url !== 'string')) {
      return false
    }
    const ProtocolAndDomainRegEx = /^(?:\w+:)?\/\/(\S+)$/
    const LocalHostDomainRegEx = /^localhost[\:?\d]*(?:[^\:?\d]\S*)?$/
    const NonLocalHostDomainRegEx = /^[^\s\.]+\.\S{2,}$/
    const SearchMatchResults = Url.match(ProtocolAndDomainRegEx)
    if (!SearchMatchResults || (SearchMatchResults && !SearchMatchResults[1])) {
      return false
    }
    if (
      LocalHostDomainRegEx.test(SearchMatchResults[1]) ||
      NonLocalHostDomainRegEx.test(SearchMatchResults[1])
    ) {
      return true
    }
    return false
  }

  /**
   * @static
   * Resolve for Accurate Data in Structure form
   * @param {String|Object} RawValue Raw Value to Resolve
   * @param {String|void} ReturnType Return Type after resolve
   * @return {String|Object|void} returns undefined on completion
   */
  static ResolverLTE(RawValue, ReturnType) {
    if (!RawValue || !(ReturnType && typeof ReturnType === 'string'))
      return undefined
    if (
      RawValue &&
      ReturnType &&
      (typeof RawValue === 'string' || typeof RawValue === 'number') &&
      ReturnType.toLowerCase().trim().includes('id')
    )
      return RawValue

    // Message Existence Check and Enumerate for Return Type Data
    if (
      RawValue.channel &&
      [
        'GUILD_NEWS',
        'GUILD_TEXT',
        'GUILD_NEWS_THREAD',
        'GUILD_PUBLIC_THREAD',
        'GUILD_PRIVATE_THREAD',
      ].includes(RawValue.channel.type)
    ) {
      if (ReturnType && ReturnType.toLowerCase().trim() === 'message')
        return RawValue
      if (
        ReturnType &&
        ReturnType.toLowerCase().trim() === 'messageid' &&
        RawValue.id
      )
        return RawValue.id
      if (
        ReturnType &&
        RawValue.channel &&
        RawValue.channel.parent &&
        RawValue.channel.parent.type === 'GUILD_CATEGORY' &&
        ReturnType.toLowerCase().trim() === 'cateogrychannel'
      )
        return RawValue.channel.parent
      if (
        ReturnType &&
        RawValue.channel &&
        RawValue.channel.parent &&
        RawValue.channel.parent.type === 'GUILD_CATEGORY' &&
        ReturnType.toLowerCase().trim() === 'cateogrychannel' &&
        RawValue.channel.parent.id
      )
        return RawValue.channel.parent.id
      if (ReturnType && ReturnType.toLowerCase().trim().includes('channel'))
        RawValue = RawValue.channel
      else if (
        ReturnType &&
        ReturnType.toLowerCase().trim() === 'guild' &&
        RawValue.guild
      )
        return RawValue.guild
      else if (
        ReturnType &&
        ReturnType.toLowerCase().trim() === 'guildid' &&
        (RawValue.guild || RawValue.guildId)
      )
        return (
          RawValue.guildId ?? (RawValue.guild ? RawValue.guild.id : undefined)
        )
      else return undefined
    }

    // Text Channel Existence Check and Enumerate for Return Type Data

    if (
      RawValue.type &&
      [
        'GUILD_NEWS',
        'GUILD_TEXT',
        'GUILD_NEWS_THREAD',
        'GUILD_PUBLIC_THREAD',
        'GUILD_PRIVATE_THREAD',
        'GUILD_STAGE_VOICE',
        'GUILD_VOICE',
        'GUILD_CATEGORY',
      ].includes(RawValue.type)
    ) {
      if (
        ReturnType &&
        RawValue.type === 'GUILD_TEXT' &&
        ReturnType.toLowerCase().trim() === 'textchannel'
      )
        return RawValue
      if (
        ReturnType &&
        RawValue.type === 'GUILD_TEXT' &&
        ReturnType.toLowerCase().trim() === 'textchannelid' &&
        RawValue.id
      )
        return RawValue.id
      if (
        ReturnType &&
        RawValue.type === 'GUILD_NEWS' &&
        ReturnType.toLowerCase().trim() === 'newschannel'
      )
        return RawValue
      if (
        ReturnType &&
        RawValue.type === 'GUILD_NEWS' &&
        ReturnType.toLowerCase().trim() === 'newschannelid' &&
        RawValue.id
      )
        return RawValue.id
      if (
        ReturnType &&
        RawValue.type === 'GUILD_NEWS_THREAD' &&
        ReturnType.toLowerCase().trim() === 'newsthreadchannel'
      )
        return RawValue
      if (
        ReturnType &&
        RawValue.type === 'GUILD_NEWS_THREAD' &&
        ReturnType.toLowerCase().trim() === 'newsthreadchannelid' &&
        RawValue.id
      )
        return RawValue.id
      else if (
        ReturnType &&
        RawValue.type === 'GUILD_PUBLIC_THREAD' &&
        ReturnType.toLowerCase().trim() === 'publicthreadchannel'
      )
        return RawValue
      else if (
        ReturnType &&
        RawValue.type === 'GUILD_PUBLIC_THREAD' &&
        ReturnType.toLowerCase().trim() === 'publicthreadchannelid' &&
        RawValue.id
      )
        return RawValue.id
      else if (
        ReturnType &&
        RawValue.type === 'GUILD_PRIVATE_THREAD' &&
        ReturnType.toLowerCase().trim() === 'privatethreadchannel'
      )
        return RawValue
      else if (
        ReturnType &&
        RawValue.type === 'GUILD_PRIVATE_THREAD' &&
        ReturnType.toLowerCase().trim() === 'privatethreadchannelid' &&
        RawValue.id
      )
        return RawValue.id
      else if (
        ReturnType &&
        RawValue.type === 'GUILD_STAGE_VOICE' &&
        ReturnType.toLowerCase().trim() === 'stagechannel'
      )
        return RawValue
      else if (
        ReturnType &&
        RawValue.type === 'GUILD_STAGE_VOICE' &&
        ReturnType.toLowerCase().trim() === 'stagechannelid' &&
        RawValue.id
      )
        return RawValue.id
      else if (
        ReturnType &&
        RawValue.type === 'GUILD_VOICE' &&
        ReturnType.toLowerCase().trim() === 'voicechannel'
      )
        return RawValue
      else if (
        ReturnType &&
        RawValue.type === 'GUILD_VOICE' &&
        ReturnType.toLowerCase().trim() === 'voicechannelid' &&
        RawValue.id
      )
        return RawValue.id
      else if (
        ReturnType &&
        RawValue.type === 'GUILD_CATEGORY' &&
        ReturnType.toLowerCase().trim() === 'cateogrychannel'
      )
        return RawValue
      else if (
        ReturnType &&
        RawValue.type === 'GUILD_CATEGORY' &&
        ReturnType.toLowerCase().trim() === 'cateogrychannelid' &&
        RawValue.id
      )
        return RawValue.id
      else if (
        ReturnType &&
        ReturnType.toLowerCase().trim() === 'guild' &&
        RawValue.guild
      )
        return RawValue.guild
      else if (
        ReturnType &&
        ReturnType.toLowerCase().trim() === 'guildid' &&
        (RawValue.guild || RawValue.guildId)
      )
        return (
          RawValue.guildId ?? (RawValue.guild ? RawValue.guild.id : undefined)
        )
      else return undefined
    }

    // Guild Existence Check and Enumerate for Return Type Data

    if (RawValue.ownerId) {
      if (ReturnType && ReturnType.toLowerCase().trim() === 'guild')
        return RawValue
      else if (ReturnType && ReturnType.toLowerCase().trim() === 'guildid')
        return RawValue.id
      else return undefined
    }
    return undefined
  }
}

module.exports = ClassUtils
