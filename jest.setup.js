// jest.setup.js
// Mock chrome.storage for testing
global.chrome = {
    storage: {
        local: {
            get: jest.fn((keys, callback) => {
                const result = {};
                if (typeof keys === 'string') {
                    result[keys] = 'test-value';
                } else if (Array.isArray(keys)) {
                    keys.forEach(key => {
                        result[key] = 'test-value';
                    });
                }
                callback(result);
            }),
            set: jest.fn((items, callback) => {
                if (callback) callback();
            }),
            clear: jest.fn((callback) => {
                if (callback) callback();
            })
        }
    }
};

// Mock console methods to prevent test output cluttering
console.log = jest.fn();
console.warn = jest.fn();
console.error = jest.fn();
