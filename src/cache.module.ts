import { NgModule, ModuleWithProviders } from '@angular/core';
import { CacheService } from './cache.service';

@NgModule()
export class CacheModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: CacheModule,
      providers: [
        CacheService
      ]
    }
  }
}
