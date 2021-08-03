import { NgModule, ModuleWithProviders, InjectionToken } from '@angular/core';
import { CacheConfig, CacheService } from './cache.service';
import { IonicStorageModule, Storage } from '@ionic/storage-angular';
import { CacheStorageService } from './cache-storage';

export const CONFIG = new InjectionToken<CacheConfig>('CONFIG');

let cacheConfigDefaults: CacheConfig = {
    keyPrefix: '',
};

export function buildCacheService(storage: Storage, cacheConfig: CacheConfig) {
    cacheConfig = Object.assign(cacheConfigDefaults, cacheConfig);

    return new CacheService(
        new CacheStorageService(storage, cacheConfig.keyPrefix)
    );
}

@NgModule({
    imports: [
        IonicStorageModule.forRoot({
            name: '__ionicCache',
            driverOrder: ['indexeddb', 'sqlite', 'websql'],
        }),
    ],
})
export class CacheModule {
    static forRoot(
        cacheConfig?: CacheConfig
    ): ModuleWithProviders<CacheModule> {
        return {
            ngModule: CacheModule,
            providers: [
                { provide: CONFIG, useValue: cacheConfig },
                {
                    provide: CacheService,
                    useFactory: buildCacheService,
                    deps: [Storage, CONFIG],
                },
            ],
        };
    }
}
