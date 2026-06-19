module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  transform: {
    '^.+\\.(js|ts|tsx)$': 'babel-jest',
  },
};
