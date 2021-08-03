import { Injectable } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { defer, from, throwError } from 'rxjs';
import { share, catchError } from 'rxjs/operators';
import { CacheStorageService } from '../cache-storage/cache-storage.service';
import { StorageCacheItem } from '../../interfaces/cache-storage-item.interface';
import { errorMessages } from '../../constants/error-messages.constant';
import { isHttpResponse } from '../../helpers/is-http-response.helper';
import { isJsOrResponseType } from '../../helpers/is-js-or-response-type.helper';

@Injectable()
export class CacheService {
    private ttl: number = 60 * 60; // one hour
    private cacheEnabled: boolean = true;
    private invalidateOffline: boolean = false;

    constructor(private cacheStorage: CacheStorageService) {
        this.loadCache();
    }

    private async loadCache(): Promise<void> {
        if (!this.cacheEnabled) {
            return;
        }

        try {
            await this.cacheStorage.create();
        } catch (error) {
            this.cacheEnabled = false;
            console.error(errorMessages.initialization, error);
        }
    }

    /**
     * Disable or enable cache
     */
    enableCache(enable: boolean = true) {
        this.cacheEnabled = enable;
    }

    /**
     * Resets the storage back to being empty.
     */
    private async resetDatabase(): Promise<any> {
        let items = await this.cacheStorage.all();
        return Promise.all(items.map((item) => this.removeItem(item.key)));
    }

    /**
     * Set default TTL
     * @param {number} ttl - TTL in seconds
     */
    setDefaultTTL(ttl: number): number {
        return (this.ttl = ttl);
    }

    /**
     * Set if expired cache should be invalidated if device is offline
     * @param {boolean} offlineInvalidate
     */
    setOfflineInvalidate(offlineInvalidate: boolean) {
        this.invalidateOffline = !offlineInvalidate;
    }

    /**
     * Check if devices is online
     */
    public isOnline() {
        return navigator.onLine;
    }

    /**
     * Save item to cache
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
            throw new Error(errorMessages.notEnabled);
        }

        if (Blob.name === data.constructor.name) {
            return this.saveBlobItem(key, data, groupKey, ttl);
        }

        const expires = new Date().getTime() + ttl * 1000,
            type = isHttpResponse(data) ? 'response' : typeof data,
            value = JSON.stringify(data);

        return this.cacheStorage.set(key, {
            value,
            expires,
            type,
            groupKey,
        });
    }

    /**
     * Save blob item to cache
     * @param {string} key - Unique key
     * @param {any} blob - Blob to store
     * @param {string} [groupKey] - group key
     * @param {number} [ttl] - TTL in seconds
     * @return {Promise<any>} - saved data
     */
    private async saveBlobItem(
        key: string,
        blob: any,
        groupKey: string = 'none',
        ttl: number = this.ttl
    ): Promise<any> {
        if (!this.cacheEnabled) {
            throw new Error(errorMessages.notEnabled);
        }

        const expires = new Date().getTime() + ttl * 1000,
            type = blob.type;

        try {
            const base64data = await this.asBase64(blob);
            const value = JSON.stringify(base64data);

            return this.cacheStorage.set(key, {
                value,
                expires,
                type,
                groupKey,
            });
        } catch (error) {
            throw new Error(error);
        }
    }

