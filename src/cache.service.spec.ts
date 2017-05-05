import "core-js"
import "zone.js/dist/zone";
import "zone.js/dist/long-stack-trace-zone";
import "zone.js/dist/proxy";
import "zone.js/dist/sync-test";
import "zone.js/dist/jasmine-patch";
import "zone.js/dist/async-test";
import "zone.js/dist/fake-async-test";

import { CacheService, MESSAGES } from './cache.service';
import { async, TestBed, inject } from '@angular/core/testing';
import {Http, HttpModule, XHRBackend, Response, ResponseOptions, RequestMethod} from "@angular/http";
import {MockBackend, MockConnection} from '@angular/http/testing';

import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from "@angular/platform-browser-dynamic/testing";

TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());

describe('CacheService', () => {

  let service: any;

  beforeAll(() => {
    service = new CacheService();
  });

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

describe('Http Caching', () => {

  const key: string = 'http_cache_test';

  const mockUrl: string = 'https://somelink.com/path/to/endpoint';

  const mockResponse = {
    hello: 'world'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ HttpModule ],
      providers: [
        { provide: XHRBackend, useClass: MockBackend },
        CacheService
      ]
    });
  });

  it('should create an instance of the service', inject([XHRBackend, CacheService], (mockBackend: XHRBackend, cache: CacheService) => {
    expect(mockBackend).toBeDefined();
    expect(cache).toBeDefined();
  }));

  // it('', inject([XHRBackend, CacheService], (mockBackend: XHRBackend, cache: CacheService) => { }))

  it('should cache HTTP request', async(inject([XHRBackend, CacheService, Http], (mockBackend: MockBackend, cache: CacheService, http: Http) => {

    mockBackend.connections.subscribe((connection: MockConnection) => {
      expect(connection.request.method).toBe(RequestMethod.Get);
      expect(connection.request.url).toBe(mockUrl);

      connection.mockRespond(new Response(
        new ResponseOptions({ body: mockResponse })
      ));
    });

    cache.loadFromObservable(key, http.get(mockUrl))
      .subscribe(res => {
        expect(res).toEqual(mockResponse);
      });

  })));

});
