import { CacheService } from './cache.service';
import { async } from '@angular/core/testing';

describe('FacebookService', () => {

  let service: CacheService;

  beforeAll(() => {
    service = new CacheService();
  });

  it('should create an instance of the service', () => {
    expect(service).toBeDefined();
  });

});
