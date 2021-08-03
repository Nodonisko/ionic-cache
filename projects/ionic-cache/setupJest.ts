import 'jest-preset-angular/setup-jest';

declare let global: any;

global.fetch = jest.fn(() =>
    Promise.resolve({
        blob: () => {}
    })
);
