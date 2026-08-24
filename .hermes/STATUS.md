# Messenger Workspace — Status Tracker

> Read this first. It's the single source of truth for where the project
> stands and what's next. Update it whenever you finish or change scope on
> something — future sessions (Claude Code or otherwise) rely on it instead
> of re-deriving state from scratch.

Last updated: 2026-08-23

## What this project is

A Manifest V3 Chrome/Edge/Brave extension that restyles Facebook Messenger's
UI locally in the browser (theme, density, layout) to feel like Notion/
ChatGPT instead of default Messenger. Presentation-only by design: no
messaging automation, no scraping, no network calls beyond `chrome.storage`.
See `.hermes/plans/2026-08-23_122500-messenger-workspace-plan.md` for the
full spec and safety boundaries, and
`.hermes/plans/2026-08-23_123000-messenger-workspace-features.md` for the
original TDD feature plan (mostly implemented — see below).

**Design target (confirmed 2026-08-23, revised same day):** flat
ChatGPT/Notion-style surfaces, no panel borders, centered ~768px message
column — plus, per a later revision same day: no theme picker (fixed flat
light palette only, not user-selectable), a monospace/code-styled font
across the whole Messenger UI, no avatar images in the sidebar, and a
text-only monospace settings popup (no color swatches/theme radios).

## 2026-08-23 (later) — text-first / no-avatars revision

After the initial live-testing pass below, the design goal changed: drop
the theme picker entirely (fixed light palette, no UI to change it), make
Messenger's own text monospace/code-styled, hide sidebar avatar images,
and rebuild the popup as a plain monospace key/value settings panel.

**Implemented and verified live:**
- `theme-tokens.css`'s `--mw-font-family` switched to a monospace stack;
  `chatgpt-style.css` applies it via `div[role="main"] *` and the sidebar
  grid `*` (a single rule on `<html>` doesn't cascade — Messenger sets
  font-family explicitly per element, which always beats an inherited
  value regardless of `!important` on an ancestor).
- Popup (`popup.html`/`.js`/`.css`) rebuilt: theme radios and the accent
  color picker removed from the UI (still hardcoded internally so
  `applyPreferences()` has a value), monospace VS-Code-dark-style
  key/value layout for density/font_size/timestamps/focus_mode.
- Sidebar avatars hidden. This took three iterations because Messenger's
  actual avatar markup varies both in *what* renders it (inline `<svg>`
  one page load, plain `<img>` another) and *how the list container
  itself is structured* (`<ul>/<li>` one load, `role="grid"`/`role="row"`
  with no `<li>` or nav ancestor another load — same account, just a
  reload apart). Final selector uses `data-visualcompletion=
  "ignore-dynamic"` (Facebook's own lazy-load marker, which also catches
  the img/svg without needing to know which one it is) scoped under
  `div[role="grid"]:not([role="main"] *)` (see conversationList below).
  Hiding just the image left an empty circular placeholder behind — the
  marker's wrapper element needed hiding too, not just the image/svg
  inside it.

**Follow-up (same day): avatars inside `role="main"` and the top bar —
done too.** The gap above got closed in a later pass. Three more avatar
locations, each verified live and each a distinct structural pattern:
- Per-message sender avatar (next to each bubble): a small `<img>`
  (`alt` = sender's name) wrapped in a clickable `div[role="button"]`
  that opens their profile — targeted via
  `[role="log"] div[role="button"] > img`. This shape is specific to
  avatars; real sent photos/attachments aren't small profile-picture
  buttons, so this doesn't touch them.
- Conversation header avatar + the large placeholder avatar shown on an
  empty/new conversation: both are the only `<img>` elements inside
  `div[role="main"]` that sit *outside* `[role="log"]` — so
  `div[role="main"] img:not([role="log"] *)` catches exactly those two
  and nothing inside the message log (where real content lives).
- Facebook's own global top-bar account avatar (outside Messenger's UI
  entirely, top-right of the whole page): an inline `<image>` inside
  `svg[role="img"]`, inside an account-control nav landmark whose
  aria-label is locale text. Matched by contrast with the one nav
  landmark already relied on elsewhere (`aria-label="Facebook"`, the
  conversation list) rather than matching that locale label directly:
  `div[role="navigation"]:not([aria-label="Facebook"]) svg[role="img"]
  image`.

