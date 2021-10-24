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
}

module.exports = ClassUtils;
