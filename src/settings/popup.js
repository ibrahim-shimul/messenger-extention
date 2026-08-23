// src/settings/popup.js
//
// Theme is no longer user-configurable — the extension always applies the
// fixed ChatGPT-flat light palette (see theme-engine.js / theme-tokens.css).
// Only layout preferences remain here. theme/accentColor stay in DEFAULTS
// (and storage-service.js's own defaults) purely so applyPreferences() in
// preferences-bridge.js still has a value to apply; there's no UI for them.
(function () {
    const DEFAULTS = {
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

    const el = {
        enabled: document.getElementById('mw-enabled'),
        density: document.getElementById('mw-density-select'),
        fontSize: document.getElementById('mw-font-size'),
        showTimestamp: document.getElementById('mw-show-timestamp'),
        enableFocusMode: document.getElementById('mw-enable-focus-mode'),
        hideChatList: document.getElementById('mw-hide-chat-list'),
        hideChatField: document.getElementById('mw-hide-chat-field'),
        save: document.getElementById('mw-save'),
        reset: document.getElementById('mw-reset'),
        status: document.getElementById('mw-status')
    };

    function setBool(button, value) {
        button.dataset.value = String(value);
        button.textContent = String(value);
    }

    function getBool(button) {
        return button.dataset.value === 'true';
    }

    function applyToForm(prefs) {
        setBool(el.enabled, prefs.enabled !== false);
        el.density.value = prefs.density;
        el.fontSize.value = prefs.fontSize;
        setBool(el.showTimestamp, prefs.showTimestamp !== false);
        setBool(el.enableFocusMode, prefs.enableFocusMode === true);
        setBool(el.hideChatList, prefs.hideChatList === true);
        setBool(el.hideChatField, prefs.hideChatField === true);
    }

    function collectFromForm() {
        return {
            enabled: getBool(el.enabled),
            theme: DEFAULTS.theme,
            density: el.density.value,
            accentColor: DEFAULTS.accentColor,
            fontSize: el.fontSize.value,
            showTimestamp: getBool(el.showTimestamp),
            enableFocusMode: getBool(el.enableFocusMode),
            hideChatList: getBool(el.hideChatList),
            hideChatField: getBool(el.hideChatField)
        };
    }

    function showStatus(message) {
        el.status.textContent = message;
        setTimeout(() => { el.status.textContent = ''; }, 1500);
    }

    function load() {
        chrome.storage.local.get(Object.keys(DEFAULTS), (result) => {
            applyToForm({ ...DEFAULTS, ...result });
        });
    }

    el.enabled.addEventListener('click', () => {
        setBool(el.enabled, !getBool(el.enabled));
    });

    el.showTimestamp.addEventListener('click', () => {
        setBool(el.showTimestamp, !getBool(el.showTimestamp));
    });

    el.enableFocusMode.addEventListener('click', () => {
        setBool(el.enableFocusMode, !getBool(el.enableFocusMode));
    });

    el.hideChatList.addEventListener('click', () => {
        setBool(el.hideChatList, !getBool(el.hideChatList));
    });

    el.hideChatField.addEventListener('click', () => {
        setBool(el.hideChatField, !getBool(el.hideChatField));
    });

    el.save.addEventListener('click', () => {
        const prefs = collectFromForm();
        chrome.storage.local.set(prefs, () => showStatus('// saved'));
    });

    el.reset.addEventListener('click', () => {
        chrome.storage.local.set(DEFAULTS, () => {
            applyToForm(DEFAULTS);
            showStatus('// reset');
        });
    });

    load();
})();
