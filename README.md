# Jericho Player
LightWeight Framework for  **[discord.js v13](https://discord.js.org)** Music Bots and Radio Bots with fast moderation with commands and no memory leak.

[![downloadsBadge](https://img.shields.io/npm/dt/jericho-player?style=for-the-badge)](https://npmjs.com/jericho-player)
[![versionBadge](https://img.shields.io/npm/v/jericho-player?style=for-the-badge)](https://npmjs.com/jericho-player)
[![discordBadge](https://img.shields.io/discord/795434308005134406?style=for-the-badge&color=7289da)](https://discord.gg/MfME24sJ2a)

## Installation

### Install **[jericho-player](https://npmjs.com/package/jericho-player)**

```sh
$ npm install --save jericho-player
```

### Install **[@discordjs/opus](https://npmjs.com/package/@discordjs/opus)**


```sh
$ npm install --save @discordjs/opus
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
- play-dl or youtube-dl extractors support 🌌
- Multiple sources support ✌
- Play in multiple servers at the same time 🚗

## [Documentation](https://jericho-player.js.org)


## Supported websites

By default, jericho-player supports **YouTube**, **Spotify**, **facebook** and **SoundCloud** streams only.

### Optional dependencies

Jericho Player got some **Custom Extractors** that enables you to use and fast Extraction. Some packages have been made by the Sid is Live YT to add new features using this Extractors.

#### [playdl-music-extractor](https://npmjs.com/package/playdl-music-extractor) (optional)

Optional package that adds support for `vimeo`, `reverbnation`, `facebook`.
You just need to install it using `npm i --save playdl-music-extractor` (jericho-player will automatically detect and use it).

#### [video-extractor](https://npmjs.com/package/video-extractor) (optional)

`video-extractor` is an optional package that brings support for +700 websites. The documentation is available [here](https://npmjs.com/package/video-extractor).

## Examples of bots made with Jericho Player

These bots are made by the community, they can help you build your own!

* **[Fairy Tale - Jericho Player](https://github.com/SidisLiveYT/Jericho-Player-Discord-Bot)** by [SidisLiveYT](https://github.com/SidisLiveYT)


## Advanced

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
        Proxy: [proxy] //Proxy Value from Array
    }
});
```