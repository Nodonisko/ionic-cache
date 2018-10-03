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
        cache.setDefaultTTL(60 * 60); //set default cache TTL for 1 hour
        ....
    }
    ...
}
```

## Usage

### Config

Starting with version 3.0.2, `CacheModule.forRoot()` optionally accepts a config object.

The config object currently accepts a `keyPrefix`, which is the the internal key prefix to use when storing items.

For backwards compatibility this defaults to `''`, but it's recommended to set this to a different value in order to prevent issues with `clearAll()`.

```ts
@NgModule({
  ...
  imports: [
    CacheModule.forRoot({ keyPrefix: 'my-app-cache' })
  ],
})
```

### Observables

#### Cache request

```ts
...
import { CacheService } from "ionic-cache";

@Injectable()
export class SomeProvider {
    constructor(private http: HttpClient, private cache: CacheService) {}

    loadList() {
        let url = "http://ip.jsontest.com";
        let cacheKey = url;
        let request = this.http.get(url);

        return this.cache.loadFromObservable(cacheKey, request);
    }
    ...
```

#### Cache whole request response

If you need to cache the whole response, for example if you need to access the Headers, you can pass in an object with the observe key set to 'response', i.e. `{ observe: 'response' }`. Then you can use `.pipe(map(res => res.body))` to extract the response body.

```ts
...
let request = this.http.get(url, { observe: 'response' });
return this.cache.loadFromObservable(cacheKey, request).pipe(map(res => res.body));
...
```

#### Cache with custom Observable operators

`loadFromObservable` accepts an Observable and returns an Observable, so you are free to use all of the Observable operators. 
For example error handling (on error, retry request every 6 seconds if fails):

```ts
...
let request = this.http.get(url)
.pipe(retryWhen(error => error.timer(6000)));

return this.cache.loadFromObservable(cacheKey, request);
...
```

#### Delayed observable caching

`loadFromDelayedObservable` shows off the full power of observables.
When you call this method and it will return the cached date (even if it's expired) 
and immediately send a request to the server and then return the new data.

```ts
...
    let request = this.http.get(url);
    let delayType = 'all'; // this indicates that it should send a new request to the server every time, you can also set it to 'none' which indicates that it should only send a new request when it's expired

    let response = this.cache.loadFromDelayedObservable(cacheKey, request, groupKey, ttl, delayType);

    response.subscribe(data => {
        console.log("Data:" data);
    });

    //result will look like this:
    // Data: "Hello world from cache"
    // Data: "Hello world from server"
...
```

### Promises & Classic data

#### Cache promises

```ts
...
let key = 'some-promise';
let data = await this.cache.getOrSetItem(key, () => somePromiseFunction());
console.log("Saved data: ", data);
...
```

#### Cache classic data (arrays, objects, strings, numbers etc.)

Similarly, you can use `getOrSetItem` or `getItem` with classic data.

```ts
...
let key = 'heavily-calculated-function';

let data = await this.cache.getOrSetItem(key, () => heavilyCalculatedFunction());
console.log('Saved data: ', data);
...
```

If you need more control in the event that the item is expired or doesn't exist, you can use the `getItem` method with error handling.

```ts
...
let key = 'heavily-calculated-function';

let data = await this.cache.getItem(key)
.catch(() => {
    console.log("Oh no! My promise is expired or doesn't exist!");

    let result = heavilyCalculatedFunction();
    return this.cache.saveItem(key, result);
});

console.log('Saved data: ', data);
...
```

#### Removing cached items

You can also remove cached items by using the `removeItem` method.

```ts
...
let key = 'some-promise';

this.cache.removeItem(key);
...
```

#### Removing multiple cached items

You can utilize the `removeItems` method to remove multiple items based on a wildcard pattern.

```ts
...
await Promise.all([
    service.saveItem('movies/comedy/1', 'Scott Pilgrim vs. The World'),
    service.saveItem('movies/comedy/2', 'The Princess Bride'),
    service.saveItem('songs/metal/1', 'Who Bit the Moon'),
    service.saveItem('songs/metal/2', 'Deception - Concealing Fate, Pt. 2'),
]);

this.cache.removeItems('songs/metal/*');
...
```

#### Cached promise existence

If you need to check whether or not an item has been cached, ignoring whether or not it's expired, you can use the `itemExists` method.

```ts
...
let key = 'some-promise';

let exists = await this.cache.itemExists(key); // returns either a boolean indicating whether it exists or not, or an error message
...
```

#### Raw cached item

If you ever need to get a cached item regardless of whether it's expired or not, you can use the `getRawItem` method.

```ts
...
let key = 'some-promise';

let item = await this.cache.getRawItem(key);
...
```

There's also the `getRawItems` method, which returns an array of the raw cached items.
```ts
...
let rawItems = await this.cache.getRawItems();
let firstItem = rawItems[0]; //Has the properties: key, value, expires, type, groupKey
...
```

### Other

#### Cache entries grouping

At times you may need to clear certain groups of cached items.
For example, if you have an infinite scroll list with a lot of items and the user triggers a pull to refresh, you may want to delete all of the cached list items. To do this, you can supply a group key as the 3rd parameter of `loadFromObservable`.

```ts
...
loadList(pageNumber) {
    let url = "http://google.com/?page=" + pageNumber;
    let cacheKey = url;
    let groupKey = "googleSearchPages"

    let request = this.http.get(url);
    return this.cache.loadFromObservable(cacheKey, request, groupKey);
}
...
```

Then when pull to refresh is triggered, you can use the `clearGroup` method and pass in your group key.

```ts
...
pullToRefresh() {
    this.cache.clearGroup("googleSearchPages");
}
...
```

#### Set custom TTL for single request

If you want a custom TTL for a single request, you can pass it as the fourth parameter.

```ts
let ttl = 60 * 60 * 24 * 7; // TTL in seconds for one week
let request = this.http.get(url);

return this.cache.loadFromObservable(cacheKey, request, groupKey, ttl);
```

#### Set default TTL

```ts
this.cache.setDefaultTTL(60 * 60); //set the default cache TTL for 1 hour
```

#### Delete expired entries

It's automatically done on every startup, but you can do it manually.

```ts
this.cache.clearExpired();
```

#### Delete all entries

**!Important!**

Make sure that you have a `keyPrefix` set in the CacheModule config, otherwise this will clear everything in Ionic Storage.

```ts
this.cache.clearAll();
```

#### Disable cache

You can disable cache without any issues, it will pass all of the original Observables through and all Promises will be rejected.

```ts
this.cache.enableCache(false);
```

#### Disable offline invalidation

You can also disable invalidating cached items when the device is offline.

```ts
this.cache.setOfflineInvalidate(false);
```
