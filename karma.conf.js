"use strict";

module.exports = config => {

  const conf = {
    basePath: '',
    frameworks: ['jasmine'],

    plugins: [
      'karma-jasmine',
      'karma-chrome-launcher',
      'karma-phantomjs-launcher',
      'karma-jasmine-html-reporter',
      'karma-babel-preprocessor',
    ],

    preprocessors: {
      'dist/**/*.js': ['babel']
    },

    babelPreprocessor: {
      options: {
        presets: ['es2015'],
      }
    },

    files: [
      'node_modules/babel-polyfill/dist/polyfill.js',
      'node_modules/systemjs/dist/system.src.js',

      // Polyfills
      'node_modules/core-js/client/shim.js',

      // zone.js
      'node_modules/zone.js/dist/zone.js',
      'node_modules/zone.js/dist/long-stack-trace-zone.js',
      'node_modules/zone.js/dist/proxy.js',
      'node_modules/zone.js/dist/sync-test.js',
      'node_modules/zone.js/dist/jasmine-patch.js',
      'node_modules/zone.js/dist/async-test.js',
      'node_modules/zone.js/dist/fake-async-test.js',

      {pattern: 'karma-test-shim.js', included: true, watched: true},

      // paths loaded via module imports
      {pattern: 'dist/**/*.js', included: false, watched: true},

      // paths to support debugging with source maps in dev tools
      {pattern: 'src/**/*.ts', included: false, watched: false},
      {pattern: 'dist/**/*.js.map', included: false, watched: false},

      // RxJs
      { pattern: 'node_modules/rxjs/**/*.js', included: false, watched: false },
      { pattern: 'node_modules/rxjs/**/*.js.map', included: false, watched: false },

      // Paths loaded via module imports:
      // Angular itself
      { pattern: 'node_modules/@angular/**/*.js', included: false, watched: false },
      { pattern: 'node_modules/@angular/**/*.js.map', included: false, watched: false },

      { pattern: 'systemjs.config.js', included: false, watched: false }
    ],

    // Proxied base paths for loading assets
    proxies: {
      '/dist/': '/base/dist/'
    },
    exclude: [],
    reporters: ['progress', 'kjhtml'],

    port: 9876,
    colors: true,
    logLevel: config.INFO,
    autoWatch: true,
    browsers: [
      // 'Chrome',
      'PhantomJS'
    ],
    singleRun: false
  };

  config.set(conf);

};
