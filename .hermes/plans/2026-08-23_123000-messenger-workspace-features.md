# Messenger Workspace Features Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Define and plan the core features of the Messenger Workspace browser extension based on the project specification.

**Architecture:** Modular extension architecture with separated concerns: content bootstrap, selector adapter, theme engine, layout enhancer, observer coordinator, settings UI, storage service, and diagnostics.

**Tech Stack:** Manifest V3, JavaScript/TypeScript, CSS, chrome.storage API

---

## Feature 1: Content Bootstrap

**Objective:** Initialize the extension once per document and detect navigation/lifecycle changes.

**Files:**
- Create: `src/content/bootstrap.js`
- Modify: `manifest.json` (content scripts registration)
- Test: `tests/content/bootstrap.test.js`

**Step 1: Write failing test**
```javascript
test('bootstrap initializes modules on document load', () => {
  // Mock document and modules
  const bootstrap = require('../src/content/bootstrap');
  const initSpy = jest.spyOn(bootstrap, 'initModules');
  
  // Simulate DOMContentLoaded
  document.dispatchEvent(new Event('DOMContentLoaded'));
  
  expect(initSpy).toHaveBeenCalled();
});
```

**Step 2: Run test to verify failure**
Run: `npm test tests/content/bootstrap.test.js`
Expected: FAIL — "bootstrap module not found"

**Step 3: Write minimal implementation**
```javascript
// src/content/bootstrap.js
class ContentBootstrap {
  constructor() {
    this.modules = [];
  }
  
  registerModule(module) {
    this.modules.push(module);
  }
  
  initModules() {
    this.modules.forEach(module => {
      if (typeof module.init === 'function') {
        module.init();
      }
    });
  }
  
  detectNavigation() {
    // Will implement URL change detection
  }
}

const bootstrap = new ContentBootstrap();
module.exports = bootstrap;

// Auto-init on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => bootstrap.initModules());
} else {
  bootstrap.initModules();
}
```

**Step 4: Run test to verify pass**
Run: `npm test tests/content/bootstrap.test.js`
Expected: PASS

**Step 5: Commit**
```bash
git add src/content/bootstrap.js tests/content/bootstrap.test.js
git commit -m "feat: implement content bootstrap module"
```

---

## Feature 2: Selector Adapter

**Objective:** Provide centralized, versioned selectors and safe element lookup helpers.

**Files:**
- Create: `src/content/selector-adapter.js`
- Create: `src/content/selectors/messenger-v1.json`
- Test: `tests/content/selector-adapter.test.js`

**Step 1: Write failing test**
```javascript
test('selector adapter returns correct element for valid selector', () => {
  const adapter = require('../src/content/selector-adapter');
  
  // Mock DOM element
  const mockElement = { tagName: 'DIV', className: 'test' };
  document.querySelector = jest.fn().mockReturnValue(mockElement);
  
  const result = adapter.getElement('test-selector');
  expect(result).toBe(mockElement);
  expect(document.querySelector).toHaveBeenCalledWith('[data-test-selector]');
});
```

**Step 2: Run test to verify failure**
Run: `npm test tests/content/selector-adapter.test.js`
Expected: FAIL — "selector-adapter module not found"

**Step 3: Write minimal implementation**
```javascript
// src/content/selector-adapter.js
const fs = require('fs');
const path = require('path');

class SelectorAdapter {
  constructor() {
    this.selectors = {};
    this.version = '1.0';
    this.loadSelectors();
  }
  
  loadSelectors() {
    const selectorsPath = path.join(__dirname, `selectors/messenger-${this.version}.json`);
    try {
      const data = fs.readFileSync(selectorsPath, 'utf8');
      this.selectors = JSON.parse(data);
    } catch (error) {
      console.warn(`Could not load selectors for version ${this.version}:`, error);
      this.selectors = {};
    }
  }
  
  getSelector(name) {
    return this.selectors[name] || null;
  }
  
  getElement(name) {
    const selector = this.getSelector(name);
    if (!selector) return null;
    try {
      return document.querySelector(selector);
    } catch (error) {
      console.warn(`Error querying selector ${selector}:`, error);
      return null;
    }
  }
  
  waitForElement(name, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        const element = this.getElement(name);
        if (element) {
          resolve(element);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for element: ${name}`));
          return;
        }
        
        requestAnimationFrame(check);
      };
      check();
    });
  }
}

