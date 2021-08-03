import { NgModule, ModuleWithProviders, InjectionToken } from '@angular/core';
import { CacheService } from './services/cache/cache.service';
import { IonicStorageModule } from '@ionic/storage-angular';
import { defaultConfig } from './constants/default-config.contant';
import { CacheConfig } from './interfaces/cache-config.interface';

export const CONFIG = new InjectionToken<CacheConfig>('CONFIG');

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
                {
                    provide: CONFIG,
                    useValue: { ...defaultConfig, ...cacheConfig },
                },
                CacheService,
            ],
        };
    }
}
