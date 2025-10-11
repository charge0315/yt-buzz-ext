module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleFileExtensions: ['js', 'json'],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  globals: {
    chrome: {
      runtime: {
        sendMessage: jest.fn(),
        onMessage: {
          addListener: jest.fn(),
        },
        lastError: null,
      },
      storage: {
        sync: {
          get: jest.fn(),
          set: jest.fn(),
        },
        local: {
          get: jest.fn(),
          set: jest.fn(),
          remove: jest.fn(),
        },
      },
      identity: {
        getAuthToken: jest.fn(),
        removeCachedAuthToken: jest.fn(),
      },
      alarms: {
        create: jest.fn(),
        clear: jest.fn(),
        onAlarm: {
          addListener: jest.fn(),
        },
      },
      i18n: {
        getMessage: jest.fn((key) => key),
      },
    },
  },
};