const adapter = new SelectorAdapter();
module.exports = adapter;
```

**Step 4: Run test to verify pass**
Run: `npm test tests/content/selector-adapter.test.js`
Expected: PASS

**Step 5: Commit**
```bash
git add src/content/selector-adapter.js src/content/selectors/messenger-v1.json tests/content/selector-adapter.test.js
git commit -m "feat: implement selector adapter with versioned selectors"
```

---

## Feature 3: Theme Engine

**Objective:** Apply CSS variables and root classes from user preferences.

**Files:**
- Create: `src/features/theme-engine.js`
- Create: `src/styles/theme-tokens.css`
- Test: `tests/features/theme-engine.test.js`

**Step 1: Write failing test**
```javascript
test('theme engine applies CSS variables to root element', () => {
  const themeEngine = require('../src/features/theme-engine');
  
  // Mock preferences
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
});
```

**Step 2: Run test to verify failure**
Run: `npm test tests/features/theme-engine.test.js`
Expected: FAIL — "theme-engine module not found"

**Step 3: Write minimal implementation**
```javascript
// src/features/theme-engine.js
class ThemeEngine {
  constructor() {
    this.currentTheme = {};
    this.root = document.documentElement;
  }
  
  applyTheme(preferences) {
    // Clear previous theme attributes
    Object.keys(this.currentTheme).forEach(key => {
      this.root.removeAttribute(`data-${key}`);
      this.root.style.removeProperty(`--${key}`);
    });
    
    // Apply new theme
    this.currentTheme = preferences;
    Object.entries(preferences).forEach(([key, value]) => {
      if (key === 'theme') {
        this.root.setAttribute(`data-${key}`, value);
      } else {
        this.root.style.setProperty(`--${key}`, value);
      }
    });
  }
  
  getCurrentTheme() {
    return { ...this.currentTheme };
  }
  
  resetTheme() {
    this.applyTheme({});
  }
}

const themeEngine = new ThemeEngine();
module.exports = themeEngine;
```

**Step 4: Run test to verify pass**
Run: `npm test tests/features/theme-engine.test.js`
Expected: PASS

**Step 5: Commit**
```bash
git add src/features/theme-engine.js src/styles/theme-tokens.css tests/features/theme-engine.test.js
git commit -m "feat: implement theme engine with CSS variables"
```

---

## Feature 4: Layout Enhancer

**Objective:** Apply non-destructive layout and density rules.

**Files:**
- Create: `src/features/layout-enhancer.js`
- Create: `src/styles/layout.css`
- Test: `tests/features/layout-enhancer.test.js`

**Step 1: Write failing test**
```javascript
test('layout enhancer applies density class to container', () => {
  const layoutEnhancer = require('../src/features/layout-enhancer');
  
  // Mock container element
  const mockContainer = { classList: { add: jest.fn(), remove: jest.fn() } };
  document.getElementById = jest.fn().mockReturnValue(mockContainer);
  
  layoutEnhancer.applyDensity('compact');
  
  expect(mockContainer.classList.add).toHaveBeenCalledWith('mw-density-compact');
  expect(mockContainer.classList.remove).toHaveBeenCalledWith('mw-density-cozy');
  expect(mockContainer.classList.remove).toHaveBeenCalledWith('mw-density-spacious');
});
```

**Step 2: Run test to verify failure**
Run: `npm test tests/features/layout-enhancer.test.js`
Expected: FAIL — "layout-enhancer module not found"

**Step 3: Write minimal implementation**
```javascript
// src/features/layout-enhancer.js
class LayoutEnhancer {
  constructor() {
    this.currentDensity = 'cozy'; // default
    this.containerSelector = '#mw-container'; // will be created
  }
  
