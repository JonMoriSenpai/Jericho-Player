const { JerichoPlayer } = require('../src/index.js')

//import { JerichoPlayer } from '../src/index.mjs'
var player = new JerichoPlayer()


//Create Queue or Fetch Queue from Cache
const Queue = player.CreateQueue(message)

//Play Command for Queue per Guild scenerio
await Queue.play('Despacito', message.member.voice.channel, message.author)


/**
 * for more detailed explanation , visit -> https://github.com/SidisLiveYT/Jericho-Player-Discord-Bot
 */