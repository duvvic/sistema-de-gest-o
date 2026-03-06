/** @type {import('jest').Config} */
const config = {
    testEnvironment: 'node',
    transform: {},
    setupFilesAfterEnv: ['./tests/setup.js'],
};

export default config;
