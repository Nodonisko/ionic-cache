import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { defer, from, throwError } from 'rxjs';
import { share, catchError } from 'rxjs/operators';
import { CacheStorageService } from '../cache-storage/cache-storage.service';
import { StorageCacheItem } from '../../interfaces/cache-storage-item.interface';
import { errorMessages } from '../../constants/error-messages.constant';
import { isHttpResponse } from '../../helpers/is-http-response.helper';
import { convertBlobToBase64 } from '../../helpers/convert-blob-to-base64.helper';
import { decodeRawData } from '../../helpers/decode-raw-data.helper';

@Injectable()
export class CacheService {
    private ttl: number = 60 * 60; // one hour
    private cacheEnabled: boolean = true;
    private invalidateOffline: boolean = false;

    constructor(private cacheStorage: CacheStorageService) {
        this.loadCache();
    }

    /**
     * Disable or enable cache.
     */
    public enableCache(enable: boolean = true) {
        this.cacheEnabled = enable;
    }

    /**
     * Set if expired cache should be invalidated if device is offline.
     */
    public setOfflineInvalidate(offlineInvalidate: boolean) {
        this.invalidateOffline = !offlineInvalidate;
    }

    /**
     * Set default TTL.
     * @param ttl TTL in seconds.
     */
    public setDefaultTTL(ttl: number): number {
        return (this.ttl = ttl);
    }

    /**
     * Checks if the device is online.
     */
    public isOnline() {
        return navigator.onLine;
    }

    /**
     * Saves an item to the cache storage with the provided options.
     * @param key The unique key
     * @param data The data to store
     * @param groupKey The group key
     * @param ttl The TTL in seconds
     * @returns The saved data
     */
    public saveItem(
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
     * Deletes an item from the cache storage.
     * @param key The unique key
     * @returns A promise which will resolve when the item is removed.
     */
    public removeItem(key: string): Promise<any> {
        if (!this.cacheEnabled) {
            throw new Error(errorMessages.notEnabled);
        }

        return this.cacheStorage.remove(key);
    }

    /**
     * Removes all items with a key that matches pattern.
     * @returns A promise which will resolve when all the items are removed.
     */
    public async removeItems(pattern: string): Promise<any> {
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
     * Gets item from cache without checking if it is expired.
     * @param key The unique key
     * @returns A promise which will resolve with the data from the cache.
     */
    public async getRawItem(key: string): Promise<StorageCacheItem> {
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

    /**
     * Gets all items from the cache without checking if they are expired.
     * @returns A promise which will resove with all the items in the cache.
     */
    public getRawItems(): Promise<StorageCacheItem[]> {
        return this.cacheStorage.all();
    }

    /**
     * Check sif item exists in cache regardless if expired or not.
     * @param key The unique key
     * @returns A boolean which will be true the key if exists.
     */
    public itemExists(key: string): Promise<boolean | string> {
        if (!this.cacheEnabled) {
            throw new Error(errorMessages.notEnabled);
        }

        return this.cacheStorage.exists(key);
    }

    /**
     * Gets item from cache with expire check.
     * @param key The unique key
     * @returns The data from the cache
     */
    public async getItem<T = any>(key: string): Promise<T> {
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

        return decodeRawData(data);
    }

    /**
     * Gets or sets an item in the cache storage
     * @param key The unique key
     * @param factory The factory to update the value with if it's not present.
     * @param groupKey The group key
     * @param ttl The TTL in seconds.
     * @returns A promise which resolves with the data.
     */
    public async getOrSetItem<T>(
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
     * Loads an item from the cache, if it's not there it will use the provided observable to set the value and return it.
     * @param key The unique key
     * @param observable The observable to provide the data if it's not present in the cache.
     * @param groupKey The group key
     * @param ttl The TTL in seconds
     * @returns An observable with the data from the cache or provided observable.
     */
    public loadFromObservable<T = any>(
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
                this.getRawItem(key)
                    .then(async (res) => {
                        let result = await decodeRawData(res);
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

    /**
     * Creates the cache storage.
     * If it fails it will provide and error message.
     */
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
     * Resets the storage back to being empty.
     */
    private async resetDatabase(): Promise<any> {
        let items = await this.cacheStorage.all();
        return Promise.all(items.map((item) => this.removeItem(item.key)));
    }


    /**
     * Saves a blob item to the cache storage with the provided options.
     * @param key The unique key
     * @param blob The blob to store
     * @param groupKey The group key
     * @param ttl The TTL in seconds
     * @returns The saved data
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
            const base64data = await convertBlobToBase64(blob);
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
}
