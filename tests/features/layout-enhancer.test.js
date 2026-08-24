// tests/features/layout-enhancer.test.js
const layoutEnhancer = require('../../src/features/layout-enhancer');

describe('LayoutEnhancer', () => {
    beforeEach(() => {
        document.documentElement.className = '';
        document.documentElement.removeAttribute('style');
        layoutEnhancer.currentDensity = 'cozy';
        jest.clearAllMocks();
    });

    test('should default to cozy density', () => {
        expect(layoutEnhancer.getCurrentDensity()).toBe('cozy');
    });

    test('should apply density class to root element', () => {
        layoutEnhancer.applyDensity('compact');

        expect(document.documentElement.classList.contains('mw-density-compact')).toBe(true);
        expect(document.documentElement.classList.contains('mw-density-cozy')).toBe(false);
        expect(layoutEnhancer.getCurrentDensity()).toBe('compact');
    });

    test('should remove previous density class when applying new one', () => {
        layoutEnhancer.applyDensity('compact');
        layoutEnhancer.applyDensity('spacious');

        expect(document.documentElement.classList.contains('mw-density-compact')).toBe(false);
        expect(document.documentElement.classList.contains('mw-density-spacious')).toBe(true);
    });

    test('should fall back to cozy for invalid density', () => {
        layoutEnhancer.applyDensity('bogus');

        expect(layoutEnhancer.getCurrentDensity()).toBe('cozy');
        expect(document.documentElement.classList.contains('mw-density-cozy')).toBe(true);
    });

    test('should apply layout options as CSS variables', () => {
        layoutEnhancer.applyLayout({ width: '800px' });

        expect(document.documentElement.style.getPropertyValue('--mw-layout-width')).toBe('800px');
    });

    test('should tag the Messenger main pane with the current density when found', () => {
        document.body.innerHTML = '<div role="main"></div>';

        layoutEnhancer.applyDensity('spacious');

        expect(document.querySelector('[role="main"]').getAttribute('data-mw-density')).toBe('spacious');
    });

    test('should not throw when no main pane is present', () => {
        document.body.innerHTML = '';

        expect(() => layoutEnhancer.applyDensity('compact')).not.toThrow();
    });

    describe('setActionButtonsHidden', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div role="main">
                    <div role="button" aria-label="Start a voice call"></div>
                    <div role="button" aria-label="Go back"></div>
                    <div role="log">
                        <div role="button" aria-label="Send a like"></div>
                    </div>
                </div>
            `;
        });

        test('hides header/composer buttons but not a "back" button or log content', () => {
            layoutEnhancer.setActionButtonsHidden(true);

            expect(document.querySelector('[aria-label="Start a voice call"]').style.display).toBe('none');
            expect(document.querySelector('[aria-label="Go back"]').style.display).toBe('');
            expect(document.querySelector('[aria-label="Send a like"]').style.display).toBe('');
        });

        test('restores buttons when un-hidden, back button was never touched', () => {
            layoutEnhancer.setActionButtonsHidden(true);
            layoutEnhancer.setActionButtonsHidden(false);

            expect(document.querySelector('[aria-label="Start a voice call"]').style.display).toBe('');
            expect(document.querySelector('[aria-label="Go back"]').style.display).toBe('');
        });
    });
});
