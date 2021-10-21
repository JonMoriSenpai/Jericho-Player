class ClassUtils {
  static extractoptions(Local, Parent) {
    const ProcessOptions = {};
    const Options = Object.keys(Local);
    for (let count = 0, len = Options.length; count < len; ++count) {
      ProcessOptions[Options[count]] = (typeof Local[Options[count]] === 'object'
        && Local[Options[count]] !== undefined
        && Parent[Options[count]] !== undefined
        && Local[Options[count]]
        && !Local[Options[count]][0]
        ? ClassUtils.extractoptions(Local[Options[count]])
        : null)
        ?? (Local[Options[count]] === undefined
          ? Parent[Options[count]]
          : Local[Options[count]]);
    }
    return ProcessOptions;
  }
}

module.exports = ClassUtils;
