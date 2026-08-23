// tests/content/selector-adapter.test.js
const selectorAdapter = require('../../src/content/selector-adapter');

describe('SelectorAdapter', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    test('should return null for an unknown target', () => {
        expect(selectorAdapter.getElement('bogus-target')).toBeNull();
        expect(selectorAdapter.getSelector('bogus-target')).toBeNull();
    });

    test('should return the first candidate as the primary selector', () => {
        const chain = selectorAdapter.getSelectorChain('main');
        expect(chain.length).toBeGreaterThan(0);
        expect(selectorAdapter.getSelector('main')).toBe(chain[0]);
    });

    test('should match using the first candidate when present', () => {
        document.body.innerHTML = '<div role="main">content</div>';
        const el = selectorAdapter.getElement('main');
        expect(el).not.toBeNull();
        expect(el.getAttribute('role')).toBe('main');
    });

    test('should fall back to a later candidate when earlier ones do not match', () => {
        document.body.innerHTML = '<div aria-label="Chat list">list</div>';
        const el = selectorAdapter.getElement('conversationList');
        expect(el).not.toBeNull();
        expect(el.getAttribute('aria-label')).toBe('Chat list');
    });

    test('should return null when no candidate in the chain matches', () => {
        document.body.innerHTML = '<div class="unrelated"></div>';
        expect(selectorAdapter.getElement('composeBox')).toBeNull();
    });

    test('should return all matches for getElements using the first matching candidate', () => {
        document.body.innerHTML = `
            <ul aria-label="Chats">
                <li>One</li>
                <li>Two</li>
            </ul>
        `;
        const items = selectorAdapter.getElements('conversationListItem');
        expect(items.length).toBe(2);
    });

    test('should return an empty array from getElements when nothing matches', () => {
        expect(selectorAdapter.getElements('conversationListItem')).toEqual([]);
    });

    test('should not throw on an invalid selector and continue the chain', () => {
        selectorAdapter.selectors.broken = ['div[role=', 'div[role="main"]'];
        document.body.innerHTML = '<div role="main"></div>';

        expect(() => selectorAdapter.getElement('broken')).not.toThrow();
        expect(selectorAdapter.getElement('broken')).not.toBeNull();

        delete selectorAdapter.selectors.broken;
    });
});
