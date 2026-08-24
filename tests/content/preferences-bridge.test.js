// tests/content/preferences-bridge.test.js
const preferencesBridge = require('../../src/content/preferences-bridge');
const themeEngine = require('../../src/features/theme-engine');

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

    test('enabled:false should strip everything the extension applied', () => {
        // End-to-end check of the master toggle: whatever the enabled
        // path put on the page, the disabled path has to take back off.
        // Previously the theme half silently survived, so the page stayed
        // fully restyled while the extension reported itself off.
        preferencesBridge.applyPreferences({
            enabled: true,
            theme: 'light',
            accentColor: '#4ec9b0',
            fontSize: '15px',
            density: 'compact',
            hideChatList: true
        });

        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        expect(document.documentElement.classList.contains('mw-density-compact')).toBe(true);
        expect(document.documentElement.classList.contains('mw-hide-chat-list')).toBe(true);

        preferencesBridge.applyPreferences({ enabled: false });

        expect(document.documentElement.getAttribute('data-theme')).toBeNull();
        expect(document.documentElement.style.getPropertyValue('--accent-color')).toBe('');
        expect(document.documentElement.classList.contains('mw-density-compact')).toBe(false);
        expect(document.documentElement.classList.contains('mw-hide-chat-list')).toBe(false);
    });

    test('re-enabling restores the previous preferences', () => {
        preferencesBridge.applyPreferences({
            enabled: true, theme: 'light', density: 'spacious', hideChatList: true
        });
        preferencesBridge.applyPreferences({ enabled: false });
        preferencesBridge.applyPreferences({
            enabled: true, theme: 'light', density: 'spacious', hideChatList: true
        });

        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        expect(document.documentElement.classList.contains('mw-density-spacious')).toBe(true);
        expect(document.documentElement.classList.contains('mw-hide-chat-list')).toBe(true);
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
