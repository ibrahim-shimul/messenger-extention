// tests/shared/storage-service.test.js
const storageService = require('../../src/shared/storage-service');

describe('StorageService', () => {
    beforeEach(() => {
        storageService.listeners = new Set();
        jest.clearAllMocks();
    });

    test('should merge stored values with defaults', (done) => {
        chrome.storage.local.get.mockImplementationOnce((keys, callback) => {
            callback({ theme: 'dark' });
        });

        storageService.getPreferences((prefs) => {
            expect(prefs.theme).toBe('dark');
            expect(prefs.density).toBe('cozy'); // default
            done();
        });
    });

    test('should fall back to defaults for missing keys', (done) => {
        chrome.storage.local.get.mockImplementationOnce((keys, callback) => {
            callback({});
        });

        storageService.getPreferences((prefs) => {
            expect(prefs).toEqual(storageService.defaults);
            done();
        });
    });

    test('should validate and save preferences', (done) => {
        storageService.savePreferences({ theme: 'dark', density: 'compact' }, (saved) => {
            expect(chrome.storage.local.set).toHaveBeenCalledWith(
                expect.objectContaining({ theme: 'dark', density: 'compact' }),
                expect.any(Function)
            );
            expect(saved.accentColor).toBe(storageService.defaults.accentColor);
            done();
        });
    });

    test('should notify listeners on save', (done) => {
        const listener = jest.fn();
        storageService.addChangeListener(listener);

        storageService.savePreferences({ theme: 'dark' }, () => {
            expect(listener).toHaveBeenCalledWith(expect.objectContaining({ theme: 'dark' }));
            done();
        });
    });

    test('should remove listeners', () => {
        const listener = jest.fn();
        storageService.addChangeListener(listener);
        storageService.removeChangeListener(listener);
        expect(storageService.listeners.has(listener)).toBe(false);
    });

    test('should clear preferences', (done) => {
        storageService.clearPreferences(() => {
            expect(chrome.storage.local.clear).toHaveBeenCalled();
            done();
        });
    });
});
