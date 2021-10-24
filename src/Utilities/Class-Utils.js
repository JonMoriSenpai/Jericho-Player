const { resolve, dirname } = require('path');
const { FFmpeg } = require('prism-media');

class ClassUtils {
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

  static ScanDeps(packageName) {
    if (!packageName) {
      const report = [];
      const addVersion = (name) => report.push(
        `- ${name}: ${ClassUtils.#__versioning(name) ?? 'not found'}`,
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
      // Extractors
      report.push('Extractors');
      addVersion('playdl-music-extractor');
      addVersion('video-extractor');

      return ['-'.repeat(50), ...report, '-'.repeat(50)].join('\n');
    } return (
      ClassUtils.#__versioning(packageName)
        ?? ClassUtils.#__versioning(packageName.toLowerCase().trim())
    );
  }

  static #__versioning(name) {
    try {
      const pkg = name === '@discordjs/voice'
        ? require('../../package.json')
        : ClassUtils.#__SearchPackageJson(
          dirname(require.resolve(name)),
          name,
          4,
        );
      return pkg?.version ?? undefined;
    } catch (err) {
      return undefined;
    }
  }

  static #__SearchPackageJson(dir, packageName, depth) {
    if (depth === 0) return undefined;
    const attemptedPath = resolve(dir, './package.json');
    try {
      const pkg = require(attemptedPath);
      if (pkg.name !== packageName) throw new Error('package.json does not match');
      return pkg;
    } catch (err) {
      return ClassUtils.#__SearchPackageJson(
        resolve(dir, '..'),
        packageName,
        depth - 1,
      );
    }
  }
}

module.exports = ClassUtils;
