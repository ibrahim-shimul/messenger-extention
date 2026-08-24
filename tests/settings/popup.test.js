// tests/settings/popup.test.js
//
// The popup runs as a plain <script> pair in an extension page, not as a
// CommonJS module, so these tests reproduce popup.html's real loading
// order (storage-service.js, then popup.js) against the popup's real
// markup. That's the only way to catch wiring breaks — the popup page
// can't be driven by browser automation, since Chrome blocks scripting
// of chrome-extension:// pages belonging to other extensions.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', '..', 'src');

function loadPopup() {
    const html = fs.readFileSync(path.join(SRC, 'settings', 'popup.html'), 'utf8');
    document.documentElement.innerHTML = html
        .replace(/<!DOCTYPE html>/i, '')
        .replace(/<script[^>]*><\/script>/g, '');

    // Same order popup.html declares them in.
    const context = vm.createContext({
        document,
        chrome: global.chrome,
        console,
        setTimeout,
        module: undefined
    });

    for (const rel of [['shared', 'storage-service.js'], ['settings', 'popup.js']]) {
        const code = fs.readFileSync(path.join(SRC, ...rel), 'utf8');
        vm.runInContext(code, context);
    }

    // A top-level `const` in a classic script lands in the context's
    // lexical scope, not as a property of the context object — so reach
    // it by evaluating in-context rather than via context.storageService.
    return {
        context,
        evaluate: (expression) => vm.runInContext(expression, context)
    };
}

describe('popup', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        chrome.storage.local.get.mockImplementation((keys, callback) => callback({}));
    });

    test('storage-service defaults are reachable from popup.js', () => {
        const { evaluate } = loadPopup();
        expect(evaluate('typeof storageService')).toBe('object');
        expect(evaluate('storageService.defaults.enabled')).toBe(true);
    });

    test('renders stored preferences into the form on load', () => {
        chrome.storage.local.get.mockImplementation((keys, callback) => {
            callback({ enabled: false, density: 'spacious', hideChatList: true });
        });

        loadPopup();

        expect(document.getElementById('mw-enabled').dataset.value).toBe('false');
        expect(document.getElementById('mw-density-select').value).toBe('spacious');
        expect(document.getElementById('mw-hide-chat-list').dataset.value).toBe('true');
        // Not in the stored set — should fall back to the shared default.
        expect(document.getElementById('mw-hide-chat-field').dataset.value).toBe('false');
    });

    test('toggling a boolean and saving persists the new value', () => {
        loadPopup();

        document.getElementById('mw-enabled').click();
        document.getElementById('mw-save').click();

        expect(chrome.storage.local.set).toHaveBeenCalled();
        const saved = chrome.storage.local.set.mock.calls[0][0];
        expect(saved.enabled).toBe(false);
    });

    test('save writes every known preference key, none missing', () => {
        const { evaluate } = loadPopup();
        document.getElementById('mw-save').click();

        const saved = chrome.storage.local.set.mock.calls[0][0];
        expect(Object.keys(saved).sort())
            .toEqual(evaluate('Object.keys(storageService.defaults)').sort());
    });

    test('reset restores defaults', () => {
        chrome.storage.local.get.mockImplementation((keys, callback) => {
            callback({ density: 'compact', hideChatList: true });
        });

        loadPopup();
        expect(document.getElementById('mw-hide-chat-list').dataset.value).toBe('true');

        document.getElementById('mw-reset').click();

        expect(document.getElementById('mw-hide-chat-list').dataset.value).toBe('false');
        expect(document.getElementById('mw-density-select').value).toBe('cozy');
    });
});
