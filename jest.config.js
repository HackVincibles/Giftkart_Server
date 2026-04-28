module.exports = {
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    testMatch: ['<rootDir>/tests/**/*.test.js'],
    collectCoverageFrom: [
        'routes/**/*.js',
        'controllers/**/*.js',
        'models/**/*.js',
        'middleware/**/*.js',
        '!**/node_modules/**',
        '!**/tests/**'
    ],
    coverageDirectory: 'tests/coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    verbose: true,
    detectOpenHandles: true,
    forceExit: true,
    testTimeout: 10000,
    modulePathIgnorePatterns: ['<rootDir>/tests/mongodb-memory-server/']
};
