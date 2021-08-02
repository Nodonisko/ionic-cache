## 6.0.0 (Unreleased)

Version 6 is a large under the hood refactor / upgrade that brings the project up to modern angular standards. There have been no functionality changes.

### Migrating from V5

**@ionic/storage-angular:** This package now requires the @ionic/storage-angular package at version 3 rather than @ionic/storage.

Steps for upgrade

```npm rm @ionic/storage```

```npm install @ionic/storage-angular@latest```

**Angular 12:** This package now uses Angular 12. The minimum supported version for the package is now Angular 9.
