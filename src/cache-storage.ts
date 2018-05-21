import { Storage } from '@ionic/storage';

export interface StorageCacheItem {
  key: string;
  value: any;
  expires: number;
  type: string;
  groupKey: string;
}

export class CacheStorageService {
  constructor(
    private storage: Storage,
    private keyPrefix: string
  ) {
  }

  public ready() {
    return this.storage.ready();
  }

  public async set(key: string, value: any) {
    await this.ready();

    return this.storage.set(this.buildKey(key), value);
  }

  public async remove(key: string) {
    await this.ready();

    return this.storage.remove(this.buildKey(key));
  }

  public async get(key: string) {
    await this.ready();

    let value = await this.storage.get(this.buildKey(key));
    return !!value ? Object.assign({ key: key }, value) : null;
  }

  public async exists(key: string) {
    await this.ready();

    return !!(await this.storage.get(this.buildKey(key)));
  }

  public async all(): Promise<StorageCacheItem[]> {
    await this.ready();

    let items: StorageCacheItem[] = [];
    await this.storage.forEach((val: any, key: string) => {
      if (this.isCachedItem(key, val)) {
        items.push(Object.assign({ key: this.debuildKey(key) }, val));
      }
    });

    return items;
  }

  /**
   * @description Returns whether or not an object is a cached item.
   * @return {boolean}
   */
  private isCachedItem(key: string, item: any): boolean {
    return item && item.expires && item.type && key.startsWith(this.keyPrefix);
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