All four avatar-hiding rules together leave real message content (sent
photos/attachments) fully untouched — confirmed nothing inside
`[role="log"]` is affected except the specific `div[role="button"] > img`
sender-avatar shape.

## 2026-08-23 (later still) — more text-only chrome removal, favicon/title, a frozen-tab bug

Continued the text-first pass. All verified live; all 49 tests pass
throughout.

- **Corrected a wrong earlier conclusion:** `div[role="banner"]` is NOT an
  empty/unrelated element as the original selector-adapter comments
  claimed — it's Facebook's real, visible global top bar (search, apps
  grid, notifications, account avatar). That wrong conclusion came from
  checking it during a different DOM state (see the DOM-instability
  section below). Now hidden entirely (`display: none`) per request —
  the text-first goal extended to Facebook's own site chrome, not just
  Messenger's.
- **Sidebar header block** (the "Chats" title, search box, and
  All/Unread/Groups/Community tabs) hidden. No stable role/aria-label of
  its own (locale text only) — targeted structurally instead, as the
  non-tabpanel siblings of the one `[role="tabpanel"]` on the page:
  `div:has(> [role="tabpanel"]) > *:not([role="tabpanel"])`. Trade-off
  accepted knowingly: this also removes the ability to search
  conversations from the sidebar.
- **Conversation header's call/video-call/info buttons** hidden. First
  case this session that pure CSS genuinely couldn't do — no stable
  attribute distinguishes them from the composer's own buttons (mic,
  attach, sticker, etc.), which are structurally identical (same-sized
  `role="button"`, no distinguishing role). Solved in JS instead
  (`LayoutEnhancer.hideHeaderActionButtons()` in `layout-enhancer.js`):
  header buttons reliably appear *before* the message log in document
  order, composer buttons after — a DOM-order test CSS can't express.
  Wired into the same mutation-triggered reapply preferences-bridge.js
  already uses for density, plus a few bounded startup retries (500ms/
  1500ms/3000ms) to cover the gap before Messenger's SPA finishes
  mounting `role="main"` on first load.
