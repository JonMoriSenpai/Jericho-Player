const JerichoPlayer = require('./Handlers/Player-Handler');
const ClassUtils = require('./Utilities/Class-Utils');

const Utils = {};
Utils.ScanDeps = ClassUtils.ScanDeps;

module.exports = {
  JerichoPlayer,
  Utils,
};
