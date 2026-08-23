// src/content/preferences-bridge.js
// Loads stored preferences on startup and keeps the page in sync with
// changes made from the popup (via storageService's change listeners).

// In the browser, content scripts share a global scope, so themeEngine and
// layoutEnhancer are already defined by the time this file runs. Under
// CommonJS (tests, bundlers) each file is its own module scope, so require
// them directly there instead.
let mwThemeEngine = typeof themeEngine !== 'undefined' ? themeEngine : null;
let mwLayoutEnhancer = typeof layoutEnhancer !== 'undefined' ? layoutEnhancer : null;
let mwStorageService = typeof storageService !== 'undefined' ? storageService : null;
let mwObserverCoordinator = typeof observerCoordinator !== 'undefined' ? observerCoordinator : null;
if (typeof module !== 'undefined' && module.exports) {
    mwThemeEngine = mwThemeEngine || require('../features/theme-engine');
    mwLayoutEnhancer = mwLayoutEnhancer || require('../features/layout-enhancer');
    mwStorageService = mwStorageService || require('../shared/storage-service');
    mwObserverCoordinator = mwObserverCoordinator || require('./observer-coordinator');
}

class PreferencesBridge {
    constructor() {
        console.log('[MW PreferencesBridge] Initialized');
    }

    init() {
        if (!mwStorageService) return;

        mwStorageService.getPreferences((prefs) => this.applyPreferences(prefs));
        mwStorageService.addChangeListener((prefs) => this.applyPreferences(prefs));

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener((changes, area) => {
                if (area !== 'local') return;
                mwStorageService.getPreferences((prefs) => this.applyPreferences(prefs));
            });
        }

        // Messenger is a single-page app that rerenders its main pane on
        // navigation; reapply the current density tag when that happens so
        // it doesn't silently fall off the (possibly replaced) element.
        if (mwObserverCoordinator && mwLayoutEnhancer) {
            mwObserverCoordinator.registerCallback(() => {
                mwLayoutEnhancer.applyDensity(mwLayoutEnhancer.getCurrentDensity());
                mwLayoutEnhancer.hideHeaderActionButtons();
                mwLayoutEnhancer.hideComposerActionButtons();
            });
        }
    }

    applyPreferences(prefs) {
        // Master on/off switch, checked first: ThemeEngine.setEnabled(false)
        // strips data-theme and every custom property from <html>, which
        // takes almost all of chatgpt-style.css down with it in one move
        // (nearly every rule in that file is scoped under
        // html[data-theme]). LayoutEnhancer.setEnabled() handles the rest
        // — the density/visibility classes and button hides that aren't
        // CSS-gated the same way. Both setEnabled() calls are safe to call
        // every time regardless of whether the state actually changed.
        const enabled = prefs.enabled !== false;
        if (mwThemeEngine) mwThemeEngine.setEnabled(enabled);
        if (mwLayoutEnhancer) mwLayoutEnhancer.setEnabled(enabled);

        if (!enabled) return;

        if (mwThemeEngine) {
            mwThemeEngine.applyTheme({
                theme: prefs.theme,
                accentColor: prefs.accentColor,
                fontSize: prefs.fontSize
            });
        }

        if (mwLayoutEnhancer) {
            mwLayoutEnhancer.applyDensity(prefs.density);
            mwLayoutEnhancer.applyVisibility(prefs.hideChatList, prefs.hideChatField);
        }
    }
}

// Create singleton instance
const preferencesBridge = new PreferencesBridge();

// Register with bootstrap
if (typeof bootstrap !== 'undefined') {
    bootstrap.registerModule(preferencesBridge);
}

// This is the last content script listed in manifest.json's "js" array, so
// every other module has had a chance to register with bootstrap by now.
// Trigger startup here rather than in bootstrap.js itself (see the note
// there) so initModules() runs against the full module list.
if (typeof bootstrap !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            bootstrap.initModules();
            bootstrap.detectNavigation();
        });
    } else {
        bootstrap.initModules();
        bootstrap.detectNavigation();
    }
}

// Export for use by other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = preferencesBridge;
}
