// src/content/bootstrap.js
class ContentBootstrap {
    constructor() {
        this.modules = [];
        this.initialized = false;
    }
    
    registerModule(module) {
        if (module && typeof module.init === 'function') {
            this.modules.push(module);
            console.log('[MW Bootstrap] Registered module:', module.name || module.constructor.name);
        }
    }
    
    initModules() {
        if (this.initialized) {
            console.log('[MW Bootstrap] Already initialized, skipping');
            return;
        }
        
        console.log('[MW Bootstrap] Initializing modules...');
        this.initialized = true;
        
        this.modules.forEach(module => {
            try {
                console.log('[MW Bootstrap] Initializing module:', module.name || module.constructor.name);
                module.init();
            } catch (error) {
                console.error('[MW Bootstrap] Error initializing module:', module.name || module.constructor.name, error);
            }
        });
        
        console.log('[MW Bootstrap] All modules initialized');
    }
    
    detectNavigation() {
        let lastUrl = location.href;
        const observer = new MutationObserver(() => {
            const currentUrl = location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                console.log('[MW Bootstrap] URL change detected:', currentUrl);
                // Re-initialize modules on navigation
                this.initModules();
            }
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    }
}

// Create singleton instance
const bootstrap = new ContentBootstrap();

// NOTE: initModules() is intentionally NOT called here. Content scripts in
// manifest.json's "js" array load as separate sequential <script> tags, and
// this file loads first — every other module (theme engine, layout
// enhancer, preferences bridge, etc.) registers itself with bootstrap as
// its own script runs, which happens after this one. Calling initModules()
// here would run it against an empty module list. Instead, the last script
// in that list (preferences-bridge.js) triggers startup once every module
// has had a chance to register.

// Export for use by other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = bootstrap;
}
