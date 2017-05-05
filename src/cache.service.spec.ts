import { CacheService, MESSAGES } from './cache.service';
import { async } from '@angular/core/testing';

describe('CacheService', () => {

  let service: CacheService;

  beforeAll(() => {
    service = new CacheService();
  });

  it('should create an instance of the service', () => {
    expect(service).toBeDefined();
  });

  it('should save item to storage (async)', async(() => {
    service.saveItem('name', 'ibby')
      .then(() => expect(true).toBeTruthy())
      .catch(() => expect(false).toBeTruthy());
  }));

  it('should get previously stored value (async)', async(() => {
    service.getItem('name')
      .then(value => expect(value).toEqual('ibby'))
      .catch(() => expect(false).toBeTruthy());
  }));

  it('should disable cache', () => {
    service.enableCache(false);
    expect((<any> service).cacheEnabled === false).toBeTruthy();
  });

  it('should throw an error when getting item and cache is disabled', async(() => {
    service.getItem('name')
      .then(() => expect(false).toBeTruthy())
      .catch((e) => expect(e).toEqual(MESSAGES[1]));
  }));

});
