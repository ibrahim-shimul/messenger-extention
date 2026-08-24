// src/features/theme-engine.js
class ThemeEngine {
    constructor() {
        this.currentTheme = {};
        this.root = document.documentElement;
        this.enabled = true;
        console.log('[MW ThemeEngine] Initialized');
    }
    
    // Helper to convert camelCase to kebab-case
    toKebabCase(str) {
        return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }

    // Strips the currently-applied theme off <html>. Deliberately NOT
    // gated on this.enabled — that gate belongs on the "write new styles"
    // path (applyTheme), never on the "undo what we already wrote" path.
    //
    // This distinction was a real bug (fixed 2026-08-23): resetTheme()
    // used to be implemented as applyTheme({}), so setEnabled(false) —
    // which sets this.enabled = false and *then* asks for a reset — hit
    // applyTheme's `if (!this.enabled) return` guard and silently cleared
    // nothing. The master enable/disable toggle therefore left data-theme
    // and every custom property in place, meaning nearly all of
    // chatgpt-style.css (scoped under html[data-theme]) stayed applied
    // while the extension reported itself disabled.
    clearAppliedTheme() {
        Object.keys(this.currentTheme).forEach(key => {
            this.root.removeAttribute(`data-${key}`);
            this.root.style.removeProperty(`--${this.toKebabCase(key)}`);
        });
        this.currentTheme = {};
    }

    applyTheme(preferences) {
        if (!this.enabled) return;

        this.clearAppliedTheme();

        // Apply new theme
        this.currentTheme = { ...preferences };
        Object.entries(this.currentTheme).forEach(([key, value]) => {
            if (key === 'theme') {
                this.root.setAttribute(`data-${key}`, value);
            } else {
                // Convert value to string if it isn't already
                const stringValue = String(value);
                const kebabKey = this.toKebabCase(key);
                this.root.style.setProperty(`--${kebabKey}`, stringValue);
            }
        });
    }

    getCurrentTheme() {
        return { ...this.currentTheme };
    }

    resetTheme() {
        this.clearAppliedTheme();
    }

    setEnabled(enabled) {
        this.enabled = !!enabled;
        if (!this.enabled) {
            this.clearAppliedTheme();
        }
    }
}

// Create singleton instance
const themeEngine = new ThemeEngine();

// Register with bootstrap
if (typeof bootstrap !== 'undefined') {
    bootstrap.registerModule(themeEngine);
}

// Export for use by other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = themeEngine;
}
