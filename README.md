<div align="center">
  <br />
  <p>
    <a href="https://jericho-player.js.org"><img src="https://raw.githubusercontent.com/SidisLiveYT/Jericho-Player/main/.github/asserts/logo.svg" width="546" alt="jericho-player" /></a>
  </p>
  <br />
<p>
<a href="https://discord.gg/MfME24sJ2a"><img src="https://img.shields.io/discord/795434308005134406?color=5865F2&logo=discord&logoColor=white" alt="Discord server" /></a>
<a href="https://www.npmjs.com/package/jericho-player"><img src="https://img.shields.io/npm/v/jericho-player.svg?maxAge=3600" alt="npm version" /></a>
<a href="https://www.npmjs.com/package/jericho-player"><img src="https://img.shields.io/npm/dt/jericho-player.svg?maxAge=3600" alt="npm downloads" /></a>
<a href="https://github.com/SidisLiveYT/Jericho-Player/actions"><img src="https://github.com/discordjs/discord.js/workflows/Testing/badge.svg" alt="Tests status" /></a>
</p>
</div>

LightWeight Framework for **[discord.js v13](https://discord.js.org)** Music Bots and Radio Bots with fast moderation with commands and no memory leak mode.

## Installation

### Install **[jericho-player](https://npmjs.com/package/jericho-player)**

```sh
$ npm install --save jericho-player
```

### Install **[@discordjs/opus](https://npmjs.com/package/@discordjs/opus) OR [opusscript](https://npmjs.com/package/opusscript)**

```sh
$ npm install --save @discordjs/opus
              OR
$ npm install --save opusscript
```

### Install **[@discordjs/voice](https://npmjs.com/package/@discordjs/voice)**

```sh
$ npm install --save @discordjs/voice
```

### Install FFmpeg or Avconv

- Official FFMPEG Website: **[https://www.ffmpeg.org/download.html](https://www.ffmpeg.org/download.html)**

- Node Module (FFMPEG): **[https://npmjs.com/package/ffmpeg-static](https://npmjs.com/package/ffmpeg-static)**

- Avconv: **[https://libav.org/download](https://libav.org/download)**

# Features

- Simple & easy to use 🤘
- Beginner friendly 😱
- Auto Proxy Feature
- Lightweight 🛬
- No-Memory-Leak-Mode Present and optimised based on [@discordjs/voice](https://npmjs.com/package/@discordjs/voice)
- play-dl or youtube-dl extractors support 🌌
- Multiple sources support ✌
- Supports Custom Youtube Cookies and Proxies
- Play in multiple servers at the same time 🚗

## [Documentation](https://jericho-player.js.org)

# Supported websites

By default, jericho-player supports **YouTube**, **Spotify**, **facebook**, **SoundCloud** and **Arbitary Links** streams only.

### Optional dependencies

Jericho Player got some **Custom Extractors** that enables you to use and fast Extraction. Some packages have been made by the Sid is Live YT to add new features using this Extractors.

#### [playdl-music-extractor](https://npmjs.com/package/playdl-music-extractor) (optional and latest)

Optional package that adds support for `vimeo`, `reverbnation`, `facebook`.
You just need to install it using `npm i --save playdl-music-extractor` (jericho-player will automatically detect and use it).

#### [video-extractor](https://npmjs.com/package/video-extractor) (optional)

`video-extractor` is an optional package that brings support for +700 websites by using `youtube-dl` . The Npm Package Link is available [here](https://npmjs.com/package/video-extractor). And You can install Custom Extractor by `npm i --save video-extractor`

# Community Bots made with Jericho Player

These bots are made by the community, they can help you build your own!

- `[ Updated ] ` **[Fairy Tale - Jericho Player](https://github.com/SidisLiveYT/Jericho-Player-Discord-Bot)** by [SidisLiveYT](https://github.com/SidisLiveYT)
- `[ Updated ] ` **[GoldenV13 - Discord Bot](https://github.com/spasten-studio/GoldenV13)** by [Spasten.Studio](https://github.com/Spasten-Studio)

# Advanced

### Use cookies

```js
const player = new Player(client, {
    ExtractorStreamOptions: {
        Cookies: //Youtube Cookies String Value
    }
});
```

### Use custom proxies

```js
// Remove "user:pass@" if you don't need to authenticate to your proxy.
const proxy = "http://user:pass@111.111.111.111:8080";

const player = new Player(client, {
  ExtractorStreamOptions: {
    Proxy: [proxy], //Proxy Value from Array
  },
});
```

### Use Custom User-Agents

```js

const player = new Player(client, {
  ExtractorStreamOptions: {
    UserAgents: [user-agent], //User-Agents from browser to avoid 429 Errors in 'playdl-music-extractor'
  },
});
```
