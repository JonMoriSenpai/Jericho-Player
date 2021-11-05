# Using Cookies to avoid 429

```js
const { JerichoPlayer } = require('jericho-player')

const player = new JerichoPlayer(client, {
  ExtractorStreamOptions: { Cookies: String },
})
```

> Keep in mind that using `cookies` after getting `429` **does not fix the problem**.
> You should use `cookies` before getting `429` which helps to **_reduce_** `Error: Status Code 429`
