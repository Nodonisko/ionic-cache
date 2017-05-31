# Ionic cache service

Ionic cache service that can cache almost everything. **It caches requests, observables, promises and classic data.** It uses [Ionic Storage](https://ionicframework.com/docs/storage/) so we support IndexedDB, SQLite (Cordova), WebSQL in this order.
It can be used separatelety in Angular 2 application.

Key features:
+ Request caching
+ Delayed observable caching (see docs for more info)
+ Don't invalidate cache if is browser offline
+ Set and invalidate groups of entries
+ Supports IndexedDB, SQLite (Cordova), WebSQL via Ionic Storage

Please report all bugs to bug report or fix it and send pull request :)

#### Big thanks to all contributors for help:
+ Special thanks to [ihadeed](https://github.com/ihadeed)
+ [imatefx](https://github.com/imatefx)
+ [Vojta Tranta](https://github.com/vojtatranta)

## Install

Via NPM:

```bash
npm install ionic-cache @ionic/storage --save
```

or Yarn:
```bash
yarn add ionic-cache @ionic/storage
```

You can optionally add [Cordova SQLite](https://ionicframework.com/docs/native/sqlite/).

And inject service to your app:

*app.module.ts*

```ts
import { CacheModule } from "ionic-cache";

@NgModule({
  ...
  imports: [
    CacheModule.forRoot()
  ],
})
```

*app.component.ts*

```ts
import { CacheService } from "ionic-cache";

@Component({
    templateUrl: "build/app.html"
})
class MyApp {
    constructor(cache: CacheService) {
        ...
        this.cache.setDefaultTTL(60 * 60); //set default cache TTL for 1 hour
        ....
    }
    ...
}
```

## Usage

#### Cache request

```ts
...
import { CacheService } from "ionic-cache";

@Injectable()
export class SomeProvider {
    constructor(private http: Http, private cache: CacheService) {}

    loadList() {
        let url = "http://ip.jsontest.com";
        let cacheKey = url;
        let request = this.http.get(url).map(res => res.json());

        return this.cache.loadFromObservable(cacheKey, request);
    }
    ...
```

#### Cache whole request response

Sometimes you need to cache whole response, if you need to look to Headers etc. It can be done only with simple 
move *.map(res => res.json())* after *loadFromObservable* method. *loadFromObservable* returns Observable, so you can also use other 
Observable operators.

```js
...
let request = this.http.get(url);
return this.cache.loadFromObservable(cacheKey, request).map(res => res.json());
...
```

#### Cache classic data (arrays, objects, strings, numbers etc.)

Cache service works well with observables, but you can cache classic data as well.

```js
...
let key = 'heavily-calculated-function';

this.cache.getItem(key).catch(() => {
    // fall here if item is expired or doesn't exist
    let result = heavilyCalculatedFunction();
    return this.cache.saveItem(key, result);
}).then((data) => {
    console.log("Saved data: ", data);
});
...
```

#### Cache promises

```js
...
let key = 'some-promise';

this.cache.getItem(key).catch(() => {
    // fall here if item is expired or doesn't exist
    return somePromiseFunction().then(result => {
        return this.cache.saveItem(key, result);
    });
}).then((data) => {
    console.log("Saved data: ", data);
});
...
```

#### Cache with custom Observable operators

*loadFromObservable* method using Observable and return Observable, so you are free to use all Observable operators. 
For example error handling (on error, retry request every 6 seconds if fails):

```js
...
let request = this.http.get(url)
                    .retryWhen((error) => {
                        return error.timer(6000);
                    }).map(res => res.json());
return this.cache.loadFromObservable(cacheKey, request);
...
```

#### Cache entries grouping

Sometimes you need to invalidate only some group of cache entries.
For example if you have have long infinite scroll with lots of pages, and user trigger pull to request you want to delete
all cache entries for all pages. So this is time for third parameter.

```js
...
loadList(pageNumber) {
    let url = "http://google.com/?page=" + pageNumber;
    let cacheKey = url;
    let groupKey = "googleSearchPages"

    let request = this.http.get(url).map(res => res.json());
    return this.cache.loadFromObservable(cacheKey, request, groupKey);
}
...
```

And when pull to refresh is fired, delete all cache entries in group *googleListPages*:

```js
...
pullToRefresh() {
    this.cache.clearGroup("googleSearchPages");
}
...
```

#### Delayed observable caching

Features that using full power of observables. When you call this method and it will return data from cache (even if they are expired) 
and immediately send request to server and return new data after request successfuly finish. See example for more details:

```js
...
    let request = this.http.get(url).map(res => res.json());
    let delayType = 'all'; // send new request to server everytime, if it's set to none it will send new request only when entry is expired
    let response = this.cache.loadFromDelayedObservable(cacheKey, request, groupKey, ttl, delayType);

    response.subscribe(data => {
        console.log("Data:" data);
    });

    //result will look like this:
    // Data: "Hello world from cache"
    // Data: "Hello world from server"
...
```

#### Set custom TTL for single request

If you want custom TTL for single request, it can by easily done by third parameter.

```js
let ttl = 60 * 60 * 24 * 7; // TTL in seconds for one week
let request = this.http.get(url).map(res => res.json());

return this.cache.loadFromObservable(cacheKey, request, groupKey, ttl);
```

#### Set default TTL

```js
this.cache.setDefaultTTL(60 * 60); //set default cache TTL for 1 hour
```

#### Delete expired entries

It's automatically done on every startup, but you can do it manually.

```js
this.cache.clearExpired();
```

#### Delete all entries

```js
this.cache.clearAll();
```

#### Disable cache

You can disable cache without any worrying, it will pass origin Observable through and all Promises will be rejected.
Without any errors.

```js
this.cache.enableCache(false);
```

#### Disable offline invalidate

If you want disable "don't invalidate" when device is offline, you can do it simply.

```js
this.cache.setOfflineInvalidate(false);
```
