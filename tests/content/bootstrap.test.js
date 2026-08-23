// tests/content/bootstrap.test.js
const bootstrap = require('../../src/content/bootstrap');

describe('ContentBootstrap', () => {
    beforeEach(() => {
        // Reset singleton for each test
        bootstrap.modules = [];
        bootstrap.initialized = false;
        jest.clearAllMocks();
    });

    test('should register modules correctly', () => {
        const mockModule = {
            init: jest.fn(),
            name: 'TestModule'
        };
        
        bootstrap.registerModule(mockModule);
        
        expect(bootstrap.modules.length).toBe(1);
        expect(bootstrap.modules[0]).toBe(mockModule);
        expect(console.log).toHaveBeenCalledWith('[MW Bootstrap] Registered module:', 'TestModule');
    });

    test('should not register modules without init function', () => {
        const mockModule = {
            name: 'InvalidModule'
            // missing init function
        };
        
        bootstrap.registerModule(mockModule);
        
        expect(bootstrap.modules.length).toBe(0);
    });

    test('should initialize registered modules', () => {
        const mockModule1 = {
            init: jest.fn(),
            name: 'Module1'
        };
        const mockModule2 = {
            init: jest.fn(),
            name: 'Module2'
        };
        
        bootstrap.registerModule(mockModule1);
        bootstrap.registerModule(mockModule2);
        
        bootstrap.initModules();
        
        expect(mockModule1.init).toHaveBeenCalled();
        expect(mockModule2.init).toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith('[MW Bootstrap] Initializing modules...');
        expect(bootstrap.initialized).toBe(true);
    });

    test('should not initialize twice', () => {
        const mockModule = {
            init: jest.fn(),
            name: 'TestModule'
        };
        
        bootstrap.registerModule(mockModule);
        bootstrap.initModules();
        bootstrap.initModules(); // Second call
        
        expect(mockModule.init).toHaveBeenCalledTimes(1);
        expect(console.log).toHaveBeenCalledWith('[MW Bootstrap] Already initialized, skipping');
    });
});
