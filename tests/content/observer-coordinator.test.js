// tests/content/observer-coordinator.test.js
const observerCoordinator = require('../../src/content/observer-coordinator');

describe('ObserverCoordinator', () => {
    beforeEach(() => {
        observerCoordinator.disconnect();
        observerCoordinator.callbacks = new Set();
        jest.useFakeTimers();
        jest.clearAllMocks();
    });

    afterEach(() => {
        observerCoordinator.disconnect();
        jest.useRealTimers();
    });

    test('should register callbacks and start observer', () => {
        const callback = jest.fn();
        observerCoordinator.registerCallback(callback);

        expect(observerCoordinator.callbacks.has(callback)).toBe(true);
        expect(observerCoordinator.observer).not.toBeNull();
    });

    test('should debounce rapid mutation notifications', () => {
        const callback = jest.fn();
        observerCoordinator.registerCallback(callback);

        for (let i = 0; i < 10; i++) {
            observerCoordinator.mutationCallback([{ type: 'childList' }]);
        }

        jest.advanceTimersByTime(observerCoordinator.debounceDelay);

        expect(callback).toHaveBeenCalledTimes(1);
    });

    test('should ignore irrelevant mutation types', () => {
        const callback = jest.fn();
        observerCoordinator.registerCallback(callback);

        observerCoordinator.mutationCallback([{ type: 'characterData' }]);
        jest.advanceTimersByTime(observerCoordinator.debounceDelay);

        expect(callback).not.toHaveBeenCalled();
    });

    test('should disconnect observer when last callback unregistered', () => {
        const callback = jest.fn();
        observerCoordinator.registerCallback(callback);
        observerCoordinator.unregisterCallback(callback);

        expect(observerCoordinator.callbacks.size).toBe(0);
        expect(observerCoordinator.observer).toBeNull();
    });

    test('should not throw when a callback errors', () => {
        const badCallback = jest.fn(() => { throw new Error('boom'); });
        observerCoordinator.registerCallback(badCallback);

        expect(() => observerCoordinator.applyUpdates()).not.toThrow();
        expect(badCallback).toHaveBeenCalled();
    });
});