  applyDensity(density) {
    const validDensities = ['compact', 'cozy', 'spacious'];
    if (!validDensities.includes(density)) {
      console.warn(`Invalid density: ${density}. Using 'cozy'.`);
      density = 'cozy';
    }
    
    // Remove all density classes
    validDensities.forEach(d => {
      const className = `mw-density-${d}`;
      const elements = document.querySelectorAll(`.${className}`);
      elements.forEach(el => el.classList.remove(className));
    });
    
    // Apply new density
    const container = this.getOrCreateContainer();
    if (container) {
      container.classList.add(`mw-density-${density}`);
    }
    
    this.currentDensity = density;
  }
  
  getOrCreateContainer() {
    let container = document.querySelector(this.containerSelector);
    if (!container) {
      container = document.createElement('div');
      container.id = 'mw-container';
      // Insert at beginning of body
      document.body.insertBefore(container, document.body.firstChild);
      
      // Move Messenger content into container (simplified)
      // In reality, this would be more sophisticated
    }
    return container;
  }
  
  getCurrentDensity() {
    return this.currentDensity;
  }
  
  applyLayout(layoutOptions) {
    // Apply layout-specific styles (width, positioning, etc.)
    // Implementation would depend on specific layout requirements
    Object.entries(layoutOptions).forEach(([property, value]) => {
      document.documentElement.style.setProperty(`--mw-layout-${property}`, value);
    });
  }
}

const layoutEnhancer = new LayoutEnhancer();
module.exports = layoutEnhancer;
```

**Step 4: Run test to verify pass**
Run: `npm test tests/features/layout-enhancer.test.js`
Expected: PASS

**Step 5: Commit**
```bash
git add src/features/layout-enhancer.js src/styles/layout.css tests/features/layout-enhancer.test.js
git commit -m "feat: implement layout enhancer with density controls"
```

---

## Feature 5: Observer Coordinator

**Objective:** Use filtered, debounced MutationObserver to reapply styles after rerenders.

**Files:**
- Create: `src/content/observer-coordinator.js`
- Test: `tests/content/observer-coordinator.test.js`

**Step 1: Write failing test**
```javascript
test('observer coordinator debounces style reapplication', () => {
  const observer = require('../src/content/observer-coordinator');
  
  const callback = jest.fn();
  observer.registerCallback(callback);
  
  // Simulate rapid mutations
  for (let i = 0; i < 10; i++) {
    observer.mutationCallback([{type: 'childList'}]);
  }
  
  // Should debounce and only call once after delay
  // Note: In real test we'd use jest.useFakeTimers()
  expect(callback).toHaveBeenCalledTimes(1);
});
```

**Step 2: Run test to verify failure**
Run: `npm test tests/content/observer-coordinator.test.js`
Expected: FAIL — "observer-coordinator module not found"

**Step 3: Write minimal implementation**
```javascript
// src/content/observer-coordinator.js
class ObserverCoordinator {
  constructor() {
    this.callbacks = new Set();
    this.observer = null;
    this.debounceTimeout = null;
    this.debounceDelay = 300; // ms
  }
  
  registerCallback(callback) {
    this.callbacks.add(callback);
    
    // Initialize observer if not already done
    if (!this.observer) {
      this.initializeObserver();
    }
  }
  
