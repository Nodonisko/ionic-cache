import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { _throw } from 'rxjs/observable/throw';
import { fromEvent } from 'rxjs/observable/fromEvent';
import { merge } from 'rxjs/observable/merge';
import { share } from 'rxjs/operators/share';
import { map } from 'rxjs/operators/map';
import { catchError } from 'rxjs/operators/catchError';
import { Storage } from '@ionic/storage';

export const MESSAGES = {
  0: 'Cache initialization error: ',
  1: 'Cache is not enabled.',
  2: 'Cache entry already expired: ',
  3: 'No such key: ',
  4: 'No entries were deleted, because browser is offline.'
};

export type CacheValueFactory<T> = () => Promise<T>;

@Injectable()
export class CacheService {
  private ttl: number = 60 * 60; // one hour
  private cacheEnabled: boolean = true;
  private invalidateOffline: boolean = false;
  private networkStatusChanges: Observable<boolean>;
  private networkStatus: boolean = true;
  static request: any;
  static response: any;
  static responseOptions: any;
  static httpDeprecated: boolean = false;

  constructor(private _storage: Storage) {
    this.loadHttp();
    this.watchNetworkInit();
    this.loadCache();
  }

  private async loadCache() {
    try {
      await this._storage.ready();
      this.cacheEnabled = true;
    } catch (e) {
      this.cacheEnabled = false;
      console.error(MESSAGES[0], e);
    }
  }

  private async loadHttp() {
    if (CacheService.request && CacheService.response) {
      return;
    }

    let http;
    // try load @angular/http deprecated or @angular/common/http
    try {
      http = await import('@angular/http');
      CacheService.httpDeprecated = true;
    } catch (e) {
      http = await import('@angular/common/http');
    }
    CacheService.request = http.Request || http.HttpRequest;
    CacheService.response = http.Response || http.HttpResponse;
    CacheService.responseOptions = http.ResponseOptions;
  }

  async ready(): Promise<any> {
    await this._storage.ready();
  }

  /**
   * @description Disable or enable cache
   */
  enableCache(enable: boolean = true) {
    this.cacheEnabled = enable;
  }

  /**
   * @description Delete DB table and create new one
   * @return {Promise<any>}
   */
  private async resetDatabase(): Promise<any> {
    await this.ready();

    return await this._storage.clear();
  }

  /**
   * @description Set default TTL
   * @param {number} ttl - TTL in seconds
   */
  setDefaultTTL(ttl: number): number {
    return (this.ttl = ttl);
  }

  /**
   * @description Set if expired cache should be invalidated if device is offline
   * @param {boolean} offlineInvalidate
   */
  setOfflineInvalidate(offlineInvalidate: boolean) {
    this.invalidateOffline = !offlineInvalidate;
  }

  /**
   * @description Start watching if devices is online or offline
   */
  private watchNetworkInit() {
    this.networkStatus = navigator.onLine;
    const connect = fromEvent(window, 'online').pipe(map(() => true)),
      disconnect = fromEvent(window, 'offline').pipe(map(() => false));

    this.networkStatusChanges = merge(connect, disconnect).pipe(share());
    this.networkStatusChanges.subscribe(status => {
      this.networkStatus = status;
    });
  }

  /**
   * @description Stream of network status changes
   * * @return {Observable<boolean>} network status stream
   */
  getNetworkStatusChanges() {
    return this.networkStatusChanges;
  }

  /**
   * @description Check if devices is online
   * @return {boolean} network status
   */
  isOnline() {
    return this.networkStatus;
  }

  /**
   * @description Save item to cache
   * @param {string} key - Unique key
   * @param {any} data - Data to store
   * @param {string} [groupKey] - group key
   * @param {number} [ttl] - TTL in seconds
   * @return {Promise<any>} - saved data
   */
  saveItem(
    key: string,
    data: any,
    groupKey: string = 'none',
    ttl: number = this.ttl
  ): Promise<any> {
    if (!this.cacheEnabled) {
      throw new Error(MESSAGES[1]);
    }

    const expires = new Date().getTime() + ttl * 1000,
      type = CacheService.isRequest(data) ? 'request' : typeof data,
      value = JSON.stringify(data);

    return this._storage.set(key, {
      value,
      expires,
      type,
      groupKey
    });
  }

  /**
   * @description Delete item from cache
   * @param {string} key - Unique key
   * @return {Promise<any>} - query execution promise
   */
  removeItem(key: string): Promise<any> {
    if (!this.cacheEnabled) {
      throw new Error(MESSAGES[1]);
    }

    return this._storage.remove(key);
  }

  /**
   * @description Get item from cache without expire check etc.
   * @param {string} key - Unique key
   * @return {Promise<any>} - data from cache
   */
  async getRawItem<T = any>(key: string): Promise<T> {
    if (!this.cacheEnabled) {
      throw new Error(MESSAGES[1]);
    }

    try {
      let data = await this._storage.get(key);
      if (!!data) {
        return data;
      }

      throw new Error('');
    } catch (err) {
      throw new Error(MESSAGES[3] + key);
    }
  }

  /**
   * @description Check if item exists in cache regardless if expired or not
   * @param {string} key - Unique key
   * @return {Promise<boolean | string>} - boolean - true if exists
   */
  async itemExists(key: string): Promise<boolean | string> {
    if (!this.cacheEnabled) {
      throw new Error(MESSAGES[1]);
    }

    let keys = await this._storage.keys();
    return keys.indexOf(key) > -1;
  }

