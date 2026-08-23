// src/features/layout-enhancer.js

// See preferences-bridge.js for why this dual lookup exists: content
// scripts share a global scope in the browser, but each file is its own
// module under CommonJS (tests, bundlers).
let mwSelectorAdapter = typeof selectorAdapter !== 'undefined' ? selectorAdapter : null;
if (typeof module !== 'undefined' && module.exports) {
    mwSelectorAdapter = mwSelectorAdapter || require('../content/selector-adapter');
}

class LayoutEnhancer {
    constructor() {
        this.validDensities = ['compact', 'cozy', 'spacious'];
        this.currentDensity = 'cozy';
        this.hideChatList = false;
        this.hideChatField = false;
        this.root = document.documentElement;
        console.log('[MW LayoutEnhancer] Initialized');
    }

    init() {
        this.applyDensity(this.currentDensity);
        this.applyCustomFavicon();
        this.applyCustomTitle();
        this.hideHeaderActionButtons();
        this.hideComposerActionButtons();

        // On first load, Messenger's React app may not have mounted
        // div[role="main"] yet at the moment content scripts run
        // (document_idle fires once, independent of the SPA's own render
        // timing) — hideHeaderActionButtons() silently no-ops if main/log
        // aren't there yet. The mutation-triggered reapply in
        // preferences-bridge.js covers later rerenders (switching
        // conversations, etc.), but there's no guarantee a qualifying
        // mutation fires between "script loaded" and "app finished
        // mounting" on first load. A few bounded retries close that gap
        // without polling indefinitely.
        [500, 1500, 3000].forEach(delay => {
            setTimeout(() => {
                this.hideHeaderActionButtons();
                this.hideComposerActionButtons();
            }, delay);
        });
    }

    // Hides the composer's icon buttons (mic, attach, sticker, GIF,
    // emoji, send/like) so only the plain text input box is visible.
    // Verified 2026-08-23: the mirror image of hideHeaderActionButtons()
    // above — same reasoning (no stable attribute distinguishes these
    // from the header's buttons, both are same-sized role="button" with
    // svg icons and no text), but composer buttons appear AFTER the
    // message log in document order rather than before. Deliberately
    // does not touch the textbox itself (role="textbox", not
    // role="button") or anything inside the message log.
    hideComposerActionButtons() {
        const main = mwSelectorAdapter ? mwSelectorAdapter.getElement('main') : null;
        if (!main) return;

        const log = main.querySelector('[role="log"]') || main.querySelector('[role="grid"]');
        if (!log) return;

        main.querySelectorAll('[role="button"]').forEach(button => {
            if (log.contains(button)) return;
            const position = button.compareDocumentPosition(log);
            if (position & Node.DOCUMENT_POSITION_PRECEDING) {
                button.style.display = 'none';
            }
        });
    }

    // Hides the conversation header's call/video-call/info buttons.
    // Verified 2026-08-23: unlike every other avatar/icon hidden in this
    // project so far, these can't be targeted by CSS alone — they're
    // same-sized role="button" elements with no distinguishing role or
    // stable attribute, structurally identical to the composer's own
    // buttons (mic, attach, sticker, etc.), which must stay untouched.
    // The one thing that does reliably separate them: header buttons
    // appear BEFORE the message log in document order, composer buttons
    // after — a DOM-order test CSS selectors can't express, so this is
    // JS-only. Re-run on every debounced rerender (registered by
    // preferences-bridge.js) since Messenger replaces the header when
    // switching conversations.
    hideHeaderActionButtons() {
        const main = mwSelectorAdapter ? mwSelectorAdapter.getElement('main') : null;
        if (!main) return;

        const log = main.querySelector('[role="log"]') || main.querySelector('[role="grid"]');
        if (!log) return;

        main.querySelectorAll('[role="button"]').forEach(button => {
            if (log.contains(button)) return;
            const position = button.compareDocumentPosition(log);
            if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
                button.style.display = 'none';
            }
        });
    }

    // Replaces the browser-tab favicon with a small Notion-style ("N" on
    // a white rounded square) icon, inlined as an SVG data: URI — not
    // Notion's actual trademarked logo, and not fetched from any network
    // request, per this project's no-external-requests rule. Removes
    // Messenger's own <link rel="icon"> tags first so only ours applies.
    applyCustomFavicon() {
        document.querySelectorAll('link[rel~="icon"]').forEach(link => link.remove());

        const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
            + '<rect x="1" y="1" width="30" height="30" rx="6" fill="#ffffff" stroke="#000000" stroke-width="2"/>'
            + '<text x="16" y="23" font-family="Georgia, serif" font-size="20" font-weight="700" '
            + 'text-anchor="middle" fill="#000000">N</text>'
            + '</svg>';

        const link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/svg+xml';
        link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
        document.head.appendChild(link);
    }

    // Sets a fixed, uncommon tab title in place of Messenger's own
    // (which normally shows an unread-count prefix, e.g. "(3) Messenger |
    // Facebook"). Requested as a cosmetic flourish, not a functional
    // change — the tradeoff is losing that unread-count-in-tab signal.
    //
    // A MutationObserver-based "always reset it" approach was tried and
    // reverted (2026-08-23): Messenger rewrites document.title itself on
    // its own schedule (unread counts, route changes), and fighting it on
    // every mutation created a runaway loop that froze the tab. A one-time
    // set is safe; Messenger will eventually overwrite it again on its own
    // next title update, which is an acceptable tradeoff for not hanging
    // the page.
    applyCustomTitle() {
        document.title = '[object Messenger]';
    }

    applyDensity(density) {
        if (!this.validDensities.includes(density)) {
            console.warn('[MW LayoutEnhancer] Invalid density:', density, '- using cozy');
            density = 'cozy';
        }

        this.validDensities.forEach(d => {
            this.root.classList.remove(`mw-density-${d}`);
        });
        this.root.classList.add(`mw-density-${density}`);

        // Also tag the actual Messenger main pane, when found, so styles
        // can be scoped to just the conversation area rather than <html>.
        const main = mwSelectorAdapter ? mwSelectorAdapter.getElement('main') : null;
        if (main) {
            main.setAttribute('data-mw-density', density);
        }

        this.currentDensity = density;
    }

    getCurrentDensity() {
        return this.currentDensity;
    }

    // Toggles visibility of the sidebar conversation list and/or the
    // main message pane, per the "hide chat list" / "hide chat field"
    // popup options. Implemented as classes on <html> (mirroring the
    // density classes above) with the actual hiding done in CSS
    // (chatgpt-style.css) via the same conversationList/main selectors
    // used throughout this project — keeps this method simple and
    // consistent with how density/theme are applied.
    applyVisibility(hideChatList, hideChatField) {
        this.hideChatList = hideChatList === true;
        this.hideChatField = hideChatField === true;
        this.root.classList.toggle('mw-hide-chat-list', this.hideChatList);
        this.root.classList.toggle('mw-hide-chat-field', this.hideChatField);
    }

    applyLayout(layoutOptions) {
        Object.entries(layoutOptions || {}).forEach(([property, value]) => {
            this.root.style.setProperty(`--mw-layout-${property}`, String(value));
        });
    }
}

// Create singleton instance
const layoutEnhancer = new LayoutEnhancer();

// Register with bootstrap
if (typeof bootstrap !== 'undefined') {
    bootstrap.registerModule(layoutEnhancer);
}

// Export for use by other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = layoutEnhancer;
}