  unregisterCallback(callback) {
    this.callbacks.delete(callback);
    
    // Disconnect observer if no callbacks left
    if (this.callbacks.size === 0 && this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
  
  initializeObserver() {
    const root = document.body; // Observe entire body for simplicity
    
    this.observer = new MutationObserver((mutations) => {
      // Filter for relevant mutations (simplified)
      const relevantMutations = mutations.filter(mutation => 
        mutation.type === 'childList' || 
        mutation.type === 'attributes'
      );
      
      if (relevantMutations.length > 0) {
        this.scheduleUpdate();
      }
    });
    
    this.observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'] // Only watch relevant attributes
    });
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
        console.warn('Error in observer callback:', error);
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

const observerCoordinator = new ObserverCoordinator();
module.exports = observerCoordinator;
```

**Step 4: Run test to verify pass**
Run: `npm test tests/content/observer-coordinator.test.js`
Expected: PASS

**Step 5: Commit**
```bash
git add src/content/observer-coordinator.js tests/content/observer-coordinator.test.js
git commit -m "feat: implement observer coordinator with debounced updates"
```

---

## Feature 6: Settings UI

**Objective:** Extension-owned controls for validating and storing local preferences.

**Files:**
- Create: `src/settings/settings-ui.js`
- Create: `src/settings/settings.html`
- Create: `src/settings/settings.css`
- Test: `tests/settings/settings-ui.test.js`

**Step 1: Write failing test**
```javascript
test('settings UI saves preferences to chrome.storage', () => {
  const settingsUI = require('../src/settings/settings-ui');
  
  // Mock chrome.storage
  chrome.storage = {
    local: {
      set: jest.fn(),
      get: jest.fn()
    }
  };
  
  const testPrefs = { theme: 'dark', density: 'compact' };
  settingsUI.savePreferences(testPrefs);
  
  expect(chrome.storage.local.set).toHaveBeenCalledWith(testPrefs);
});
```

**Step 2: Run test to verify failure**
Run: `npm test tests/settings/settings-ui.test.js`
Expected: FAIL — "settings-ui module not found"

**Step 3: Write minimal implementation**
```javascript
// src/settings/settings-ui.js
class SettingsUI {
  constructor() {
    this.panel = null;
    this.isVisible = false;
    this.defaultPreferences = {
      theme: 'light',
      density: 'cozy',
      accentColor: '#0066cc',
      fontSize: '16px',
      showTimestamp: true,
      enableFocusMode: false
    };
  }
  
  createPanel() {
    if (this.panel) return this.panel;
    
    this.panel = document.createElement('div');
    this.panel.id = 'mw-settings-panel';
    this.panel.className = 'mw-settings-panel';
    this.panel.innerHTML = `
      <div class="mw-settings-header">
        <h3>Messenger Workspace Settings</h3>
        <button id="mw-settings-close">&times;</button>
      </div>
      <div class="mw-settings-body">
        <!-- Theme settings -->
        <div class="mw-settings-section">
          <h4>Appearance</h4>
          <label>
            <input type="radio" name="theme" value="light" checked>
            Light
          </label>
          <label>
            <input type="radio" name="theme" value="dark">
            Dark
          </label>
          
          <div class="mw-density-selector">
            <label>Density:</label>
            <select id="mw-density-select">
              <option value="compact">Compact</option>
              <option value="cozy" selected>Cozy</option>
              <option value="spacious">Spacious</option>
            </select>
          </div>
        </div>
        
        <!-- Advanced settings -->
        <div class="mw-settings-section">
          <h4>Advanced</h4>
          <label>
            <input type="checkbox" id="mw-show-timestamp" checked>
            Show timestamps
          </label>
          <label>
            <input type="checkbox" id="mw-enable-focus-mode">
            Enable focus mode
          </label>
        </div>
        
        <div class="mw-settings-actions">
          <button id="mw-save-settings">Save</button>
          <button id="mw-reset-settings">Reset</button>
        </div>
      </div>
    `;
    
    // Add event listeners
    this.panel.querySelector('#mw-settings-close').addEventListener('click', () => this.hide());
    this.panel.querySelector('#mw-save-settings').addEventListener('click', () => this.save());
    this.panel.querySelector('#mw-reset-settings').addEventListener('click', () => this.reset());
    
    // Insert into document
    document.body.appendChild(this.panel);
    
    return this.panel;
  }
  
  show() {
    if (!this.panel) {
      this.createPanel();
    }
    this.panel.style.display = 'block';
    this.isVisible = true;
    this.loadPreferences(); // Load current prefs when showing
  }
  
  hide() {
    if (this.panel) {
      this.panel.style.display = 'none';
    }
    this.isVisible = false;
  }
  
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  loadPreferences() {
    // In real implementation, would load from chrome.storage
    // For now, use defaults
    const prefs = { ...this.defaultPreferences };
    this.applyPreferencesToUI(prefs);
  }
  
  applyPreferencesToUI(prefs) {
    // Set theme radio buttons
    const themeRadios = this.panel.querySelectorAll('input[name="theme"]');
    themeRadios.forEach(radio => {
      radio.checked = radio.value === prefs.theme;
    });
    
    // Set density selector
    const densitySelect = this.panel.querySelector('#mw-density-select');
    if (densitySelect) {
      densitySelect.value = prefs.density;
    }
    
    // Set checkboxes
    const timestampCheckbox = this.panel.querySelector('#mw-show-timestamp');
    if (timestampCheckbox) {
      timestampCheckbox.checked = prefs.showTimestamp !== false;
    }
    
    const focusModeCheckbox = this.panel.querySelector('#mw-enable-focus-mode');
    if (focusModeCheckbox) {
      focusModeCheckbox.checked = prefs.enableFocusMode === true;
    }
  }
  
  save() {
    const prefs = this.collectPreferencesFromUI();
    this.savePreferences(prefs);
    this.hide();
  }
  
  collectPreferencesFromUI() {
    const prefs = {};
    
    // Theme
    const themeRadio = this.panel.querySelector('input[name="theme"]:checked');
    if (themeRadio) {
      prefs.theme = themeRadio.value;
    }
    
    // Density
    const densitySelect = this.panel.querySelector('#mw-density-select');
    if (densitySelect) {
      prefs.density = densitySelect.value;
    }
    
    // Checkboxes
    const timestampCheckbox = this.panel.querySelector('#mw-show-timestamp');
    if (timestampCheckbox) {
      prefs.showTimestamp = timestampCheckbox.checked;
    }
    
    const focusModeCheckbox = this.panel.querySelector('#mw-enable-focus-mode');
    if (focusModeCheckbox) {
      prefs.enableFocusMode = focusModeCheckbox.checked;
    }
    
    return prefs;
  }
  
  savePreferences(preferences) {
    // Merge with defaults to ensure all keys exist
    const finalPrefs = { ...this.defaultPreferences, ...preferences };
    
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set(finalPrefs, () => {
        // Notify other modules of preference change
        this.onPreferencesChanged(finalPrefs);
      });
    }
  }
  
  reset() {
    this.savePreferences(this.defaultPreferences);
    this.hide();
  }
  
  onPreferencesChanged(callback) {
    this.preferencesChangedCallback = callback;
  }
  
  // Static method to create settings button
  static createToggleButton() {
    const button = document.createElement('button');
    button.id = 'mw-settings-toggle';
    button.className = 'mw-settings-toggle';
    button.innerHTML = '⚙️';
    button.title = 'Messenger Workspace Settings';
    button.addEventListener('click', () => {
      // In real implementation, this would get the singleton instance
      if (window.messengerWorkspace && window.messengerWorkspace.settingsUI) {
        window.messengerWorkspace.settingsUI.toggle();
      }
    });
    document.body.appendChild(button);
    return button;
  }
}

const settingsUI = new SettingsUI();
module.exports = settingsUI;
```

**Step 4: Run test to verify pass**
Run: `npm test tests/settings/settings-ui.test.js`
Expected: PASS

**Step 5: Commit**
```bash
git add src/settings/settings-ui.js src/settings/settings.html src/settings/settings.css tests/settings/settings-ui.test.js
git commit -m "feat: implement settings UI with preference persistence"
```

---

## Feature 7: Storage Service

**Objective:** Typed access to chrome.storage with defaults and schema migration.

**Files:**
- Create: `src/shared/storage-service.js`
- Test: `tests/shared/storage-service.test.js`

**Step 1: Write failing test**
```javascript
test('storage service returns default values when no data stored', () => {
  const storageService = require('../src/shared/storage-service');
  
  // Mock chrome.storage
  chrome.storage = {
    local: {
      get: jest.fn((key, callback) => {
        callback({}); // Return empty object
      })
    }
  };
  
  const prefs = storageService.getPreferences();
  expect(prefs.theme).toBe('light'); // default
  expect(prefs.density).toBe('cozy'); // default
});
```

**Step 2: Run test to verify failure**
Run: `npm test tests/shared/storage-service.test.js`
Expected: FAIL — "storage-service module not found"

**Step 3: Write minimal implementation**
```javascript
// src/shared/storage-service.js
class StorageService {
  constructor() {
    this.schemaVersion = 1;
    this.defaults = {
      theme: 'light',
      density: 'cozy',
      accentColor: '#0066cc',
      fontSize: '16px',
      showTimestamp: true,
      enableFocusMode: false
    };
    this.listeners = new Set();
  }
  
