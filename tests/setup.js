// Jest setup file
global.chrome = {
  runtime: {
    sendMessage: jest.fn(() => Promise.resolve()),
    onMessage: {
      addListener: jest.fn(),
    },
    lastError: null,
  },
  storage: {
    sync: {
      get: jest.fn(() => Promise.resolve({})),
      set: jest.fn(() => Promise.resolve()),
    },
    local: {
      get: jest.fn(() => Promise.resolve({})),
      set: jest.fn(() => Promise.resolve()),
      remove: jest.fn(() => Promise.resolve()),
    },
  },
  identity: {
    getAuthToken: jest.fn((options, callback) => callback('mock-token')),
    removeCachedAuthToken: jest.fn((options, callback) => callback()),
  },
  alarms: {
    create: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    onAlarm: {
      addListener: jest.fn(),
    },
  },
  i18n: {
    getMessage: jest.fn((key) => key),
  },
};
