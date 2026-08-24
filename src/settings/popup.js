// src/settings/popup.js
//
// Theme is no longer user-configurable — the extension always applies the
// fixed dark palette (see theme-engine.js / theme-tokens.css). Only layout
// preferences remain here. theme/accentColor stay in the defaults purely
// so applyPreferences() in preferences-bridge.js still has a value to
// apply; there's no UI for them.
(function () {
    // Defaults come from storage-service.js (loaded ahead of this file by
    // popup.html) rather than a local copy. They used to be duplicated
    // here, and drift was not hypothetical: changing the accent colour
    // meant editing the same literal in three files, and missing one left
    // the popup writing a stale value back over the real one on save.
    // Shallow copy so nothing in here can mutate the canonical object.
    const DEFAULTS = { ...storageService.defaults };

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

    // Reads/writes go through storageService too, not raw chrome.storage,
    // so the popup gets the same default-merging and key validation the
    // content script already relies on.
    function load() {
        storageService.getPreferences(applyToForm);
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
        storageService.savePreferences(collectFromForm(), () => showStatus('// saved'));
    });

    el.reset.addEventListener('click', () => {
        storageService.savePreferences(DEFAULTS, () => {
            applyToForm(DEFAULTS);
            showStatus('// reset');
        });
    });

    load();
})();