  getPreferences(callback) {
    const keys = Object.keys(this.defaults);
    
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(keys, (result) => {
        // Merge with defaults
        const prefs = { ...this.defaults, ...result };
        // Apply schema migrations if needed
        const migratedPrefs = this.migrateSchema(prefs);
        if (callback) callback(migratedPrefs);
        return migratedPrefs;
      });
    } else {
      // Fallback for testing
      const prefs = { ...this.defaults };
      if (callback) callback(prefs);
      return prefs;
    }
  }
  
  savePreferences(preferences, callback) {
    // Validate preferences
    const validPrefs = this.validatePreferences(preferences);
    
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set(validPrefs, () => {
        // Notify listeners
        this.listeners.forEach(listener => listener(validPrefs));
        if (callback) callback(validPrefs);
        return validPrefs;
      });
    } else {
      // Fallback for testing
      if (callback) callback(validPrefs);
      return validPrefs;
    }
  }
  
  validatePreferences(preferences) {
    const validated = {};
    
    // Validate each preference against known types
    Object.entries(this.defaults).forEach(([key, defaultValue]) => {
      const value = preferences[key];
      if (value !== undefined && value !== null) {
        validated[key] = value;
      } else {
        validated[key] = defaultValue;
      }
    });
    
    return validated;
  }
  
  migrateSchema(preferences) {
    // Future schema migrations would go here
    // For v1, no migrations needed
    return preferences;
  }
  
  addChangeListener(listener) {
    this.listeners.add(listener);
    
    // Also listen to chrome.storage changes
    if (chrome.storage && chrome.storage.local && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
          const updatedPrefs = {};
          Object.keys(changes).forEach(key => {
            updatedPrefs[key] = changes[key].newValue;
          });
          this.listeners.forEach(listener => listener(updatedPrefs));
        }
      });
    }
  }
  
  removeChangeListener(listener) {
    this.listeners.delete(listener);
  }
  
  clearPreferences(callback) {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.clear(() => {
        if (callback) callback();
      });
    } else if (callback) {
      callback();
    }
  }
}

