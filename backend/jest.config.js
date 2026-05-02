module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@scure|otplib|@otplib|@simplewebauthn|@xenova)/)',
  ],
  moduleNameMapper: {
    '^@scure/base$': '<rootDir>/src/__mocks__/scure-base.js',
    '^uuid$': '<rootDir>/src/__mocks__/uuid.js',
    '^@xenova/transformers$': '<rootDir>/src/__mocks__/@xenova/transformers.js',
    '^otplib$': '<rootDir>/src/__mocks__/otplib.js',
    '^qrcode$': '<rootDir>/src/__mocks__/qrcode.js',
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['lcov', 'text', 'json-summary'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/*.entity.ts',
    '!src/**/*.dto.ts',
    '!src/**/index.ts',
    '!src/env.validation.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
};
