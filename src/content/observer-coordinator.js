// src/content/observer-coordinator.js
class ObserverCoordinator {
    constructor() {
        this.callbacks = new Set();
        this.observer = null;
        this.debounceTimeout = null;
        this.debounceDelay = 300; // ms
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

    mutationCallback(mutations) {
        const relevantMutations = mutations.filter(mutation =>
            mutation.type === 'childList' || mutation.type === 'attributes'
        );

        if (relevantMutations.length > 0) {
            this.scheduleUpdate();
        }
    }

    scheduleUpdate() {
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }

        this.debounceTimeout = setTimeout(() => {
            this.applyUpdates();
            this.debounceTimeout = null;
        }, this.debounceDelay);
    }

    applyUpdates() {
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
    }
}

// Create singleton instance
const observerCoordinator = new ObserverCoordinator();

// Export for use by other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = observerCoordinator;
}
