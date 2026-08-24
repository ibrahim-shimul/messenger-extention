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
        this.enabled = true;
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

    // Master on/off switch for the "enabled" popup toggle. Unlike the
    // other per-feature toggles, this has to actually UNDO everything
    // this module has done, not just stop doing it going forward —
    // otherwise "disable" would only freeze the current look instead of
    // reverting to stock Messenger. Covers everything this class touches
    // that ISN'T already gated behind data-theme (which ThemeEngine.
    // setEnabled() clears, taking most of chatgpt-style.css down with
    // it in one move — see preferences-bridge.js): the density/
    // visibility classes on <html>, the header/composer button hides
    // (plain style.display writes, not CSS-gated), and the custom
    // favicon. Title is deliberately left alone on disable — Messenger
    // overwrites it on its own schedule anyway (see applyCustomTitle's
    // own comment), so there's nothing reliable to restore it to.
    setEnabled(enabled) {
        this.enabled = enabled === true;

        if (!this.enabled) {
            this.validDensities.forEach(d => this.root.classList.remove(`mw-density-${d}`));
            this.root.classList.remove('mw-hide-chat-list', 'mw-hide-chat-field');
            this.showHeaderActionButtons();
            this.showComposerActionButtons();
            document.querySelectorAll('link[rel~="icon"]').forEach(link => link.remove());
            return;
        }

        this.applyDensity(this.currentDensity);
        this.applyVisibility(this.hideChatList, this.hideChatField);
        this.applyCustomFavicon();
        this.hideHeaderActionButtons();
        this.hideComposerActionButtons();
    }

    // Shared by all four hide/show*ActionButtons methods below: header
    // and composer buttons are the same shape (same-sized role="button"
    // elements with svg icons, no stable attribute distinguishing them
    // from each other) and can only be told apart by document order
    // relative to the message log — header buttons come BEFORE it,
    // composer buttons AFTER (a DOM-order test CSS selectors can't
    // express, hence doing this in JS at all). `positionMask` is a
    // Node.DOCUMENT_POSITION_* bit to match against, `display` is the
    // style.display value to write ('none' to hide, '' to restore).
    _setActionButtonsDisplay(positionMask, display) {
        const main = mwSelectorAdapter ? mwSelectorAdapter.getElement('main') : null;
        if (!main) return;

        const log = main.querySelector('[role="log"]') || main.querySelector('[role="grid"]');
        if (!log) return;

        main.querySelectorAll('[role="button"]').forEach(button => {
            if (log.contains(button)) return;
            if (button.compareDocumentPosition(log) & positionMask) {
                button.style.display = display;
            }
        });
    }

    // Hides the conversation header's call/video-call/info buttons.
    // Verified 2026-08-23: re-run on every debounced rerender (registered
    // by preferences-bridge.js) since Messenger replaces the header when
    // switching conversations.
    hideHeaderActionButtons() {
        if (!this.enabled) return;
        this._setActionButtonsDisplay(Node.DOCUMENT_POSITION_FOLLOWING, 'none');
    }

    // Restores header buttons hidden by hideHeaderActionButtons() — used
    // by setEnabled(false).
    showHeaderActionButtons() {
        this._setActionButtonsDisplay(Node.DOCUMENT_POSITION_FOLLOWING, '');
    }

    // Hides the composer's icon buttons (mic, attach, sticker, GIF,
    // emoji, send/like) so only the plain text input box is visible.
    // Deliberately does not touch the textbox itself (role="textbox",
    // not role="button") or anything inside the message log.
    hideComposerActionButtons() {
        if (!this.enabled) return;
        this._setActionButtonsDisplay(Node.DOCUMENT_POSITION_PRECEDING, 'none');
    }

    // Restores composer buttons hidden by hideComposerActionButtons() —
    // used by setEnabled(false).
    showComposerActionButtons() {
        this._setActionButtonsDisplay(Node.DOCUMENT_POSITION_PRECEDING, '');
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
        this.currentDensity = density;
        if (!this.enabled) return;

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
        if (!this.enabled) return;
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
