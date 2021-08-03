const config = {
    preset: 'jest-preset-angular',
    setupFilesAfterEnv: ['<rootDir>/projects/ionic-cache/setupJest.ts'],
    transformIgnorePatterns: ['node_modules/(?!@ionic)'],
    coveragePathIgnorePatterns: ['node_modules'],
    globals: {
        'ts-jest': {
            tsconfig: '<rootDir>/projects/ionic-cache/tsconfig.spec.json'
        }
    },
    moduleNameMapper: {
        '^@ionic/storage': '<rootDir>/node_modules/@ionic/storage/dist/esm/index.d.ts'
    }
};

module.exports = config;
