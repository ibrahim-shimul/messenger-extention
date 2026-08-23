// tests/settings/settings-ui.test.js
const settingsUI = require('../../src/settings/settings-ui');

describe('SettingsUI', () => {
    beforeEach(() => {
        if (settingsUI.panel) {
            settingsUI.panel.remove();
        }
        settingsUI.panel = null;
        settingsUI.isVisible = false;
        jest.clearAllMocks();
    });

    test('should create panel and append to document body', () => {
        settingsUI.createPanel();

        expect(document.getElementById('mw-settings-panel')).not.toBeNull();
    });

    test('should show and hide the panel', () => {
        settingsUI.show();
        expect(settingsUI.isVisible).toBe(true);
        expect(settingsUI.panel.style.display).toBe('block');

        settingsUI.hide();
        expect(settingsUI.isVisible).toBe(false);
        expect(settingsUI.panel.style.display).toBe('none');
    });

    test('should toggle visibility', () => {
        settingsUI.toggle();
        expect(settingsUI.isVisible).toBe(true);

        settingsUI.toggle();
        expect(settingsUI.isVisible).toBe(false);
    });

    test('should collect preferences from UI controls', () => {
        settingsUI.createPanel();
        settingsUI.panel.querySelector('input[name="theme"][value="dark"]').checked = true;
        settingsUI.panel.querySelector('#mw-density-select').value = 'compact';
        settingsUI.panel.querySelector('#mw-show-timestamp').checked = true;
        settingsUI.panel.querySelector('#mw-enable-focus-mode').checked = false;

        const prefs = settingsUI.collectPreferencesFromUI();

        expect(prefs).toEqual({
            theme: 'dark',
            density: 'compact',
            showTimestamp: true,
            enableFocusMode: false
        });
    });

    test('should save preferences to chrome.storage', () => {
        const testPrefs = { theme: 'dark', density: 'compact' };
        settingsUI.savePreferences(testPrefs);

        expect(chrome.storage.local.set).toHaveBeenCalledWith(
            expect.objectContaining(testPrefs)
        );
    });

    test('should reset to defaults and hide panel', () => {
        settingsUI.show();
        settingsUI.reset();

        expect(chrome.storage.local.set).toHaveBeenCalledWith(settingsUI.defaultPreferences);
        expect(settingsUI.isVisible).toBe(false);
    });
});
