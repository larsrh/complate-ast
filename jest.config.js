module.exports = {
    testMatch: [
        // jest default, except for ts -- those are built using tsc
        "**/__tests__/**/*.js?(x)",
        "**/?(*.)+(spec|test).js?(x)"
    ],
    verbose: true
};
