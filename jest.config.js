module.exports = {
  preset: 'jest-expo/web',
  setupFiles: ['<rootDir>/jest.setup.pre.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|twrnc|lucide-react-native)',
  ],
  collectCoverageFrom: [
    'hooks/**/*.{ts,tsx}',
    'services/api.ts',
    'services/learnService.ts',
    'services/practiceService.ts',
    'services/reviewService.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    './hooks/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './services/learnService.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './services/practiceService.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './services/reviewService.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
