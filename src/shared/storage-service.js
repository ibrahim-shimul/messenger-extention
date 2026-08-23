// src/shared/storage-service.js
class StorageService {
    constructor() {
        this.schemaVersion = 1;
        this.defaults = {
            enabled: true,
            theme: 'light',
            density: 'cozy',
            accentColor: '#4ec9b0',
            fontSize: '15px',
            showTimestamp: true,
            enableFocusMode: false,
            hideChatList: false,
            hideChatField: false
        };
        this.listeners = new Set();
    }

    getPreferences(callback) {
        const keys = Object.keys(this.defaults);

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(keys, (result) => {
                const prefs = this.validatePreferences({ ...this.defaults, ...result });
                if (callback) callback(prefs);
            });
        } else {
            const prefs = { ...this.defaults };
            if (callback) callback(prefs);
        }
    }

    savePreferences(preferences, callback) {
        const validPrefs = this.validatePreferences(preferences);

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set(validPrefs, () => {
                this.listeners.forEach(listener => listener(validPrefs));
                if (callback) callback(validPrefs);
            });
        } else {
            this.listeners.forEach(listener => listener(validPrefs));
            if (callback) callback(validPrefs);
        }
    }

    validatePreferences(preferences) {
        const validated = {};

        Object.entries(this.defaults).forEach(([key, defaultValue]) => {
            const value = preferences ? preferences[key] : undefined;
            validated[key] = value !== undefined && value !== null ? value : defaultValue;
        });

        return validated;
    }

    addChangeListener(listener) {
        this.listeners.add(listener);
    }

    removeChangeListener(listener) {
        this.listeners.delete(listener);
    }

    clearPreferences(callback) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.clear(() => {
                if (callback) callback();
            });
        } else if (callback) {
            callback();
        }
    }
}

// Create singleton instance
const storageService = new StorageService();

// Export for use by other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = storageService;
}
