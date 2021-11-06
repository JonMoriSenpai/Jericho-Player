# Using Proxy to avoid 429

```js
const { JerichoPlayer } = require("jericho-player");

// Remove "user:pass@" if you don't need to authenticate to your proxy.

const proxy = "http://user:pass@111.111.111.111:8080";

const player = new JerichoPlayer(client, {
  ExtractorStreamOptions: { Proxy: [proxy] },
});
```