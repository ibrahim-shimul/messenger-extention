// tests/content/preferences-bridge.test.js
const preferencesBridge = require('../../src/content/preferences-bridge');
const themeEngine = require('../../src/features/theme-engine');
const layoutEnhancer = require('../../src/features/layout-enhancer');

describe('PreferencesBridge', () => {
    beforeEach(() => {
        themeEngine.currentTheme = {};
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.className = '';
        jest.clearAllMocks();
    });

    test('should apply theme and density from preferences', () => {
        const prefs = {
            theme: 'dark',
            accentColor: '#0066cc',
            fontSize: '16px',
            density: 'compact'
        };

        preferencesBridge.applyPreferences(prefs);

        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(document.documentElement.classList.contains('mw-density-compact')).toBe(true);
    });

    test('should load stored preferences and apply them on init', () => {
        chrome.storage.local.get.mockImplementationOnce((keys, callback) => {
            callback({ theme: 'dark', density: 'spacious' });
        });

        preferencesBridge.init();

        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(document.documentElement.classList.contains('mw-density-spacious')).toBe(true);
    });
});