- **Browser tab favicon**: replaced with an inline SVG data URI (white
  square, black "N", Notion-inspired but not a reproduction of Notion's
  actual trademarked logo) — not fetched over the network, consistent
  with the project's no-external-requests rule. `LayoutEnhancer.
  applyCustomFavicon()`.
- **Browser tab title**: set once to `[object Messenger]` (a requested
  cosmetic flourish). `LayoutEnhancer.applyCustomTitle()`.

**Bug caused and fixed the same session — worth remembering:** the first
attempt at the tab title used a `MutationObserver` on `<title>` to keep
re-asserting the custom value against Messenger's own title updates
(unread counts, route changes). This created a runaway mutation loop
between our observer and Messenger's own title-writing logic and froze
the tab (`Page.captureScreenshot` timed out, tab had to be closed and a
fresh one opened to recover). Reverted to a one-time `document.title =`
set with no observer — Messenger will eventually overwrite it again on
its own next update, which is an acceptable trade-off for not hanging
the page. **Lesson for future work in this file:** don't add a
MutationObserver that reacts to and rewrites the same property/attribute
it's watching without being very sure nothing else on the page reacts to
that same change — the ping-pong risk is real, not hypothetical, and it
manifests as an unrecoverable frozen tab, not a caught JS error.

## 2026-08-23 (final round) — Notion palette, flat message text, visibility toggles

- **Palette switched from ChatGPT-style to Notion-style**: warmer
  off-white surfaces (`--mw-bg-sidebar: #fbfbfa`), soft near-black text
  (`--mw-text: #37352f`, Notion's own value rather than pure black),
  muted blue accent (`--accent-color: #2383e2`, updated in all three
  places it was hardcoded: `theme-tokens.css`, `popup.js` DEFAULTS,
  `storage-service.js` defaults — plus the now-orphaned
  `settings-ui.js` for consistency). `theme-tokens.css` /
  `chatgpt-style.css`.
- **Composer stripped to just the text input**: mic/attach/sticker/GIF/
  emoji/send icons all hidden (`LayoutEnhancer.
  hideComposerActionButtons()`, the mirror image of
  hideHeaderActionButtons() — same DOM-order technique, opposite
  direction), and the input box itself has `border: none` (border-color
  alone doesn't work here — Messenger gives it a real border width, not
  the `--mw-border` used elsewhere). You can still send with Enter —
  there's no clickable send button anymore.
- **Message bubbles flattened to plain text** (a "note-taking app" look
  rather than chat bubbles): bubble wrappers have no stable attribute of
  their own beyond `role="presentation"`, used for ~340 other unrelated
  wrapper divs in the log too — solved with a deliberately blunt but safe
  blanket rule stripping background/border-radius from every
  `role="presentation"` in the log, since the ~320 non-bubble matches
  already compute transparent/white with no radius (no visual side
  effect) and the log's own background is already forced white anyway.
- **All remaining "stroke" artifacts removed**: the sidebar/main divider,
  the header avatar's ring, and the header's bottom divider line all
  turned out to be `box-shadow` (inset rings, soft blurs), not `border`
  — a `border-color`/`border-right` reset was invisible against them.
  Fixed with `box-shadow: none` scoped to the header chrome (outside
  `[role="log"]`) and on the sidebar grid.
- **Conversation "created" header card's name hidden**: an `<h3>`, the
  only genuinely visible one of 4 `<h3>` elements outside the log — the
  other 3 are already screen-reader-only (`clip-path: inset(50%)`) labels
  for the encryption notice/composer, so hiding all 4 has no additional
  visual effect.
- **New popup options: `hide_chat_list` and `hide_chat_field`** —
  independent toggles (not combined) that hide the sidebar conversation
  list and/or the main message pane entirely. Implemented as classes on
  `<html>` (`LayoutEnhancer.applyVisibility()`, mirroring how density
  classes work) with the actual hiding in CSS, reusing the same
  conversationList/main selectors as everywhere else in this file. Wired
  into `preferences-bridge.js`'s `applyPreferences()`; unlike the
  header/composer button hides, this doesn't need mutation-triggered
  reapplication since it's a class on `<html>`, not on Messenger's own
  elements that get replaced on rerender.

Also answered for the record: **no, the browser address bar URL cannot
be changed/spoofed by an extension** — this is a deliberate browser
security boundary (the core anti-phishing defense), not a limitation of
this project. `history.pushState()` can change the path within
facebook.com itself, but never the displayed origin or arbitrary text.
Not something to revisit; there's no technical workaround to build here.

## 2026-08-23 (yet later) — sticker/emoji visibility bug, master enable toggle, layout gap fix

- **Real bug found and fixed**: the placeholder-avatar rule's own
  documented risk ("if a future DOM shape renders real content without a
  `[role="row"]` wrapper, this could incorrectly hide it") materialized —
  sent stickers and emoji reactions (`<img alt="🌚">` etc.) aren't wrapped
  in `[role="row"]` either, so they were being hidden along with the
  placeholder. Fixed by requiring an `aria-hidden="true"` ancestor too —
  present on the placeholder/sender-avatar wrappers, absent on real
  stickers/reactions. Report this again if any other real content ever
  disappears; the underlying assumption (content is always in a
  `[role="row"]`) is still not something to fully trust given this
  project's documented DOM instability.
- Added a master `enabled` popup toggle and fixed a layout gap when
  hiding the chat list — see the two commits pushed to GitHub for full
  detail (search this file's git history / GitHub commit messages, which
  carry the same explanations as this file for that round).
- **Still open**: a right-side "conversation details" panel (Active now /
  End-to-end encrypted / Profile / Mute / Search) was reported showing
  duplicated info and needing to be hidden, but couldn't be reproduced
  live in-session — the info button that opens it is hidden by our own
  `hideHeaderActionButtons()`, and neither a programmatic `.click()` nor
  restoring its visibility and clicking again reliably reopened the
  panel (possibly needs a genuine trusted user gesture Messenger's own
  handlers distinguish). Needs the user to reproduce it and describe/
  screenshot the live DOM before a selector can be found.

## 2026-08-23 (later still) — mobile back button, scrollbar, more styling

- **Compose box reversed to outline-only, no fill** (`#3c3c3c` 1px
  border, transparent background) — earlier in this project the
  composer had been explicitly made borderless; this request reversed
  that specifically for the composer. `--mw-bg-composer` was dropped
  from `theme-tokens.css` since nothing references a composer fill
  colour any more.
- **Emoji/sticker opacity dimmed further: 0.3 -> 0.15.** Still the same
  known trade-off as before — no attribute distinguishes a sticker/
  reaction `<img>` from a real sent photo, so photos dim too. At 0.15 a
  shared photo is close to unviewable in place; `0.3` is noted in the
  CSS as the value to revert to if that becomes a problem.

**Mobile/narrow-viewport back button — found and fixed a real
regression, twice.** Hiding `div[role="banner"]` entirely (done earlier
this session for the "hide the whole top bar" request) turned out to
also hide the "Back to previous page" link Messenger uses to return from
a single-pane conversation view to the chat list once the viewport goes
narrow enough to switch layouts — invisible on desktop where both panes
show at once, but the only way back on mobile. Fixed in two passes:
1. First pass kept the back link's whole container child of the banner
   visible, which also kept the Facebook logo link visible (it turned
   out to be a *sibling* of the back button within that same container,
   not something outside it). Live-verified with a `querySelectorAll`
   count check before writing — the count was right, but I was checking
   the wrong ancestor level.
2. Second pass went one level deeper: hide banner's non-back child, AND
   within the child that has the back button, hide everything except
   the specific descendant that actually contains it. Both banner
   levels' child counts and paths were verified directly against the
   live DOM (`aria-label="Back to previous page"` selector; unavoidably
   English-only, same locale caveat as everywhere else ARIA text is
   relied on in this project).

Also added a JS-side defensive skip in `LayoutEnhancer.
setActionButtonsHidden()`: any `role="button"` inside `role="main"`
whose `aria-label` matches `/\bback\b/i` (case-insensitive English
substring) is now never hidden, in case a differently-shaped "back to
list" button ever renders inside `role="main"` itself rather than in
the banner (as one did in a Bengali-locale session earlier this
project, labeled "ফিরে যান" — that exact string won't match the English
regex, so this is a partial safety net, not a real fix for other
locales; flagged directly in the code comment). Covered by a test that
fails without the guard (verified by removing the guard and re-running).

**Scrollbar hidden**, in two steps (dim, then fully invisible on
follow-up). Turned out to be a genuine OS/Chrome-rendered overlay
scrollbar, not something Facebook draws itself — confirmed by repeated
failed attempts to find a matching DOM element (by geometry across the
whole document, by exact scroll-container id, by `elementFromPoint` at
its exact pixel position, which hit the scrollable content underneath
rather than a scrollbar element). That's also why the first two
narrower CSS attempts (scoped to `[role="main"]`, then to the specific
scroll container by id) had no visible effect — neither was actually
the element producing the visible bar, and there was no reliable way
found to identify which nested `overflow: auto` element that is. Fixed
by going global: `*` + `::-webkit-scrollbar` catches every scroller on
the page regardless of which one is real, confirmed live with a
screenshot before being written into `chatgpt-style.css`. Uses
`width: 0` rather than `overflow: hidden` on any container, so
scrolling itself (wheel/touch/keyboard) is unaffected — verified live
with an actual scroll action, not just a visual check.

**Not yet confirmed live**: the final "fully invisible" scrollbar
version and the two-pass back-button/FB-logo fix both need a genuine
full reload (extension reload + tab close/reopen) to verify — this
session hit the CSS-lags-behind-JS-after-reload caching pattern again
partway through (`data-theme` picks up fine, new CSS rules sometimes
don't on the same reload). Whoever picks this up next: re-check both
live before assuming they're done, the code is written but the last
visual confirmation didn't land before the session moved on.

## 2026-08-23 — code-health pass (2 real bugs fixed, dead weight removed)

Audit of the whole codebase after the feature work settled. Suite went
49 -> 58 tests, 9 -> 10 suites; `npm run lint` now passes clean for the
first time. Every fix below is covered by a test that fails against the
old code.

**Bug 1 — the master enable/disable toggle never actually disabled the
theme.** `ThemeEngine.setEnabled(false)` set `this.enabled = false` and
*then* routed the reset through `applyTheme({})`, which starts with
`if (!this.enabled) return`. So it cleared nothing: `data-theme` and
every custom property stayed on `<html>`, keeping essentially all of
`chatgpt-style.css` (scoped under `html[data-theme]`) live while the
extension reported itself off. Only the class-based bits and the button
hides actually reverted, which is why it looked *partly* right.
Fixed by splitting out `clearAppliedTheme()` — the undo path is
deliberately not gated on the same flag that gates the apply path.
Regression tests added at both levels: `theme-engine.test.js` (unit) and
`preferences-bridge.test.js` (the real toggle path, plus re-enable).
The pre-existing `should respect enabled flag` test missed this because
it only checked that `applyTheme` no-ops *while* disabled — never that
disabling clears what was already applied.

**Bug 2 — `bootstrap.detectNavigation()` was a permanent no-op that cost
CPU on every mutation.** It ran a second full-subtree MutationObserver
over `document.body` for the life of the page purely to spot
`location.href` changes, then called `initModules()` — which early-
returns on `this.initialized`, always true by then. Deleted. Navigation
handling moved into `preferences-bridge.js`, which now compares
`location.href` inside the ObserverCoordinator callback that was already
running: no second observer, and it re-applies the things Messenger
actually clobbers on route change (tab title, favicon). A full module
re-init was deliberately *not* used — `PreferencesBridge.init()`
registers listeners, so re-running it would double-register them.

**Debounce starvation.** `ObserverCoordinator`'s trailing debounce reset
its 300ms timer on every batch with no ceiling. Messenger rewrites
class/style continuously, so a mutation landing every <300ms would defer
the callbacks forever — precisely when reapplication matters most. Added
`maxWait` (1s). The new test fails against the old implementation
(verified by patching it back in, not just assumed).

**Other cleanups**
- `mutationCallback` used `.filter()` then checked `.length`; switched to
  `.some()`. Note it is *not* dead code, despite appearances — a test
  exercises it directly with a synthetic `characterData` mutation, and it
  guards against someone widening the `observe()` config later.
- The four `hide/show{Header,Composer}ActionButtons` methods collapsed to
  `hideActionButtons()`/`showActionButtons()`. The document-order test
  that distinguished the two clusters was dead weight once both became
  always-toggled-together — every `role="button"` in `role="main"` but
  outside the log belongs to one or the other. One `querySelectorAll`,
  no per-button `compareDocumentPosition`.
- `applyCustomFavicon()`/`applyCustomTitle()` gained `enabled` guards,
  needed now that navigation re-invokes them.
- Preference defaults were duplicated across `popup.js` and
  `storage-service.js`; the popup now loads `storage-service.js` (via
  `popup.html`) and uses it as the single source, for reads and writes
  both. This drift was not hypothetical — the accent-colour change
  earlier this session had to be made in three files.
- Removed the dead `storageService.addChangeListener` registration in
  `preferences-bridge.js`: it only fires for saves made through
  storageService *in the same JS context*, and the popup is a different
  context, so it could never see a popup save. `chrome.storage.onChanged`
  is the only path that crosses that boundary and it was already wired.
- Merged the two byte-identical `[data-theme="light"]`/`["dark"]` blocks.
- **`npm run lint` was broken** — the script existed but no ESLint config
  did, so it always failed with "couldn't find a configuration file".
  Added `.eslintrc.js`; src and tests both lint clean.
- New `tests/settings/popup.test.js` (5 tests) — the popup had zero
  coverage and can't be driven by browser automation (Chrome blocks
  scripting `chrome-extension://` pages), so these load `popup.html`'s
  real markup and reproduce its real script order in a `vm` context.

**Deliberately left alone**
- `diagnostics.js` is still dead code (injected on every page, called by
  nothing) and its level handling is odd — `info`/`warn`/`error` are
  identical, and `logLevel` picks the console *method* for all messages
  rather than filtering by severity. Left as-is because
  `diagnostics.test.js` encodes that behaviour as intended; changing the
  semantics would mean rewriting tests to assert something different,
  which is churn rather than a fix. Wiring it up properly (and retiring
  the scattered `console.log` calls) is the real cleanup, and it should
  be its own change.
- `settings-ui.js` remains orphaned and still injected — flagged only,
  since a change removing it was explicitly declined earlier.

## `conversationList` selector: DOM shape is not stable across reloads

Discovered while chasing the avatar bug above, this is a bigger finding
than it first looked: reloading the *same* Messenger conversation on the
*same* account can render the sidebar list with a completely different
DOM shape — sometimes `<ul>` containing `<li>` rows under the left nav
landmark (`div[role="navigation"][aria-label="Facebook"]`), other times a
`div[role="grid"]` containing `div[role="row"]` rows with no `<li>` or
nav ancestor at all. Both `selector-adapter.js` and `chatgpt-style.css`
now carry both shapes as fallback candidates, with
`div[role="grid"]:not([role="main"] *)` (locale-independent — ARIA role,
not label text; the `:not()` exclusion is needed because `role="main"`
has its own separate `role="grid"` for the message log) as the primary,
most-reliable one. Worth remembering for any *future* selector work here
too: verifying a selector once against one page load is not sufficient
proof it'll hold on the next one.

## Current state: builds, loads, untested live

All planned modules from the feature plan are implemented and unit-tested
(49/49 Jest tests passing). The extension has never been loaded into a real
browser or tested against the live Messenger DOM — that's the immediate
next step, not further code-writing.

### Implemented

| Module | File | Status |
|---|---|---|
| Content bootstrap | `src/content/bootstrap.js` | Done, tested |
| Selector adapter | `src/content/selector-adapter.js` | Done, tested — **selectors are unverified guesses, see below** |
| Observer coordinator | `src/content/observer-coordinator.js` | Done, tested |
| Preferences bridge | `src/content/preferences-bridge.js` | Done, tested — loads stored prefs on page load, applies live on popup save, reapplies density after Messenger rerenders |
| Theme engine | `src/features/theme-engine.js` | Done, tested |
| Layout enhancer | `src/features/layout-enhancer.js` | Done, tested |
| Storage service | `src/shared/storage-service.js` | Done, tested |
| Diagnostics | `src/shared/diagnostics.js` | Done, tested (disabled by default, not wired into any module's logging yet — only used directly if called) |
| Settings UI (in-page overlay) | `src/settings/settings-ui.js` | Built, tested, **not wired up** — nothing calls `.show()`/`.toggle()`. Orphaned in favor of the popup. Candidate for deletion unless we want an in-page toggle button too. |
| Popup (toolbar UI) | `src/settings/popup.html/.js/.css` | Done — this is the actual settings surface, opens on toolbar icon click |
| Theme CSS | `src/styles/theme-tokens.css` | Done — palette tokens per `data-theme` |
| Density CSS | `src/styles/layout.css` | Done |
| ChatGPT-style CSS | `src/styles/chatgpt-style.css` | Done — targets Messenger's main pane/sidebar/composer via ARIA selectors, centers message column, strips borders |
| Icons | `icons/icon{16,32,48,128}.png` | Placeholder solid-color PNGs, not real branding |

### Not implemented (from the original feature plan)

- `src/content/selectors/messenger-v1.json` — plan wanted selectors in a
  JSON file loaded via `fs.readFileSync`; we implemented selectors inline
  in `selector-adapter.js` instead (simpler for a browser content script,
  no filesystem access needed). Intentional deviation, not a gap.
- No background service worker — not needed since the popup talks to
  `chrome.storage` directly and the content script listens for changes.

## 2026-08-23 live-browser session findings

Extension was loaded unpacked and tested against real facebook.com/messages
via browser automation (logged into a personal account — testing paused
mid-session at the user's request to switch to a non-personal account
before continuing).

**Bug found and fixed:** `bootstrap.js` called `initModules()` immediately
on its own load, but `manifest.json`'s content-script list loads bootstrap
first and every other module (including `preferences-bridge.js`, which
loads stored prefs and actually applies theme/layout) after. So
`initModules()` always ran against an empty module list and
`PreferencesBridge.init()` was never called — nothing ever visually
applied despite every module logging "Initialized" with no errors. Fixed
by moving the `initModules()`/`detectNavigation()` trigger out of
`bootstrap.js` into the end of `preferences-bridge.js` (last script in the
manifest's `js` array, so all modules have registered by then). Verified
live: `data-theme` and `--accent-color` etc. now apply correctly. All 49
Jest tests still pass.

**Selector chains confirmed working** against the live DOM: `main`,
`messageList` (via the `[role="log"]` fallback), `conversationList` (via
the `div[aria-label="Chats"]` fallback), `composeBox` (via the generic
`[role="textbox"][contenteditable="true"]` fallback), and
`conversationHeader` (`div[role="banner"]`) all matched real elements.

**Wallpaper issue: found, fixed, and verified live.** What first looked
like a per-conversation custom theme turned out to be Messenger's current
*default* chat background — every conversation on both test accounts
showed the same purple-to-blue gradient. That gradient is rendered by
nested elements carrying Messenger's own `__fb-dark-mode` or
`__fb-light-mode` class (the name tracks the conversation's light/dark
setting, not the page's) with an inline `style` background/gradient —
inline styles beat our CSS regardless of `!important` since we only
targeted the outer `div[role="main"]`, not those descendants. First fix
attempt only handled `__fb-dark-mode` and missed `__fb-light-mode` (the
variant actually in play), so the fix looked partial (center message
column went flat white, but purple margins remained) until both variants
were covered. Added a scoped override in `chatgpt-style.css` stripping
background from both class variants nested inside `div[role="main"]`
specifically, so Messenger's own light/dark mode elsewhere (menus,
dialogs) is untouched. Verified live across multiple conversations on two
accounts: the message pane is now flat white with no wallpaper, matching
the ChatGPT-flat design goal. All 49 Jest tests still pass.

## Former blocker, now resolved: selectors verified live

Previously nobody had opened this extension against the live Messenger
DOM. As of the 2026-08-23 session above, it has been — loaded unpacked,
tested against real facebook.com/messages on two accounts, with
`data-theme`/CSS variables confirmed applying and the message pane
rendering flat white with no wallpaper. The selector chains in
`selector-adapter.js` / `chatgpt-style.css` (`div[role="main"]`,
`div[aria-label="Chats"]`, `[role="log"]`,
`[role="textbox"][contenteditable="true"]`, `div[role="banner"]`) all
matched real elements. Not yet checked: the conversation-list/sidebar
styling specifically (background/border only, not yet screenshot-verified
the way the main pane was), and the popup's Save/Reset flow end-to-end.

## Next steps, in order

1. **Load it unpacked and look.** `chrome://extensions` → Developer mode →
   Load unpacked → select this folder. Confirm no manifest/icon errors.
2. **Open Messenger, click the toolbar icon.** Confirm the popup renders
   and Save/Reset work (check `chrome.storage.local` isn't silently
   failing — DevTools → Application → Storage).
3. **Check if the theme actually applies.** Toggle dark theme, change
   density, and look at the real page. If nothing visibly changes, the
   selectors in `selector-adapter.js` / `chatgpt-style.css` are wrong.
4. **If selectors are wrong:** open DevTools → Elements on the real
   Messenger page, find the actual wrapping elements for the conversation
   list, main pane, message list, and compose box, and report their
   `role`/`aria-label`/structure back. Update the candidate chains in
   `selector-adapter.js` first (single source of truth for what "main",
   "conversationList", etc. mean), then mirror any selector changes into
   `chatgpt-style.css` (comment at the top of that file explains why they
   need to stay in sync).
5. **Decide on `settings-ui.js`.** Either delete it (dead code, popup
   covers this) or wire a small floating toggle button into the page if
   an in-page overlay is actually wanted alongside the popup.
6. **Once selectors are confirmed working:** revisit `chatgpt-style.css`
   for actual visual polish (font sizes, spacing, sidebar width) now that
   real elements are being styled instead of guessed ones.
7. Real icon design — current icons are flat placeholder squares.

## Test / build commands

```
npm test          # Jest, 49 tests across 9 suites, all passing as of this update
npm run lint       # eslint src/ — not yet run/verified clean
npm run build      # no-op, plain JS extension
```

## Known non-goals (don't build these, per the project plan)

No message automation, no auto-send/reply/read-marking, no scraping or
exporting message content, no network requests beyond `chrome.storage`, no
Puppeteer/Selenium-style automation. Any feature proposal should pass:
"Does this read/export data, alter network behavior, or simulate an
interaction?" — if yes, it's out of scope.
