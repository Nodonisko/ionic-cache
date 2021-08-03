export interface StorageCacheItem {
    key: string;
    value: any;
    expires: number;
    type: string;
    groupKey: string;
}
