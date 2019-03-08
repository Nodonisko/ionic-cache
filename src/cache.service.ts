import { Injectable } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { defer, from, fromEvent, merge, throwError } from 'rxjs';
import { share, map, catchError } from 'rxjs/operators';
import { CacheStorageService, StorageCacheItem } from './cache-storage';

export interface CacheConfig {
  keyPrefix?: string;
}

export const MESSAGES = {
  0: 'Cache initialization error: ',
  1: 'Cache is not enabled.',
  2: 'Cache entry already expired: ',
  3: 'No such key: ',
  4: 'No entries were deleted, because browser is offline.'
};

export type CacheValueFactory<T> = () => Promise<T>;

/**
 * @description Check if it's an HttpResponse
 * @param {any} data - Variable to test
 * @return {boolean} - data from cache
 */
const isHttpResponse = (data: any): boolean => {
  let orCondition =
    data &&
    typeof data === 'object' &&
    data.hasOwnProperty('status') &&
    data.hasOwnProperty('statusText') &&
    data.hasOwnProperty('headers') &&
    data.hasOwnProperty('url') &&
    data.hasOwnProperty('body');

  return data && (data instanceof HttpResponse || orCondition);
};

@Injectable()
export class CacheService {
  private ttl: number = 60 * 60; // one hour
  private cacheEnabled: boolean = true;
  private invalidateOffline: boolean = false;
  private networkStatusChanges: Observable<boolean>;
  private networkStatus: boolean = true;

  constructor(
    private _storage: CacheStorageService
  ) {
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

    let items = await this._storage.all();
    return Promise.all(
      items
      .map(item => this.removeItem(item.key))
    );
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
      type = isHttpResponse(data) ? 'response' : typeof data,
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
   * @description Removes all items with a key that matches pattern
   * @return {Promise<any>}
   */
  async removeItems(pattern: string): Promise<any> {
    if (!this.cacheEnabled) {
      throw new Error(MESSAGES[1]);
    }

    let regex = new RegExp(`^${pattern.split('*').join('.*')}$`);
    let items = await this._storage.all();

    return Promise.all(
      items
      .map(item => item.key)
      .filter(key => key && regex.test(key))
      .map(key => this.removeItem(key))
    );
  }

  /**
   * @description Get item from cache without expire check etc.
   * @param {string} key - Unique key
   * @return {Promise<any>} - data from cache
   */
  async getRawItem<T = any>(key: string): Promise<StorageCacheItem> {
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

  async getRawItems() {
    return this._storage.all();
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

    return this._storage.exists(key);
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
  static decodeRawData(data: StorageCacheItem): any {
    let dataJson = JSON.parse(data.value);
    if (isHttpResponse(dataJson)) {
      let response: any = {
        body: dataJson._body || dataJson.body,
        status: dataJson.status,
        headers: dataJson.headers,
        statusText: dataJson.statusText,
        url: dataJson.url
      };

      return new HttpResponse(response);
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

    return defer(() => {
      return from(this.getItem(key)).pipe(
        catchError(e => {
          observable.subscribe(
            res => {
              return this.saveItem(key, res, groupKey, ttl);
            },
            error => {
              return throwError(error);
            }
          );

          return observable;
        })
      );
    });
  }

  /**
   * @description Load item from cache if it's in cache or load from origin observable
   * @param {string} key - Unique key
   * @param {any} observable - Observable with data
   * @param {string} [groupKey] - group key
   * @param {number} [ttl] - TTL in seconds
   * @param {string} [delayType='expired']
   * @param {string} [metaKey] - property on T to which to assign meta data
   * @return {Observable<any>} - data from cache or origin observable
   */
  loadFromDelayedObservable<T = any>(
    key: string,
    observable: Observable<T>,
    groupKey?: string,
    ttl: number = this.ttl,
    delayType: string = 'expired',
    metaKey?: string
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
        if (metaKey) {
          data[metaKey] = data[metaKey] || {};
          data[metaKey].fromCache = true;
        }
        observableSubject.next(data);

        if (delayType === 'all') {
          subscribeOrigin();
        } else {
          observableSubject.complete();
        }
      })
      .catch(e => {
        this.getRawItem<T>(key)
          .then(res => {
            let result = CacheService.decodeRawData(res);
            if (metaKey) {
              result[metaKey] = result[metaKey] || {};
              result[metaKey].fromCache = true;
            }
            observableSubject.next(result);
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
  async clearExpired(ignoreOnlineStatus = false): Promise<any> {
    if (!this.cacheEnabled) {
      throw new Error(MESSAGES[2]);
    }

    if (!this.isOnline() && !ignoreOnlineStatus) {
      throw new Error(MESSAGES[4]);
    }

    let items = await this._storage.all();
    let datetime = new Date().getTime();

    return Promise.all(
      items
      .filter(item => item.expires < datetime)
      .map(item => this.removeItem(item.key))
    );
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

    let items = await this._storage.all();

    return Promise.all(
      items
      .filter(item => item.groupKey === groupKey)
      .map(item => this.removeItem(item.key))
    );
  }
}
