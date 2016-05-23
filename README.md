# Ionic 2 cache service

My Ionic 2 cache service that can cache almost everything, include requests. It's made up to use WebSQL or SQLite 
as storage and work well with Observables.

**It's not well tested yet, so use it at your own risk.** Please report all bugs to bug report or fix it, or 
better fix it and send pull request :)

## Install

Simple copy file to your providers folder and inject it in app.js file.

```js
import {CacheProvider} from "./providers/cache-provider/cache-provider";

@App({
    templateUrl: "build/app.html",
    providers: [CacheProvider]
})
class MyApp {
    static get parameters() {
        return [[IonicApp], [Platform], [CacheProvider]];
    }

    constructor(app, platform, http, user, network, cache) {
        ...
        this.cache = cache;

        this.cache.setTTL(20); //set default cache TTL for 1 minute
        ....
    }
    ...
```

## Usage

#### Cache request response body

```js
import {CacheProvider} from '../cache-provider/cache-provider';

@Injectable()
export class CategoryProvider {
    static get parameters() {
        return [[Http], [CacheProvider]]
    }

    constructor(http, cache) {
        this.http = http;
        this.cache = cache;
    }

    loadList() {
        let url = "http://google.com";
        let cacheKey = url;

        let request = this.http.get(url).map(res => res.json());
        return this.cache.loadItem(cacheKey, request);
    }
    ...
```

#### Cache whole request response

Sometimes you need to cache whole response, if you need to look to Headers etc. It can be done only with simple 
move .map(res => res.json()) after loadItem method. LoadItem returns Observable, so you can also use other 
Observable operators

```js
...
   let request = this.http.get(url);
   return this.cache.loadItem(cacheKey, request).map(res => res.json());
...
```

#### Cache with custom Observable operators

LoadItem method using Observable and return Observable, so you can use lot of Observable operators. 
For example error handling (on error, retry request every 6 seconds):

```js
...
   let request = this.http.get(url)
                        .retryWhen((error) => {
                            return error.timer(6000);
                        }).map(res => res.json());
   return this.cache.loadItem(cacheKey, request);
...
```

#### Cache entries grouping

This is really nice feature. Sometimes you need to invalidate only some group of cache entries.
For example if you have have long infinite scroll with lots of pages, and user trigger pull to request you want to delete
all cache entries for all pages. So this is time for third parameter groupKey.

```js
...
    loadList(pageNumber) {
        let url = "http://google.com/?page=" + pageNumber;
        let cacheKey = url;
        let groupKey = "googleListPages"

        let request = this.http.get(url).map(res => res.json());
        return this.cache.loadItem(cacheKey, request, groupKey);
    }
...
```

And on pull to refresh delete all cache entries in group googleListPages:

```js
...
    pullToRefresh() {
        this.cache.removeByGroup("googleListPages");
    }
...
```

#### Set custom TTL for single request

If you want custom TTL for single request, it can by easily done by third parameter.

```js
...
    loadList(pageNumber) {
        ...
        let ttl = 60 * 60 * 24 * 7; // TTL in seconds for one week

        let request = this.http.get(url).map(res => res.json());
        return this.cache.loadItem(cacheKey, request, groupKey, ttl);
    }
...
```

#### Cache non-observables (arrays, strings etc.)

This is not so smart, you must call getItem twice... It will be improved in upcoming versions.

```js
...
   let arrayToCache = ["Hello", "World"];
   let cacheKey = "my-array";

   return new Promise((resolve, reject) => {
        this.cache.getItem().then(item => {
            resolve(item);
        }).catch(() => {
            this.cache.saveItem(cacheKey, arrayToCache).then(() => {
                this.cache.getItem().then(item => {
                    resolve(item);
                });
            });
        });
   });
...
```

#### Delete expired entries

It's automatically done on every startup, but you can do it manually.

```js
...
    this.cache.removeExpired();
...
```

#### Delete all entries

```js
...
    this.cache.removeAll();
...
```

#### Set default TTL

```js
...
    this.cache.setTTL(60 * 60); //set default cache TTL for 1 hour
...
```