    // Technique derived from: https://stackoverflow.com/a/18650249
    private asBase64(blob): Promise<string | ArrayBuffer> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
                const base64data = reader.result;
                resolve(base64data);
            };
            reader.onerror = (event) => {
                reject(event);
                reader.abort();
            };
        });
    }

    /**
     * Delete item from cache
     * @param {string} key - Unique key
     * @return {Promise<any>} - query execution promise
     */
    removeItem(key: string): Promise<any> {
        if (!this.cacheEnabled) {
            throw new Error(errorMessages.notEnabled);
        }

        return this.cacheStorage.remove(key);
    }

    /**
     * Removes all items with a key that matches pattern
     * @return {Promise<any>}
     */
    async removeItems(pattern: string): Promise<any> {
        if (!this.cacheEnabled) {
            throw new Error(errorMessages.notEnabled);
        }

        let regex = new RegExp(`^${pattern.split('*').join('.*')}$`);
        let items = await this.cacheStorage.all();

        return Promise.all(
            items
                .map((item) => item.key)
                .filter((key) => key && regex.test(key))
                .map((key) => this.removeItem(key))
        );
    }

    /**
     * Get item from cache without expire check etc.
     * @param {string} key - Unique key
     * @return {Promise<any>} - data from cache
     */
    async getRawItem<T = any>(key: string): Promise<StorageCacheItem> {
        if (!this.cacheEnabled) {
            throw new Error(errorMessages.notEnabled);
        }

        try {
            let data = await this.cacheStorage.get(key);
            if (!!data) {
                return data;
            }

            throw new Error('');
        } catch (err) {
            throw new Error(errorMessages.notFound + key);
        }
    }

    async getRawItems() {
        return this.cacheStorage.all();
    }

    /**
     * Check if item exists in cache regardless if expired or not
     * @param {string} key - Unique key
     * @return {Promise<boolean | string>} - boolean - true if exists
     */
    async itemExists(key: string): Promise<boolean | string> {
        if (!this.cacheEnabled) {
            throw new Error(errorMessages.notEnabled);
        }

        return this.cacheStorage.exists(key);
    }

    /**
     * Get item from cache with expire check and correct type assign
     * @param {string} key - Unique key
     * @return {Promise<any>} - data from cache
     */
    async getItem<T = any>(key: string): Promise<T> {
        if (!this.cacheEnabled) {
            throw new Error(errorMessages.notEnabled);
        }

        let data = await this.getRawItem(key);

        if (
            data.expires < new Date().getTime() &&
            (this.invalidateOffline || this.isOnline())
        ) {
            throw new Error(errorMessages.expired + key);
        }

        return CacheService.decodeRawData(data);
    }

    async getOrSetItem<T>(
        key: string,
        factory: () => Promise<T>,
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
     * Decode raw data from DB
     * @param {any} data - Data
     * @return {any} - decoded data
     */
    static async decodeRawData(data: StorageCacheItem): Promise<any> {
        let dataJson = JSON.parse(data.value);
        if (isJsOrResponseType(data)) {
            if (isHttpResponse(dataJson)) {
                let response: any = {
                    body: dataJson._body || dataJson.body,
                    status: dataJson.status,
                    headers: dataJson.headers,
                    statusText: dataJson.statusText,
                    url: dataJson.url,
                };

                return new HttpResponse(response);
            }

            return dataJson;
        } else {
            // Technique derived from: https://stackoverflow.com/a/36183085
            const response = await fetch(dataJson);

            return response.blob();
        }
    }

    /**
     * Load item from cache if it's in cache or load from origin observable
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
                catchError((e) => {
                    observable.subscribe(
                        (res) => {
                            return this.saveItem(key, res, groupKey, ttl);
                        },
                        (error) => {
                            return throwError(error);
                        }
                    );

                    return observable;
                })
            );
        });
    }

    /**
     * Load item from cache if it's in cache or load from origin observable
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
                (res) => {
                    this.saveItem(key, res, groupKey, ttl);
                    observableSubject.next(res);
                    observableSubject.complete();
                },
                (err) => {
                    observableSubject.error(err);
                },
                () => {
                    observableSubject.complete();
                }
            );
        };

        this.getItem<T>(key)
            .then((data) => {
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
            .catch((e) => {
                this.getRawItem<T>(key)
                    .then(async (res) => {
                        let result = await CacheService.decodeRawData(res);
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
            throw new Error(errorMessages.notEnabled);
        }

        return this.resetDatabase();
    }

    /**
     * Remove all expired items from cache
     * @param {boolean} ignoreOnlineStatus -
     * @return {Promise<any>} - query promise
     */
    async clearExpired(ignoreOnlineStatus = false): Promise<any> {
        if (!this.cacheEnabled) {
            throw new Error(errorMessages.notEnabled);
        }

        if (!this.isOnline() && !ignoreOnlineStatus) {
            throw new Error(errorMessages.browserOffline);
        }

        let items = await this.cacheStorage.all();
        let datetime = new Date().getTime();

        return Promise.all(
            items
                .filter((item) => item.expires < datetime)
                .map((item) => this.removeItem(item.key))
        );
    }

    /**
     * Remove all item with specified group
     * @param {string} groupKey - group key
     * @return {Promise<any>} - query promise
     */
    async clearGroup(groupKey: string): Promise<any> {
        if (!this.cacheEnabled) {
            throw new Error(errorMessages.notEnabled);
        }

        let items = await this.cacheStorage.all();

        return Promise.all(
            items
                .filter((item) => item.groupKey === groupKey)
                .map((item) => this.removeItem(item.key))
        );
    }
}
