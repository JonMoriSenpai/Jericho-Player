# Jericho Player Custom Extractors

Custom Extractors like `playdl-music-extractor` and `video-extractor` for **Jericho Player**. Both having Auto-Proxy Feature to avoid ratelimit by-default

# Loading/Using Extractors

By-Default Jericho Player use `playdl-music-extractor` and have `play-dl` as Extractor in Queue or methods for fetching track from Extractors or give `youtube-dl` for fetching Stream from `Video-Extractor` and have to be installed by npm or yarn - `npm i video-extractor@latest` and Python is needed for video extractor

# Custom Default Extractors

## **[playdl-music-extractor](https://www.npmjs.com/package/playdl-music-extractor)**

This extractor enables optional sources such as `Discord Attachments`, `Vimeo`, `Facebook` and `Reverbnation`.

## **[video-extractor](https://www.npmjs.com/package/video-extractor)**

This extractor is based on **[YouTube DL](https://youtube-dl.org)**. This extractor enables `700+ websites` support. However, this extractor can get buggy and is not updated frequently. So, it is suggested to make your own extractor if you want to use it!

```js
const { Extractor } = require('video-extractor')

const Queue = Player.CreateQueue(message, { extractor: 'youtube-dl' })
```

> Jericho Player auto-detects and uses `video-extractor` if it is installed!
