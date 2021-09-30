const {
  ThreadHandler,
  SlashCommandHandler,
  VoiceHandler,
} = require('../src/index.js')

//Creating Channel Instance for Particular Text Channel
const ChannelInstance = new ThreadHandler(Client, {
  guild: message,
  channel: message,
})

//Creating Thread Instance for Particular Thread-Main Channel
const ThreadInstance1 = await ChannelInstance.CreateThread(Options)
//Thread Channel OR Value
const Thread1 = ThreadInstance1.thread

const ThreadInstance2 = await ChannelInstance.CreateThread(Options)
const Thread2 = ThreadInstance2.thread

console.log(Thread1)
console.log(Thread2)

//Slash Command handler Usage
const SlashCommandInstance = new SlashCommandHandler(Client, {
  guild: message,
})
//Slash Command Handler to Set Commands
await SlashCommandInstance.set(Commands)
//Slash Command Handler to Deploy Commands
await SlashCommandInstance.deploy()

const Voice_Handler = new VoiceHandler(Client, {
  LeaveOnEmpty: true,
})
const VoiceConnection = await Voice_Handler.join(channel)
Voice_Handler.destroy()
Voice_Handler.disconnect()
