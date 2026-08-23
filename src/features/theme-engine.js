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
    
    applyTheme(preferences) {
        if (!this.enabled) return;
        
        // Clear previous theme attributes
        Object.keys(this.currentTheme).forEach(key => {
            this.root.removeAttribute(`data-${key}`);
            this.root.style.removeProperty(`--${this.toKebabCase(key)}`);
        });
        
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
        
        console.log('[MW ThemeEngine] Applied theme:', this.currentTheme);
    }
    
    getCurrentTheme() {
        return { ...this.currentTheme };
    }
    
    resetTheme() {
        this.applyTheme({});
    }
    
    setEnabled(enabled) {
        this.enabled = !!enabled;
        if (!this.enabled) {
            this.resetTheme();
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
