// tests/features/theme-engine.test.js
const themeEngine = require('../../src/features/theme-engine');

describe('ThemeEngine', () => {
    beforeEach(() => {
        // Reset singleton for each test
        themeEngine.currentTheme = {};
        // Reset root element attributes and styles
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.style.removeProperty('--accent-color');
        document.documentElement.style.removeProperty('--font-size');
        jest.clearAllMocks();
    });

    test('should initialize with empty theme', () => {
        expect(themeEngine.getCurrentTheme()).toEqual({});
    });

    test('should apply theme attributes to root element', () => {
        const preferences = {
            theme: 'dark',
            accentColor: '#0066cc',
            fontSize: '16px'
        };
        
        themeEngine.applyTheme(preferences);
        
        const root = document.documentElement;
        expect(root.getAttribute('data-theme')).toBe('dark');
        expect(root.style.getPropertyValue('--accent-color')).toBe('#0066cc');
        expect(root.style.getPropertyValue('--font-size')).toBe('16px');
        expect(themeEngine.getCurrentTheme()).toEqual(preferences);
    });

    test('should clear previous theme when applying new one', () => {
        // Apply first theme
        themeEngine.applyTheme({ theme: 'light', accentColor: '#ff0000' });
        
        // Verify first theme applied
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        expect(document.documentElement.style.getPropertyValue('--accent-color')).toBe('#ff0000');
        
        // Apply second theme
        themeEngine.applyTheme({ theme: 'dark', fontSize: '14px' });
        
        // Verify first theme cleared, second applied
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(document.documentElement.style.getPropertyValue('--accent-color')).toBe(''); // cleared
        expect(document.documentElement.style.getPropertyValue('--font-size')).toBe('14px');
    });

    test('should get current theme', () => {
        const preferences = { theme: 'dark', accentColor: '#0066cc' };
        themeEngine.applyTheme(preferences);
        
        const current = themeEngine.getCurrentTheme();
        expect(current).toEqual(preferences);
        
        // Ensure it's a copy, not reference
        current.theme = 'modified';
        expect(themeEngine.getCurrentTheme().theme).toBe('dark');
    });

    test('should reset theme to empty', () => {
        themeEngine.applyTheme({ theme: 'dark', accentColor: '#0066cc' });
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        
        themeEngine.resetTheme();
        expect(document.documentElement.getAttribute('data-theme')).toBeNull();
        expect(document.documentElement.style.getPropertyValue('--accent-color')).toBe('');
        expect(themeEngine.getCurrentTheme()).toEqual({});
    });

    test('should respect enabled flag', () => {
        themeEngine.setEnabled(false);
        const preferences = { theme: 'dark' };
        themeEngine.applyTheme(preferences);
        
        // Should not apply when disabled
        expect(document.documentElement.getAttribute('data-theme')).toBeNull();
        expect(themeEngine.getCurrentTheme()).toEqual({}); // still empty
        
        // Re-enable and test
        themeEngine.setEnabled(true);
        themeEngine.applyTheme(preferences);
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
});
