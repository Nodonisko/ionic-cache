/**
 * System configuration for Angular samples
 * Adjust as necessary for your application needs.
 */
(function (global) {
  System.config({
    paths: {
      'npm:': 'node_modules/'
    },
    map: {
      'app': 'dist/',
      '@angular/core': 'npm:@angular/core/bundles/core.umd.js',
      '@angular/http': 'npm:@angular/http/bundles/http.umd.js',
      '@angular/common': 'npm:@angular/common/bundles/common.umd.js',
      '@angular/compiler': 'npm:@angular/compiler/bundles/compiler.umd.js',
      '@angular/platform-browser': 'npm:@angular/platform-browser/bundles/platform-browser.umd.js',
      '@angular/platform-browser-dynamic': 'npm:@angular/platform-browser-dynamic/bundles/platform-browser-dynamic.umd.js',
      'rxjs':                      'npm:rxjs'
    },
    packages: {
      app: {
        defaultExtension: 'js',
      },
      rxjs: {
        defaultExtension: 'js'
      }
    }
  });
})(this);
