import 'core-js';
import 'zone.js/dist/zone';
import 'zone.js/dist/long-stack-trace-zone';
import 'zone.js/dist/proxy';
import 'zone.js/dist/sync-test';
import 'zone.js/dist/jasmine-patch';
import 'zone.js/dist/async-test';
import 'zone.js/dist/fake-async-test';
import { CacheService, MESSAGES } from './cache.service';
import { async, TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import { Storage } from '@ionic/storage';

TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());

describe('CacheService', () => {

  let service: CacheService;

  beforeAll(() => {
    service = new CacheService(new Storage({
      name: '__ionicCache'
    }));
  });

  afterAll(async(() => {
    service.clearAll();
  }));

  it('should create an instance of the service', () => expect(service).toBeDefined());

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

  it('should enable cache', () => {
    service.enableCache(true);
    expect((<any> service).cacheEnabled === true).toBeTruthy();
  });

});

describe('Observable Caching', () => {

  const key: string = 'http_cache_test';

  let mockData: any = {
    hello: 'world'
  };

  let observable = Observable.of(mockData);

  let service: CacheService;

  beforeAll(() => {
    service = new CacheService(new Storage({
      name: '__ionicCache'
    }));
  });

  beforeEach(() => {
    spyOn(observable, 'subscribe').and.callThrough();
  });

  afterAll(function(done) {
    service.clearAll()
      .then(() => done())
      .catch(() => done());
  });

  it('should create an instance of the service', () => {
    expect(service).toBeDefined();
  });

  // it('', inject([XHRBackend, CacheService], (mockBackend: XHRBackend, cache: CacheService) => { }))

  it('should return data from observable (async)', function(done) {
    service.loadFromObservable(key, observable)
      .subscribe(res => {
        expect(res).toBeDefined();
        expect(observable.subscribe).toHaveBeenCalled();
        expect(res).toEqual(mockData);
        done();
      });
  });

  it('should return cached observable data (async)', function(done) {
      service.loadFromObservable(key, observable)
        .subscribe(res => {
          expect(observable.subscribe).not.toHaveBeenCalled();
          expect(res).toEqual(mockData);
          done();
        });
  });

});
