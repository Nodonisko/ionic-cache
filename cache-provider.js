import {Injectable} from '@angular/core';
import {Storage, SqlStorage} from 'ionic-angular';
import {Observable} from 'rxjs/Rx';
import {Response, ResponseOptions} from '@angular/http';

@Injectable()
export class CacheProvider {


    static get parameters() {
        return []
    }

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
        let query = "CREATE TABLE IF NOT EXISTS " + this.tableName + " (key unique, value, expire, type, group_key)";

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
     * @return {Promise<T>} - query execution promise
     */
    saveItem(key, data, groupKey = 'none', ttl = this.ttl) {
        if (!this.enableCache) return Promise.reject("Cache is not enabled.");

        let expireTime = new Date().getTime() + ttl;
        let type = this.isRequest(data) ? 'request' : typeof data;
        let value = JSON.stringify(data);

        let query = "INSERT OR REPLACE INTO " + this.tableName + " (key, value, expire, type, group_key) VALUES ('" + key + "', '" + value + "', " + expireTime + ", '" + type + "', '" + groupKey + "')";

        return this.storage.query(query).catch(err => console.error(err));
    }

    /**
     * @description Delete item from cache
     * @param {string} key - Unique key
     * @return {Promise<T>} - query execution promise
     */
    removeItem(key) {
        if (!this.enableCache) return Promise.reject("Cache is not enabled.");

        let query = "DELETE FROM " + this.tableName + " WHERE key = '" + key + "'";

        return this.storage.query(query);
    }

    /**
     * @description Get item from cache without expire check etx.
     * @param {string} key - Unique key
     * @return {Promise} - data from cache
     */
    getRawItem(key) {
        let query = "SELECT * FROM " + this.tableName + " WHERE key = '" + key + "'";
        return new Promise((resolve, reject) => {
            if (!this.enableCache) reject("Cache is not enabled");

            this.storage.query(query).then(data => {
                let rows = data.res.rows;
                if (rows.length === 1) {
                    resolve(rows.item(0));
                } else {
                    reject("No items found in database.");
                }
            }).catch(err => reject(err));
        });
    }

    /**
     * @description Get item from cache with expire check and correct type assign
     * @param {string} key - Unique key
     * @return {Promise<T>} - data from cache
     */
    getItem(key) {
        return new Promise((resolve, reject) => {
            if (!this.enableCache) reject("Cache is not enabled");

            this.getRawItem(key).then(data => {
                if (data.expire < new Date().getTime()) {
                    this.removeItem(key).then(() => {
                        reject("Cache entry already expired");
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
                        resolve(new Response(requestOptions));
                    } else {
                        resolve(dataJson);
                    }
                }
            }).catch(err => {
                reject(err)
            });
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

        let data = Observable.fromPromise(this.getItem(key)).catch((e) => {
            console.log(e, key);
            observable.subscribe(res => this.saveItem(key, res, groupKey, ttl));
            return observable;
        });

        return data;
    }

    /**
     * Perform complete cache clear
     * @return {Promise}
     */
    removeAll() {
        if (!this.enableCache) return Promise.reject("Cache is not enabled.");

        let query = "DELETE FROM " + this.tableName;

        return this.storage.query(query);
    }

    /**
     * @description Remove all expired items from cache
     * @return {Promise<T>} - query promise
     */
    removeExpired() {
        if (!this.enableCache) return Promise.reject("Cache is not enabled.");

        let datetime = new Date().getTime();
        let query = "DELETE FROM " + this.tableName + " WHERE expire < " + datetime;

        return this.storage.query(query);
    }

    /**
     * @description Remove all item with specified group
     * @param {string} groupKey - group key
     * @return {Promise<T>} - query promise
     */
    removeByGroup(groupKey) {
        if (!this.enableCache) return Promise.reject("Cache is not enabled.");

        let datetime = new Date().getTime();
        let query = "DELETE FROM " + this.tableName + " WHERE group_key = '" + groupKey + "'";

        return this.storage.query(query);
    }

    /**
     * @description Check if it's an request
     * @param {any<T>} data - Variable to test
     * @return {boolean} - data from cache
     */
    isRequest(data) {
        if (typeof data == 'object' && data.hasOwnProperty('_body') && data.hasOwnProperty('status') &&
            data.hasOwnProperty('statusText') && data.hasOwnProperty('type') && data.hasOwnProperty('headers')
            && data.hasOwnProperty('url')) {
            return true;
        } else {
            return false;
        }
    }
}

