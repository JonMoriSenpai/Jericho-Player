const Player = require('./Handlers/Player');
const Utils = require('./Utilities/ClassUtils');
const VoiceUtils = require('./Utilities/VoiceUtils');
const {
  DefaultModesType,
  DefaultUserDrivenAudioFilters,
  DefaultModesName,
} = require('./types/interfaces');

module.exports = {
  Player,
  Utils,
  VoiceUtils,
  DefaultModesTypes: DefaultModesType,
  PlayerModesTypes: DefaultModesType,
  QueueAudioFilters: DefaultUserDrivenAudioFilters,
  AudioFilters: DefaultUserDrivenAudioFilters,
  PlayerRepeatModes: DefaultModesName,
};
