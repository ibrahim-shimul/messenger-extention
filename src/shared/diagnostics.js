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

        const text = typeof message === 'string' ? message : String(message);
        const truncatedMessage = text.length > this.maxLogLength
            ? text.substring(0, this.maxLogLength) + '... [TRUNCATED]'
            : text;

        const logMessage = `[MW] ${component}: ${truncatedMessage}`;

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
        this.log(component, message);
    }

    warn(component, message) {
        this.log(component, message);
    }

    error(component, message) {
        this.log(component, message);
    }
}

// Create singleton instance
const diagnostics = new Diagnostics();

// Export for use by other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = diagnostics;
}
