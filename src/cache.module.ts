import { NgModule, ModuleWithProviders } from '@angular/core';
import { CacheService, CacheConfig } from './cache.service';
import { IonicStorageModule, Storage } from '@ionic/storage';
import { CacheStorageService } from './cache-storage.service';

@NgModule({
  imports: [
    IonicStorageModule.forRoot({
      name: '__ionicCache',
      driverOrder: ['indexeddb', 'sqlite', 'websql']
    })
  ]
})
export class CacheModule {
  static forRoot(cacheConfig?: CacheConfig): ModuleWithProviders {
    return {
      ngModule: CacheModule,
      providers: [
        {
          provide: CacheService,
          useFactory: (storage: Storage) => {
            return new CacheService(new CacheStorageService(storage, cacheConfig.keyPrefix || ''));
          },
          deps: [Storage]
        }
      ]
    };
  }
}
