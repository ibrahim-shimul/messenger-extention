// tests/shared/diagnostics.test.js
const diagnostics = require('../../src/shared/diagnostics');

describe('Diagnostics', () => {
    beforeEach(() => {
        diagnostics.enabled = false;
        diagnostics.logLevel = 'info';
        jest.clearAllMocks();
    });

    test('should not log when disabled', () => {
        diagnostics.log('test', 'message');
        expect(console.log).not.toHaveBeenCalled();
    });

    test('should log messages when enabled', () => {
        diagnostics.setEnabled(true);
        diagnostics.log('test', 'Test message');
        expect(console.log).toHaveBeenCalledWith('[MW] test: Test message');
    });

    test('should truncate long messages', () => {
        diagnostics.setEnabled(true);
        const longMessage = 'a'.repeat(2000);
        diagnostics.log('test', longMessage);
        const loggedMessage = console.log.mock.calls[0][0];
        expect(loggedMessage.length).toBeLessThan(longMessage.length);
        expect(loggedMessage).toContain('[TRUNCATED]');
    });

    test('should respect log level', () => {
        diagnostics.setEnabled(true);
        diagnostics.setLevel('error');
        diagnostics.log('test', 'error message');
        expect(console.error).toHaveBeenCalledWith('[MW] test: error message');
        expect(console.log).not.toHaveBeenCalled();
    });

    test('should ignore invalid log level', () => {
        diagnostics.setLevel('bogus');
        expect(diagnostics.logLevel).toBe('info');
    });
});