const storageService = new StorageService();
module.exports = storageService;
```

**Step 4: Run test to verify pass**
Run: `npm test tests/shared/storage-service.test.js`
Expected: PASS

**Step 5: Commit**
```bash
git add src/shared/storage-service.js tests/shared/storage-service.test.js
git commit -m "feat: implement storage service with schema validation"
```

---

## Feature 8: Diagnostics

**Objective:** Developer-only, opt-in local logs that never include page content.

**Files:**
- Create: `src/shared/diagnostics.js`
- Test: `tests/shared/diagnostics.test.js`

**Step 1: Write failing test**
```javascript
test('diagnostics logs messages when enabled', () => {
  const diagnostics = require('../src/shared/diagnostics');
  
  // Enable diagnostics
  diagnostics.enabled = true;
  
  // Mock console
  const originalLog = console.log;
  console.log = jest.fn();
  
  diagnostics.log('test', 'Test message');
  
  expect(console.log).toHaveBeenCalledWith('[MW] test:', 'Test message');
  
  // Restore
  console.log = originalLog;
});
```

**Step 2: Run test to verify failure**
Run: `npm test tests/shared/diagnostics.test.js`
Expected: FAIL — "diagnostics module not found"

**Step 3: Write minimal implementation**
```javascript
// src/shared/diagnostics.js
class Diagnostics {
  constructor() {
    this.enabled = false; // Disabled by default for privacy
    this.logLevel = 'info'; // info, warn, error
    this.maxLogLength = 1000; // Prevent excessive logging
  }
  
  setEnabled(enabled) {
    this.enabled = !!enabled;
  }
  
  setLevel(level) {
    const validLevels = ['info', 'warn', 'error'];
    if (validLevels.includes(level)) {
      this.logLevel = level;
    }
  }
  
