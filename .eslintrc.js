// ESLint config.
//
// `npm run lint` was previously broken — the script existed in
// package.json but no config file did, so it always exited with
// "couldn't find a configuration file" (STATUS.md had it recorded as
// "not yet run/verified clean").
module.exports = {
    root: true,
    env: {
        browser: true,
        es2021: true,
        webextensions: true
    },
    parserOptions: {
        ecmaVersion: 2021,
        // Content scripts are classic scripts sharing one global scope,
        // not ES modules — that shared scope is exactly how the modules
        // reach each other at runtime.
        sourceType: 'script'
    },
    extends: 'eslint:recommended',
    globals: {
        // Present under CommonJS (tests/bundlers) but not in the browser;
        // every use site is already guarded by a typeof check.
        module: 'readonly',
        require: 'readonly',

        // The per-module singletons. Each is declared in exactly one file
        // and read from the others via the shared content-script global
        // scope (and, for storageService, by the popup — popup.html loads
        // storage-service.js ahead of popup.js). Listed here so no-undef
        // understands the cross-file reads; see the no-redeclare note in
        // `rules` for why declaring them here is safe.
        bootstrap: 'readonly',
        selectorAdapter: 'readonly',
        observerCoordinator: 'readonly',
        storageService: 'readonly',
        diagnostics: 'readonly',
        themeEngine: 'readonly',
        layoutEnhancer: 'readonly',
        settingsUI: 'readonly'
    },
    rules: {
        // Each module file ends with `const <singleton> = new Thing()` at
        // top level and other files pick it up off the shared global
        // scope. Declaring those names in `globals` would satisfy the
        // readers but then trip no-redeclare in the one file that
        // actually declares each name — the rule can't express
        // "declared once here, read everywhere else". The cross-file
        // reads are all `typeof x !== 'undefined'`-guarded, which
        // no-undef permits, so turning this off is the accurate call
        // rather than a workaround.
        'no-redeclare': 'off',
        'no-unused-vars': ['warn', { args: 'none' }]
    },
    overrides: [
        {
            files: ['tests/**/*.js', 'jest.setup.js', '.eslintrc.js'],
            env: { jest: true, node: true }
        }
    ]
};
