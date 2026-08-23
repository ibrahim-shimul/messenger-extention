// src/content/selector-adapter.js
//
// Messenger's own CSS class names are build-hashed and change often, so
// each target here is a *chain* of candidate selectors, ordered from most
// to least specific, favoring stable attributes (role, aria-label) over
// classes. getElement() walks the chain and returns the first match.
//
// These candidates are best-effort based on known Messenger/Facebook ARIA
// patterns and have not been verified against the live DOM in this
// environment. Treat "Verified" false entries as needing a quick check
// against the real site and updating here if a chain never matches.
class SelectorAdapter {
    constructor() {
        this.version = '1.0';
        this.selectors = {
            // The main conversation pane (message list + compose box).
            main: [
                'div[role="main"]'
            ],
            // The left-hand list of conversations. Verified 2026-08-23:
            // Messenger renders this list with an INCONSISTENT DOM shape
            // across page loads of the same account — sometimes a plain
            // <ul>/<li> tree under the left nav landmark, other times a
            // role="grid"/role="row" structure with no <li> or nav
            // ancestor at all (same account, just a reload apart). The
            // aria-label candidates were never real; the nav-landmark
            // candidate only catches the <ul> variant. The one anchor
            // that held in both cases: there is always exactly one
            // role="grid" that is NOT nested inside div[role="main"] (the
            // main pane has its own role="grid" for the message log,
            // hence the :not() exclusion) — locale-independent since it
            // relies on ARIA role, not label text.
            conversationList: [
                'div[role="grid"]:not([role="main"] *)',
                'div[role="navigation"][aria-label="Facebook"] ul',
                'ul[aria-label="Chats"]',
                'div[aria-label="Chats"]',
                'div[aria-label="Chat list"]'
            ],
            // A single row in the conversation list.
            conversationListItem: [
                'div[role="grid"]:not([role="main"] *) [role="row"]',
                'div[role="navigation"][aria-label="Facebook"] ul > li',
                'ul[aria-label="Chats"] > li',
                'div[aria-label="Chats"] [role="row"]'
            ],
            // The scrollable region containing message bubbles.
            messageList: [
                'div[role="main"] div[role="grid"]',
                'div[role="main"] [role="log"]'
            ],
            // The message compose textbox.
            composeBox: [
                'div[aria-label="Message"][contenteditable="true"]',
                '[role="textbox"][contenteditable="true"]'
            ],
            // The conversation title/header area.
            // KNOWN GAP (verified 2026-08-23): neither candidate actually
            // matches the visible per-conversation header (name + call/
            // info icons). There's no h1/heading role in the live DOM,
            // and the page's one div[role="banner"] is an unrelated,
            // empty (0-height) global landmark, not this header. The
            // header's real wrapper has no ARIA role or aria-label at
            // all in its ancestor chain — only Facebook's hashed CSS
            // classes, which this project's selector standard avoids
            // relying on. Left unresolved rather than adding a fragile
            // class-based selector; chatgpt-style.css's header rule is a
            // no-op against the real DOM until this is revisited.
            conversationHeader: [
                'div[role="main"] h1',
                'div[role="banner"]'
            ]
        };
        console.log('[MW SelectorAdapter] Initialized');
    }

    // Returns the full ordered candidate list for a target name.
    getSelectorChain(name) {
        return this.selectors[name] || [];
    }

    // Returns the first (most specific) candidate, for callers that only
    // want a single selector string rather than an element lookup.
    getSelector(name) {
        const chain = this.getSelectorChain(name);
        return chain.length > 0 ? chain[0] : null;
    }

    // Walks the candidate chain and returns the first matching element,
    // or null if the target isn't defined or none of the candidates match.
    getElement(name) {
        const chain = this.getSelectorChain(name);
        for (const selector of chain) {
            try {
                const element = document.querySelector(selector);
                if (element) return element;
            } catch (error) {
                console.warn('[MW SelectorAdapter] Error querying selector:', selector, error);
            }
        }
        return null;
    }

    // Same as getElement, but returns all matches for the first candidate
    // in the chain that yields at least one result.
    getElements(name) {
        const chain = this.getSelectorChain(name);
        for (const selector of chain) {
            try {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) return Array.from(elements);
            } catch (error) {
                console.warn('[MW SelectorAdapter] Error querying selector:', selector, error);
            }
        }
        return [];
    }
}

// Create singleton instance
const selectorAdapter = new SelectorAdapter();

// Register with bootstrap
if (typeof bootstrap !== 'undefined') {
    bootstrap.registerModule(selectorAdapter);
}

// Export for use by other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = selectorAdapter;
}
