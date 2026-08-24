// src/content/observer-coordinator.js
class ObserverCoordinator {
    constructor() {
        this.callbacks = new Set();
        this.observer = null;
        this.debounceTimeout = null;
        this.debounceDelay = 300; // ms
        // Upper bound on how long a burst of mutations can keep pushing
        // the debounce back — see scheduleUpdate().
        this.maxWait = 1000; // ms
        this.pendingSince = null;
        console.log('[MW ObserverCoordinator] Initialized');
    }

    registerCallback(callback) {
        this.callbacks.add(callback);

        if (!this.observer) {
            this.initializeObserver();
        }
    }

    unregisterCallback(callback) {
        this.callbacks.delete(callback);

        if (this.callbacks.size === 0) {
            this.disconnect();
        }
    }

    initializeObserver() {
        this.observer = new MutationObserver((mutations) => {
            this.mutationCallback(mutations);
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });
    }

    // The observe() config below only subscribes to childList/attributes,
    // so in production every delivered mutation already qualifies. This
    // check is a deliberate guard for the case where someone later widens
    // that config (adding characterData, say) without revisiting the
    // callbacks — .some() rather than .filter() so a very large batch
    // doesn't allocate a throwaway array just to ask "any?".
    mutationCallback(mutations) {
        const hasRelevantMutation = mutations.some(mutation =>
            mutation.type === 'childList' || mutation.type === 'attributes'
        );

        if (hasRelevantMutation) {
            this.scheduleUpdate();
        }
    }

    // Trailing debounce with a hard ceiling. A plain trailing debounce
    // starves under sustained mutation: Messenger animates and rewrites
    // class/style continuously, so if a mutation lands every <300ms the
    // timer resets forever and the callbacks never run — exactly when
    // reapplication matters most. maxWait guarantees they fire at least
    // once per second during a sustained burst.
    scheduleUpdate() {
        const now = Date.now();
        if (this.pendingSince === null) {
            this.pendingSince = now;
        }

        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }

        const elapsed = now - this.pendingSince;
        const wait = Math.max(0, Math.min(this.debounceDelay, this.maxWait - elapsed));

        this.debounceTimeout = setTimeout(() => this.applyUpdates(), wait);
    }

    applyUpdates() {
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
            this.debounceTimeout = null;
        }
        this.pendingSince = null;

        this.callbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.warn('[MW ObserverCoordinator] Error in callback:', error);
            }
        });
    }

    disconnect() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
            this.debounceTimeout = null;
        }

        this.pendingSince = null;
    }
}

// Create singleton instance
const observerCoordinator = new ObserverCoordinator();

// Export for use by other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = observerCoordinator;
}
