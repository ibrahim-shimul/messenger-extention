// src/settings/settings-ui.js
class SettingsUI {
    constructor() {
        this.panel = null;
        this.isVisible = false;
        this.defaultPreferences = {
            theme: 'light',
            density: 'cozy',
            accentColor: '#4ec9b0',
            fontSize: '15px',
            showTimestamp: true,
            enableFocusMode: false
        };
        console.log('[MW SettingsUI] Initialized');
    }

    init() {
        // Panel is created lazily on first show()
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
        <div class="mw-settings-section">
          <h4>Appearance</h4>
          <label>
            <input type="radio" name="theme" value="light">
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
              <option value="cozy">Cozy</option>
              <option value="spacious">Spacious</option>
            </select>
          </div>
        </div>
        <div class="mw-settings-section">
          <h4>Advanced</h4>
          <label>
            <input type="checkbox" id="mw-show-timestamp">
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

        this.panel.querySelector('#mw-settings-close').addEventListener('click', () => this.hide());
        this.panel.querySelector('#mw-save-settings').addEventListener('click', () => this.save());
        this.panel.querySelector('#mw-reset-settings').addEventListener('click', () => this.reset());

        document.body.appendChild(this.panel);

        return this.panel;
    }

    show() {
        if (!this.panel) {
            this.createPanel();
        }
        this.panel.style.display = 'block';
        this.isVisible = true;
        this.loadPreferences();
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
        const prefs = { ...this.defaultPreferences };
        this.applyPreferencesToUI(prefs);
    }

    applyPreferencesToUI(prefs) {
        if (!this.panel) return;

        const themeRadios = this.panel.querySelectorAll('input[name="theme"]');
        themeRadios.forEach(radio => {
            radio.checked = radio.value === prefs.theme;
        });

        const densitySelect = this.panel.querySelector('#mw-density-select');
        if (densitySelect) {
            densitySelect.value = prefs.density;
        }

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
        if (!this.panel) return prefs;

        const themeRadio = this.panel.querySelector('input[name="theme"]:checked');
        if (themeRadio) {
            prefs.theme = themeRadio.value;
        }

        const densitySelect = this.panel.querySelector('#mw-density-select');
        if (densitySelect) {
            prefs.density = densitySelect.value;
        }

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
        const finalPrefs = { ...this.defaultPreferences, ...preferences };

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set(finalPrefs);
        }
    }

    reset() {
        this.savePreferences(this.defaultPreferences);
        this.applyPreferencesToUI(this.defaultPreferences);
        this.hide();
    }
}

// Create singleton instance
const settingsUI = new SettingsUI();

// Register with bootstrap
if (typeof bootstrap !== 'undefined') {
    bootstrap.registerModule(settingsUI);
}

// Export for use by other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = settingsUI;
}
