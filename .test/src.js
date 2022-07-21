const { Client, GatewayIntentBits } = require("discord.js");
const Player = require("../src/core/player");
const configs = require("./config.json");

let discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

//import { Player } from '../src/index.mjs'
var player = new Player(discordClient);
player.on("error", (...data) => console.log(data));

//Play Command for Queue per Guild scenerio
setTimeout(() => {
  new Promise(async () => {
    const Queue = await player.createQueue(configs.guildId);
    await Queue.play("Despacito", "853939423611453480");
  });
}, 5 * 1000);

discordClient.login(configs?.token);
/**
 * for more detailed explanation , visit -> https://github.com/SidisLiveYT/Jericho-Player#community-bots-made-with-jericho-player
 */
