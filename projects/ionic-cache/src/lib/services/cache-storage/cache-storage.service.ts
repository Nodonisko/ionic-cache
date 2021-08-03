import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { StorageCacheItem } from 'dist/ionic-cache/lib/cache-storage';

@Injectable()
export class CacheStorageService {
    public keyPrefix: string;

    constructor(private storage: Storage) {}

    public create(): Promise<Storage> {
        return this.storage.create();
    }

    public async set(key: string, value: any): Promise<any> {
        return this.storage.set(this.buildKey(key), value);
    }

    public async remove(key: string): Promise<any> {
        return this.storage.remove(this.buildKey(key));
    }

    public async get(key: string): Promise<any> {
        const value = await this.storage.get(this.buildKey(key));
        return !!value ? Object.assign({ key: key }, value) : null;
    }

    public async exists(key: string): Promise<boolean> {
        return !!(await this.storage.get(this.buildKey(key)));
    }

    public async all(): Promise<StorageCacheItem[]> {
        const items: StorageCacheItem[] = [];
        await this.storage.forEach((val: any, key: string) => {
            if (this.isCachedItem(key, val)) {
                items.push(Object.assign({ key: this.debuildKey(key) }, val));
            }
        });

        return items;
    }

    /**
     * Returns whether or not an object is a cached item.
     * @return {boolean}
     */
    private isCachedItem(key: string, item: any): boolean {
        return (
            item && item.expires && item.type && key.startsWith(this.keyPrefix)
        );
    }

    /**
     * Makes sure that the key is prefixed properly
     * @return {string}
     */
    private buildKey(key: string): string {
        if (key.startsWith(this.keyPrefix)) {
            return key;
        }

        return this.keyPrefix + key;
    }

    /**
     * Makes sure that the key isn't prefixed
     * @return {string}
     */
    private debuildKey(key: string): string {
        if (key.startsWith(this.keyPrefix)) {
            return key.substr(this.keyPrefix.length);
        }

        return key;
    }
}
