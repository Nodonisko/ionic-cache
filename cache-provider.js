import {Injectable} from '@angular/core';
import {Storage, SqlStorage} from 'ionic-angular';
import {Observable} from 'rxjs/Rx';
import {Request, Response, ResponseOptions} from '@angular/http';

@Injectable()
export default class CacheProvider {

    static get parameters() {
        return []
    }

    static cacheKeys = ['key', 'unique', 'value', 'expire', 'type', 'group_key'];

    constructor() {
        this.ttl = 60 * 60 * 1000; //one hour in ms
        this.tableName = 'cache';

        try {
            this.storage = new Storage(SqlStorage);
            this.initDatabase().then(() => {
                this.removeExpired();
            });
            this.enableCache = true;
        } catch (e) {
            this.enableCache = false;
            console.error('Cache initialization error: ', e);
        }
    }

    /**
     * @description Create DB table for cache, if not exists
     * @return {Promise<T>}
     */
    initDatabase() {
        let query = `CREATE TABLE IF NOT EXISTS ${this.tableName} (${this.cacheKeys.join(', ')})`;

        return this.storage.query(query);
    }

    /**
     * @description Set default TTL
     * @param {number} ttl - TTL in seconds
     * @return {number} new TTL time in miliseconds
     */
    setDefaultTTL(ttl) {
        return this.ttl = ttl * 1000;
    }

    /**
     * @description Save item to cache
     * @param {string} key - Unique key
     * @param {any} data - Data to store
     * @param {string} [groupKey] - group key
     * @param {number} [ttl] - TTL in seconds
     * @return {Promise<T>} - saved data
     */
    saveItem(key, data, groupKey = 'none', ttl = this.ttl) {
        if (!this.enableCache) {
            return Promise.reject("Cache is not enabled.");
        }

        let expireTime = new Date().getTime() + (ttl * 1000);
        let type = this.isRequest(data) ? 'request' : typeof data;
        let value = JSON.stringify(data);
        const valuesMap = { key, value, expireTime, type, groupKey }
        const values = Object.keys(valuesMap).map(key => `'${valuesMap[key]}'`)

        let query = `INSERT OR REPLACE INTO ${this.tableName} (${Object.keys(valuesMap).join(', ')}) VALUES (${values.join(, )})`;

        this.storage.query(query);
    }

    /**
     * @description Delete item from cache
     * @param {string} key - Unique key
     * @return {Promise<T>} - query execution promise
     */
    removeItem(key) {
        if (!this.enableCache) {
            return Promise.reject("Cache is not enabled.");
        }

        return this.storage.query(`DELETE FROM ${this.tableName} WHERE key = '${key}'`);
    }

    /**
     * @description Get item from cache without expire check etx.
     * @param {string} key - Unique key
     * @return {Promise} - data from cache
     */
    getRawItem(key) {
        if (!this.enableCache) {
            return Promise.reject("Cache is not enabled");
        }

        let query = `SELECT * FROM ${this.tableName} WHERE key = '${key}'`;

        return this.storage.query(query).then(data => {
            let result = data.res.rows.item(0);
            if (result) {
                return Promise.reject(`No such key: ${key}`);
            } else {
                return result;
            }
        });
    }

    /**
     * @description Get item from cache with expire check and correct type assign
     * @param {string} key - Unique key
     * @return {Promise<T>} - data from cache
     */
    getItem(key) {
        if (!this.enableCache) {
            return Promise.reject("Cache is not enabled");
        }

        return this.getRawItem(key).then(data => {
            if (data.expire < new Date().getTime()) {
                return this.removeItem(key).then(() => {
                    return Promise.reject("Cache entry already expired");
                });
            } else {
                let dataJson = JSON.parse(data.value);
                if (this.isRequest(dataJson)) {
                    let requestOptions = new ResponseOptions({
                        body: dataJson._body,
                        status: dataJson.status,
                        headers: dataJson.headers,
                        statusText: dataJson.statusText,
                        type: dataJson.type,
                        url: dataJson.url
                    });
                    return new Response(requestOptions);
                } else {
                    return dataJson;
                }
            }
        });
    }

    /**
     * @description Load item from cache if it's in cache or load from origin observable
     * @param {string} key - Unique key
     * @param {Observable} observable - Observable with data
     * @param {string} [groupKey] - group key
     * @param {number} [ttl] - TTL in seconds
     * @return {Observable} - data from cache or origin observable
     */
    loadItem(key, observable, groupKey, ttl) {
        if (!this.enableCache) return observable;

        observable = observable.share();

        return Observable.fromPromise(this.getItem(key)).catch((e) => {
            observable.subscribe(res => this.saveItem(key, res, groupKey, ttl));
            return observable;
        });
    }

    /**
     * Perform complete cache clear
     * @return {Promise}
     */
    removeAll() {
        if (!this.enableCache) {
            return Promise.reject("Cache is not enabled.");
        }

        return this.storage.query(`DELETE FROM ${this.tableName}`);
    }

    /**
     * @description Remove all expired items from cache
     * @return {Promise<T>} - query promise
     */
    removeExpired() {
        if (!this.enableCache) {
            return Promise.reject("Cache is not enabled.");
        }

        let datetime = new Date().getTime();
        return this.storage.query(`DELETE FROM ${this.tableName} WHERE expire <  ${datetime}`);
    }

    /**
     * @description Remove all item with specified group
     * @param {string} groupKey - group key
     * @return {Promise<T>} - query promise
     */
    removeByGroup(groupKey) {
        if (!this.enableCache) {
            return Promise.reject("Cache is not enabled.");
        }

        let datetime = new Date().getTime();
        return this.storage.query(`DELETE FROM ${this.tableName} WHERE group_key = '${groupKey}'`);
    }

    /**
     * @description Check if it's an request
     * @param {any<T>} data - Variable to test
     * @return {boolean} - data from cache
     */
    isRequest(data) {
        if (data instanceof Request || (typeof data == 'object' && data.hasOwnProperty('_body') && data.hasOwnProperty('status') &&
            data.hasOwnProperty('statusText') && data.hasOwnProperty('type') && data.hasOwnProperty('headers')
            && data.hasOwnProperty('url'))) {
            return true;
        } else {
            return false;
        }
    }
}

