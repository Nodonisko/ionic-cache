import { TestBed } from '@angular/core/testing';
import { CacheStorageService } from './cache-storage';

import { CacheService, MESSAGES } from './cache.service';

describe('CacheService', () => {
    let service: CacheService;
    let dependencies: {
        cacheStorageService: jasmine.SpyObj<CacheStorageService>;
    };

    beforeEach(() => {
        dependencies = {
            cacheStorageService: jasmine.createSpyObj('cacheStorageService', [
                'create',
                'set',
                'remove',
                'get',
                'exists',
                'all',
            ]),
        };

        TestBed.configureTestingModule({
            providers: [
                CacheService,
                {
                    provide: CacheStorageService,
                    useValue: dependencies.cacheStorageService,
                },
            ],
        });
        service = TestBed.inject(CacheService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should set the network status to online', () => {
        expect(service.isOnline()).toBe(true);
    });

    describe('when a connect event is dispatched', () => {
        beforeEach(() => {
            window.dispatchEvent(new Event('online'));
        });

        it('should set the network status to online', () => {
            expect(service.isOnline()).toBe(true);
        });
    });

    describe('when a disconnect event is dispatched', () => {
        beforeEach(() => {
            window.dispatchEvent(new Event('offline'));
        });

        it('should set the network status to online', () => {
            expect(service.isOnline()).toBe(false);
        });
    });

    it('should create the cache', () => {
        expect(dependencies.cacheStorageService.create).toHaveBeenCalled();
    });

    it('should set cache enabled to true', () => {
        expect(service['cacheEnabled']).toBe(true);
    });

    describe('create', () => {
        beforeEach(() => {
            dependencies.cacheStorageService.create.calls.reset();
            service.create();
        });

        it('should create the cache', () => {
            expect(dependencies.cacheStorageService.create).toHaveBeenCalled();
        });
    });

    describe('enableCache', () => {
        describe('when enable is true', () => {
            beforeEach(() => {
                service.enableCache(true);
            });

            it('should set cacheEnabled to true', () => {
                expect(service['cacheEnabled']).toBe(true);
            });
        });

        describe('when enable is false', () => {
            beforeEach(() => {
                service.enableCache(false);
            });

            it('should set cacheEnabled to true', () => {
                expect(service['cacheEnabled']).toBe(false);
            });
        });
    });

    describe('setDefaultTTL', () => {
        const mockTTL = 1000;

        beforeEach(() => {
            service.setDefaultTTL(mockTTL);
        });

        it('should set the ttl', () => {
            expect(service['ttl']).toBe(mockTTL);
        });
    });

    describe('setOfflineInvalidate', () => {
        describe('when offlineInvalidate is true', () => {
            beforeEach(() => {
                service.setOfflineInvalidate(true);
            });

            it('should set invalidateOffline to false', () => {
                expect(service['invalidateOffline']).toBe(false);
            });
        });

        describe('when offlineInvalidate is false', () => {
            beforeEach(() => {
                service.setOfflineInvalidate(false);
            });

            it('should set invalidateOffline to true', () => {
                expect(service['invalidateOffline']).toBe(true);
            });
        });
    });

    describe('saveItem', () => {
        const mockKey = 'key';
        let mockData;

        beforeEach(() => {
            dependencies.cacheStorageService.set.calls.reset();
        });

        describe('when cache is enabled', () => {
            describe('when saving an object', () => {
                beforeEach(() => {
                    mockData = {};
                    return service.saveItem(mockKey, mockData);
                });

                it('should save the json string to storage', async () => {
                    const mockDataJson = JSON.stringify(mockData);

                    expect(
                        dependencies.cacheStorageService.set
                    ).toHaveBeenCalledWith(mockKey, {
                        value: mockDataJson,
                        expires: jasmine.any(Number),
                        type: 'object',
                        groupKey: 'none',
                    });
                });
            });

            describe('when saving a httpResponse', () => {
                beforeEach(() => {
                    mockData = {
                        status: 200,
                        statusText: 'Success',
                        headers: ['header'],
                        url: 'https://google.com',
                        body: {},
                    };
                    return service.saveItem(mockKey, mockData);
                });

                it('should save the json string to storage with the type of response', async () => {
                    const mockDataJson = JSON.stringify(mockData);

                    expect(
                        dependencies.cacheStorageService.set
                    ).toHaveBeenCalledWith(mockKey, {
                        value: mockDataJson,
                        expires: jasmine.any(Number),
                        type: 'response',
                        groupKey: 'none',
                    });
                });
            });

            describe('when saving a blob', () => {
                beforeEach(() => {
                    mockData = new Blob([''], { type: 'text/html' });
                    return service.saveItem(mockKey, mockData);
                });

                it('should save the json string of base64 to storage', async () => {
                    const mockDataBase64 = await service['asBase64'](mockData);
                    const mockDataJson = JSON.stringify(mockDataBase64);

                    expect(
                        dependencies.cacheStorageService.set
                    ).toHaveBeenCalledWith(mockKey, {
                        value: mockDataJson,
                        expires: jasmine.any(Number),
                        type: 'text/html',
                        groupKey: 'none',
                    });
                });
            });
        });

        describe('when cache is disabled', () => {
            beforeEach(() => {
                service['cacheEnabled'] = false;
            });

            it('should return an error', () => {
                try {
                    service.saveItem(mockKey, mockData);
                } catch (error) {
                    expect(error.message).toBe(MESSAGES[1]);
                }
            });
        });
    });

    describe('removeItem', () => {
        const mockKey = 'key';

        describe('when cache is enabled', () => {
            beforeEach(() => {
                service.removeItem(mockKey);
            });

            it('should remove the item in storage', () => {
                expect(
                    dependencies.cacheStorageService.remove
                ).toHaveBeenCalledWith(mockKey);
            });
        });

        describe('when cache is disabled', () => {
            beforeEach(() => {
                service['cacheEnabled'] = false;
            });

            it('should return an error', () => {
                try {
                    service.removeItem(mockKey);
                } catch (error) {
                    expect(error.message).toBe(MESSAGES[1]);
                }
            });
        });
    });

    describe('removeItems', () => {
        describe('when cache is enabled', () => {
            let mockStorageItems = [
                { key: 'movies/comedy/1', data: 'Scott Pilgrim vs. The World' },
                { key: 'movies/comedy/2', data: 'The Princess Bride' },
                { key: 'songs/metal/1', data: 'Who Bit the Moon' },
                { key: 'songs/metal/2', data: 'Hail The Apocalypse' },
                { key: 'songs/electronica/1', data: 'Power Glove' },
                { key: 'songs/electronica/2', data: 'Centipede' },
            ];

            beforeEach(() => {
                dependencies.cacheStorageService.all.and.returnValue(
                    Promise.resolve(mockStorageItems as any)
                );
            });

            describe('when using a wildcard', () => {
                beforeEach(() => {
                    return service.removeItems('songs*ctro*a/2');
                });

                it('should remove songs/electronica/2', () => {
                    expect(
                        dependencies.cacheStorageService.remove
                    ).toHaveBeenCalledWith('songs/electronica/2');
                });
            });
        });

        describe('when cache is disabled', () => {
            beforeEach(() => {
                service['cacheEnabled'] = false;
            });

            it('should return an error', async () => {
                try {
                    await service.removeItems('');
                } catch (error) {
                    expect(error.message).toBe(MESSAGES[1]);
                }
            });
        });
    });

    describe('getRawItem', () => {
        describe('when cache is enabled', () => {
            describe('when the item exists in storage', () => {
                const mockKey = 'key';

                beforeEach(() => {
                    dependencies.cacheStorageService.get.and.returnValue(
                        Promise.resolve({})
                    );
                    return service.getRawItem(mockKey);
                });

                it('should get the data from storage', () => {
                    expect(
                        dependencies.cacheStorageService.get
                    ).toHaveBeenCalledWith(mockKey);
                });
            });

            describe('when the item does not exist in storage', () => {
                it('should return an error', async () => {
                    try {
                        await service.getRawItem('');
                    } catch (error) {
                        expect(error.message).toBe(MESSAGES[3]);
                    }
                });
            });
        });

        describe('when cache is disabled', () => {
            beforeEach(() => {
                service['cacheEnabled'] = false;
            });

            it('should return an error', async () => {
                try {
                    await service.getRawItem('');
                } catch (error) {
                    expect(error.message).toBe(MESSAGES[1]);
                }
            });
        });
    });

    describe('getRawItems', () => {
        beforeEach(() => {
            return service.getRawItems();
        });

        it('should get all items from storage', () => {
            expect(dependencies.cacheStorageService.all).toHaveBeenCalled();
        });
    });

    describe('itemExists', () => {
        describe('when cache is enabled', () => {
            const mockKey = 'key';

            beforeEach(() => {
                return service.itemExists(mockKey);
            });

            it('should check if the key exists in storage', () => {
                expect(
                    dependencies.cacheStorageService.exists
                ).toHaveBeenCalledWith(mockKey);
            });
        });

        describe('when cache is disabled', () => {
            beforeEach(() => {
                service['cacheEnabled'] = false;
            });

            it('should return an error', async () => {
                try {
                    await service.itemExists('');
                } catch (error) {
                    expect(error.message).toBe(MESSAGES[1]);
                }
            });
        });
    });

    describe('getItem', () => {
        describe('when cache is enabled', () => {
            const mockKey = 'key';
            let mockData;

            describe('when the data has not expired', () => {
                beforeEach(() => {
                    mockData = {
                        value: JSON.stringify({ example: 'test' }),
                        expires: new Date().getTime() + 10000,
                    };
                    dependencies.cacheStorageService.get.and.returnValue(
                        Promise.resolve(mockData)
                    );
                    return service.getItem(mockKey);
                });

                it('should get if the key from storage', () => {
                    expect(
                        dependencies.cacheStorageService.get
                    ).toHaveBeenCalledWith(mockKey);
                });
            });

            describe('when the data has expired', () => {
                beforeEach(() => {
                    mockData = {
                        value: JSON.stringify({ example: 'test' }),
                        expires: new Date().getTime() - 10000,
                    };
                    dependencies.cacheStorageService.get.and.returnValue(
                        Promise.resolve(mockData)
                    );
                });

                describe('when invalidateOffline is true and online', () => {
                    it('should return an error', async () => {
                        try {
                            await service.getItem(mockKey);
                        } catch (error) {
                            expect(error.message).toBe(MESSAGES[2] + mockKey);
                        }
                    });
                });

                describe('when invalidateOffline is false and offline', () => {
                    beforeEach(() => {
                        service.setOfflineInvalidate(true);
                        service['networkStatus'] = false;
                        return service.getItem(mockKey);
                    });

                    it('should get if the key from storage', () => {
                        expect(
                            dependencies.cacheStorageService.get
                        ).toHaveBeenCalledWith(mockKey);
                    });
                });
            });
        });

        describe('when cache is disabled', () => {
            beforeEach(() => {
                service['cacheEnabled'] = false;
            });

            it('should return an error', async () => {
                try {
                    await service.getItem('');
                } catch (error) {
                    expect(error.message).toBe(MESSAGES[1]);
                }
            });
        });
    });

    describe('getOrSetItem', () => {
        const mockKey = 'key';

        beforeEach(() => {
            dependencies.cacheStorageService.get.calls.reset();
        });

        describe('when the item exists', () => {
            beforeEach(() => {
                dependencies.cacheStorageService.get.and.returnValue(
                    Promise.resolve({})
                );
                return service.getOrSetItem(mockKey, () => Promise.resolve({}));
            });

            it('should get the item from storage', () => {
                expect(
                    dependencies.cacheStorageService.get
                ).toHaveBeenCalledWith(mockKey);
            });
        });

        describe('when the item does not exist', () => {
            const mockData = { data: true };
            beforeEach(() => {
                dependencies.cacheStorageService.get.and.returnValue(
                    Promise.reject()
                );
                return service.getOrSetItem(mockKey, () =>
                    Promise.resolve(mockData)
                );
            });

            it('should set the item in storage', () => {
                expect(
                    dependencies.cacheStorageService.set
                ).toHaveBeenCalledWith(mockKey, {
                    value: JSON.stringify(mockData),
                    expires: jasmine.any(Number),
                    type: 'object',
                    groupKey: 'none',
                });
            });
        });
    });
});
