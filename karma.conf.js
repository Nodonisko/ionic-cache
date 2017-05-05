"use strict";

module.exports = config => {

  const conf = {
    frameworks: [
      'jasmine',
      'karma-typescript'
    ],

    plugins: [
      'karma-typescript',
      'karma-jasmine',
      'karma-phantomjs-launcher',
      'karma-chrome-launcher'
    ],

    preprocessors: {
      'src/**/*.ts': ['karma-typescript']
    },

    karmaTypescriptConfig: {
      bundlerOptions: {
        entrypoints: /\.spec\.ts$/,
        transforms: [
          require("karma-typescript-angular2-transform")
        ]
      },
      compilerOptions: {
        lib: ['es2015', 'dom']
      }
    },

    files: [
      { pattern: 'src/**/*', included: true, watched: true },
    ],

    reporters: ['progress'],

    port: 9876,
    colors: true,
    logLevel: config.INFO,
    autoWatch: true,
    browsers: [
      'Chrome',
      // 'PhantomJS'
    ],
    singleRun: false
  };

  if (process.env.CIRCLECI) {
    conf.browsers = ['PhantomJS'];
  }

  config.set(conf);

};
