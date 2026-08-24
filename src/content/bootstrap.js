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
    
    // NOTE: there used to be a detectNavigation() here that ran a second
    // full-subtree MutationObserver over document.body purely to watch for
    // location.href changes, and called initModules() when it saw one.
    // It was removed (2026-08-23) because it could never do anything:
    // initModules() early-returns on `this.initialized`, which is always
    // true by the time any navigation happens. So it paid the cost of a
    // callback on every DOM mutation in a very chatty SPA, forever, in
    // exchange for a guaranteed no-op.
    //
    // Navigation handling now lives in preferences-bridge.js, which
    // compares location.href inside the ObserverCoordinator callback that
    // was already running — no second observer, and it re-applies the
    // things Messenger actually clobbers on route change (tab title,
    // favicon) rather than attempting a full module re-init, which would
    // double-register listeners.
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
