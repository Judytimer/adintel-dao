/**
 * Jest test setup
 */

// Mock Chrome API
global.chrome = {
  runtime: {
    onInstalled: {
      addListener: jest.fn(),
    },
    onMessage: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn(),
    openOptionsPage: jest.fn(),
  },
  storage: {
    local: {
      get: jest.fn((keys, callback) => {
        if (callback) callback({});
        return Promise.resolve({});
      }),
      set: jest.fn((items, callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
      remove: jest.fn((keys, callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
    },
  },
  tabs: {
    create: jest.fn(),
    query: jest.fn(() => Promise.resolve([])),
    sendMessage: jest.fn(),
  },
  action: {
    onClicked: {
      addListener: jest.fn(),
    },
    openPopup: jest.fn(),
  },
  alarms: {
    create: jest.fn(),
    onAlarm: {
      addListener: jest.fn(),
    },
  },
  notifications: {
    create: jest.fn(),
  },
} as any;

// Mock window
Object.defineProperty(window, 'location', {
  value: {
    hostname: 'example.com',
  },
  writable: true,
});

// Mock DOM methods
global.MutationObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(() => []),
})) as any;

// Add custom matchers if needed
expect.extend({
  toBeValidAdData(received) {
    const pass = 
      received &&
      typeof received === 'object' &&
      'id' in received &&
      'timestamp' in received &&
      'platform' in received &&
      'type' in received;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be valid AdData`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be valid AdData`,
        pass: false,
      };
    }
  },
});