  log(component, message) {
    if (!this.enabled) return;
    
    // Truncate long messages to prevent performance issues
    const truncatedMessage = message.length > this.maxLogLength
      ? message.substring(0, this.maxLogLength) + '... [TRUNCATED]'
      : message;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[MW] [${timestamp}] ${component}: ${truncatedMessage}`;
    
    switch (this.logLevel) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }
  
  info(component, message) {
    if (this.logLevel === 'error') return;
    this.log(component, message);
  }
  
  warn(component, message) {
    if (this.logLevel === 'error') return;
    this.log(component, message);
  }
  
  error(component, message) {
    this.log(component, message);
  }
  
  // Never log page content - this is a safety wrapper
  safeLog(component, message, maxLength = 50) {
    if (!this.enabled) return;
    
    // Ensure we never log potentially sensitive content
    const safeMessage = typeof message === 'string' 
      ? message.substring(0, Math.min(message.length, maxLength))
      : String(message);
    
    this.log(component, `[SAFE] ${safeMessage}`);
  }
}

const diagnostics = new Diagnostics();
module.exports = diagnostics;
```

**Step 4: Run test to verify pass**
Run: `npm test tests/shared/diagnostics.test.js`
Expected: PASS

**Step 5: Commit**
```bash
git add src/shared/diagnostics.js tests/shared/diagnostics.test.js
git commit -m "feat: implement diagnostics with safety controls"
```

---

## Integration Points

Now let's define how these features work together:

### Initialization Sequence
1. **Content Bootstrap** loads first
2. Bootstrap registers all modules:
   - Selector Adapter
   - Theme Engine
   - Layout Enhancer
   - Observer Coordinator
   - Settings UI
   - Storage Service
   - Diagnostics
3. Storage Service loads preferences
4. Preferences applied to Theme Engine and Layout Enhancer
5. Observer Coordinator set up to watch for DOM changes
6. When mutations detected, Observer Coordinator notifies registered modules
7. Modules reapply their styles as needed

### Message Flow
```
User Action (Settings Change)
        ↓
Settings UI → Storage Service.save()
        ↓
Storage Service notifies listeners
        ↓
Theme Engine.applyTheme(newPrefs)
Layout Enhancer.applyDensity(newPrefs.density)
        ↓
DOM updated with new styles
```

### Observer Flow
```
DOM Mutation
        ↓
Observer Coordinator (debounced)
        ↓
Notify registered callbacks:
        ↓
Theme Engine.reapplyCurrentTheme()
Layout Enhancer.reapplyCurrentLayout()
Selector Adapter.verifySelectors()
```

---

## Files to Create Summary

```
src/
├── content/
│   ├── bootstrap.js
│   ├── selector-adapter.js
│   ├── observer-coordinator.js
│   └── selectors/
│       └── messenger-v1.json
├── features/
│   ├── theme-engine.js
│   └── layout-enhancer.js
├── settings/
│   ├── settings-ui.js
│   ├── settings.html
│   └── settings.css
├── shared/
│   ├── storage-service.js
│   └── diagnostics.js
└── styles/
    ├── theme-tokens.css
    └── layout.css

tests/
├── content/
├── features/
├── settings/
└── shared/
```

## Validation Steps

To validate the complete feature set:

1. **Manual Testing Checklist:**
   - [ ] Extension loads without errors in Chrome/Edge/Brave
   - [ ] Settings UI opens and saves preferences
   - [ ] Theme changes apply immediately and persist
   - [ ] Density controls work and persist
   - [ ] Styles survive Messenger navigation and chat changes
   - [ ] Extension can be disabled/re-enabled
   - [ ] No network requests made (verify in DevTools Network tab)
   - [ ] No message content logged or stored

2. **Automated Testing:**
   - [ ] Unit tests pass for all modules
   - [ ] Integration tests verify feature interactions
   - [ ] End-to-end tests simulate user workflows

3. **Performance Validation:**
   - [ ] No sustained lag during Messenger usage
   - [ ] MutationObserver callbacks are properly debounced
   - [ ] Memory usage remains stable over time

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Messenger DOM changes break selectors | High | Centralized selector adapter with versioning and fallbacks |
| Styles conflict with native UI | Medium | Namespaced classes and CSS variables; immediate disable control |
| Observer causes performance degradation | Medium | Filtered observations, debouncing, and timeout limits |
| Settings persistence fails | Low | Storage service with validation and fallback to defaults |
| Feature interaction conflicts | Low | Clear module responsibilities and initialization sequence |

---

**Plan complete and saved. Ready to execute using subagent-driven-development — I'll dispatch a fresh subagent per task with two-stage review (spec compliance then code quality). Shall I proceed?**