  /**
   * @description Get item from cache with expire check and correct type assign
   * @param {string} key - Unique key
   * @return {Promise<any>} - data from cache
   */
  async getItem<T = any>(key: string): Promise<T> {
    if (!this.cacheEnabled) {
      throw new Error(MESSAGES[1]);
    }

    let data = await this.getRawItem(key);

    if (data.expires < new Date().getTime() && (this.invalidateOffline || this.isOnline())) {
      throw new Error(MESSAGES[2] + key);
    }

    return CacheService.decodeRawData(data);
  }

  async getOrSetItem<T>(
    key: string,
    factory: CacheValueFactory<T>,
    groupKey?: string,
    ttl?: number
  ): Promise<T> {
    let val: T;

    try {
      val = await this.getItem<T>(key);
    } catch (error) {
      val = await factory();
      await this.saveItem(key, val, groupKey, ttl);
    }

    return val;
  }

  /**
   * @description Decode raw data from DB
   * @param {any} data - Data
   * @return {any} - decoded data
   */
  static decodeRawData(data: any): any {
    let dataJson = JSON.parse(data.value);
    if (CacheService.isRequest(dataJson)) {
      let response: any = {
        body: dataJson._body || dataJson.body,
        status: dataJson.status,
        headers: dataJson.headers,
        statusText: dataJson.statusText,
        url: dataJson.url
      };

      if (CacheService.responseOptions) {
        response.type = dataJson.type;
        response = new CacheService.responseOptions(response);
      }

      return new CacheService.response(response);
    }

    return dataJson;
  }

  /**
   * @description Load item from cache if it's in cache or load from origin observable
   * @param {string} key - Unique key
   * @param {any} observable - Observable with data
   * @param {string} [groupKey] - group key
   * @param {number} [ttl] - TTL in seconds
   * @return {Observable<any>} - data from cache or origin observable
   */
  loadFromObservable<T = any>(
    key: string,
    observable: any,
    groupKey?: string,
    ttl?: number
  ): Observable<T> {
    if (!this.cacheEnabled) return observable;

    observable = observable.pipe(share());

    return fromPromise(this.getItem(key)).pipe(
      catchError(e => {
        observable.subscribe(
          res => {
            return this.saveItem(key, res, groupKey, ttl);
          },
          error => {
            return _throw(error);
          }
        );

        return observable;
      })
    );
  }

  /**
   * @description Load item from cache if it's in cache or load from origin observable
   * @param {string} key - Unique key
   * @param {any} observable - Observable with data
   * @param {string} [groupKey] - group key
   * @param {number} [ttl] - TTL in seconds
   * @param {string} [delayType='expired']
   * @return {Observable<any>} - data from cache or origin observable
   */
  loadFromDelayedObservable<T = any>(
    key: string,
    observable: Observable<T>,
    groupKey?: string,
    ttl: number = this.ttl,
    delayType: string = 'expired'
  ): Observable<T> {
    if (!this.cacheEnabled) return observable;

    const observableSubject = new Subject<T>();
    observable = observable.pipe(share());

    const subscribeOrigin = () => {
      observable.subscribe(
        res => {
          this.saveItem(key, res, groupKey, ttl);
          observableSubject.next(res);
          observableSubject.complete();
        },
        err => {
          observableSubject.error(err);
        },
        () => {
          observableSubject.complete();
        }
      );
    };

    this.getItem<T>(key)
      .then(data => {
        observableSubject.next(data);
        if (delayType === 'all') {
          subscribeOrigin();
        }
      })
      .catch(e => {
        this.getRawItem<T>(key)
          .then(res => {
            observableSubject.next(CacheService.decodeRawData(res));
            subscribeOrigin();
          })
          .catch(() => subscribeOrigin());
      });

    return observableSubject.asObservable();
  }

  /**
   * Perform complete cache clear
   * @return {Promise<any>}
   */
  clearAll(): Promise<any> {
    if (!this.cacheEnabled) {
      throw new Error(MESSAGES[2]);
    }

    return this.resetDatabase();
  }

  /**
   * @description Remove all expired items from cache
   * @param {boolean} ignoreOnlineStatus -
   * @return {Promise<any>} - query promise
   */
  clearExpired(ignoreOnlineStatus = false): Promise<any> {
    if (!this.cacheEnabled) {
      throw new Error(MESSAGES[2]);
    }

    if (!this.isOnline() && !ignoreOnlineStatus) {
      throw new Error(MESSAGES[4]);
    }

    let datetime = new Date().getTime();
    let promises: Promise<any>[] = [];
    this._storage.forEach((val, key) => {
      if (val && val.expires < datetime) promises.push(this.removeItem(key));
    });

    return Promise.all(promises);
  }

  /**
   * @description Remove all item with specified group
   * @param {string} groupKey - group key
   * @return {Promise<any>} - query promise
   */
  async clearGroup(groupKey: string): Promise<any> {
    if (!this.cacheEnabled) {
      throw new Error(MESSAGES[2]);
    }

    let promises: Promise<any>[] = [];
    await this._storage.forEach((val: any, key: string) => {
      if (val && val.groupKey === groupKey) promises.push(this.removeItem(key));
    });

    return Promise.all(promises);
  }

  /**
   * @description Check if it's an request
   * @param {any} data - Variable to test
   * @return {boolean} - data from cache
   */
  static isRequest(data: any): boolean {
    let orCondition =
      typeof data === 'object' &&
      data.hasOwnProperty('status') &&
      data.hasOwnProperty('statusText') &&
      data.hasOwnProperty('headers') &&
      data.hasOwnProperty('url');

    if (CacheService.httpDeprecated) {
      orCondition =
        orCondition &&
        data.hasOwnProperty('type') &&
        data.hasOwnProperty('_body');
    } else {
      orCondition = orCondition && data.hasOwnProperty('body');
    }

    return data && (data instanceof CacheService.request || orCondition);
  }
}
