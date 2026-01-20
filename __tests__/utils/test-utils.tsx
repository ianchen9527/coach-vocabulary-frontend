import React, { ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Mock navigation
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  setParams: jest.fn(),
};

export function mockNavigation() {
  return mockRouter;
}

// Reset all navigation mocks
export function resetNavigationMocks() {
  Object.values(mockRouter).forEach((fn) => {
    if (typeof fn === 'function' && 'mockReset' in fn) {
      (fn as jest.Mock).mockReset();
    }
  });
  mockRouter.canGoBack.mockReturnValue(true);
}

// Mock useRouter for expo-router
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: jest.fn(() => ({})),
  usePathname: jest.fn(() => '/'),
  useSegments: jest.fn(() => []),
  Link: ({ children }: { children: ReactNode }) => children,
  Stack: {
    Screen: () => null,
  },
}));

// Mock AuthContext
const mockAuthContext = {
  isAuthenticated: true,
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser',
  },
  isLoading: false,
  register: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  deleteAccount: jest.fn(),
};

export function createMockAuthContext(overrides = {}) {
  return { ...mockAuthContext, ...overrides };
}

// Mock AuthProvider
const MockAuthProvider = ({ children, value = mockAuthContext }: { children: ReactNode; value?: typeof mockAuthContext }) => {
  const AuthContext = React.createContext(value);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Wrapper component that provides all necessary providers
interface AllProvidersProps {
  children: ReactNode;
  authValue?: typeof mockAuthContext;
}

function AllProviders({ children, authValue = mockAuthContext }: AllProvidersProps) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 0, height: 0 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <NavigationContainer>
        <MockAuthProvider value={authValue}>
          {children}
        </MockAuthProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authValue?: typeof mockAuthContext;
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) {
  const { authValue, ...renderOptions } = options;

  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders authValue={authValue}>{children}</AllProviders>
    ),
    ...renderOptions,
  });
}

// Session factory functions
export function createMockLearnSession(overrides = {}) {
  return {
    available: true,
    reason: null,
    words: [
      {
        id: 'word-1',
        word: 'apple',
        translation: '蘋果',
        sentence: 'I eat an apple.',
        sentence_zh: '我吃一顆蘋果。',
        image_url: 'https://example.com/apple.jpg',
        audio_url: 'https://example.com/apple.mp3',
      },
      {
        id: 'word-2',
        word: 'banana',
        translation: '香蕉',
        sentence: 'She likes bananas.',
        sentence_zh: '她喜歡香蕉。',
        image_url: 'https://example.com/banana.jpg',
        audio_url: 'https://example.com/banana.mp3',
      },
    ],
    exercises: [
      {
        word_id: 'word-1',
        type: 'reading_lv1',
        options: [
          { index: 0, word_id: 'word-1', translation: '蘋果', image_url: null },
          { index: 1, word_id: 'word-2', translation: '香蕉', image_url: null },
          { index: 2, word_id: 'word-3', translation: '橘子', image_url: null },
          { index: 3, word_id: 'word-4', translation: '葡萄', image_url: null },
        ],
        correct_index: 0,
      },
      {
        word_id: 'word-2',
        type: 'reading_lv1',
        options: [
          { index: 0, word_id: 'word-1', translation: '蘋果', image_url: null },
          { index: 1, word_id: 'word-2', translation: '香蕉', image_url: null },
          { index: 2, word_id: 'word-3', translation: '橘子', image_url: null },
          { index: 3, word_id: 'word-4', translation: '葡萄', image_url: null },
        ],
        correct_index: 1,
      },
    ],
    ...overrides,
  };
}

export function createMockPracticeSession(overrides = {}) {
  return {
    available: true,
    reason: null,
    exercises: [
      {
        word_id: 'word-1',
        word: 'apple',
        translation: '蘋果',
        image_url: 'https://example.com/apple.jpg',
        audio_url: 'https://example.com/apple.mp3',
        pool: 'P1',
        type: 'reading_lv1',
        options: [
          { index: 0, word_id: 'word-1', translation: '蘋果', image_url: null },
          { index: 1, word_id: 'word-2', translation: '香蕉', image_url: null },
          { index: 2, word_id: 'word-3', translation: '橘子', image_url: null },
          { index: 3, word_id: 'word-4', translation: '葡萄', image_url: null },
        ],
        correct_index: 0,
      },
      {
        word_id: 'word-1',
        word: 'apple',
        translation: '蘋果',
        image_url: 'https://example.com/apple.jpg',
        audio_url: 'https://example.com/apple.mp3',
        pool: 'P1',
        type: 'listening_lv1',
        options: [
          { index: 0, word_id: 'word-1', translation: '蘋果', image_url: null },
          { index: 1, word_id: 'word-2', translation: '香蕉', image_url: null },
          { index: 2, word_id: 'word-3', translation: '橘子', image_url: null },
          { index: 3, word_id: 'word-4', translation: '葡萄', image_url: null },
        ],
        correct_index: 0,
      },
    ],
    exercise_order: ['reading_lv1', 'listening_lv1'],
    ...overrides,
  };
}

export function createMockReviewSession(overrides = {}) {
  return {
    available: true,
    reason: null,
    words: [
      {
        id: 'word-1',
        word: 'apple',
        translation: '蘋果',
        sentence: 'I eat an apple.',
        sentence_zh: '我吃一顆蘋果。',
        image_url: 'https://example.com/apple.jpg',
        audio_url: 'https://example.com/apple.mp3',
        pool: 'R1',
      },
    ],
    exercises: [
      {
        word_id: 'word-1',
        type: 'reading_lv1',
        options: [
          { index: 0, word_id: 'word-1', translation: '蘋果', image_url: null },
          { index: 1, word_id: 'word-2', translation: '香蕉', image_url: null },
          { index: 2, word_id: 'word-3', translation: '橘子', image_url: null },
          { index: 3, word_id: 'word-4', translation: '葡萄', image_url: null },
        ],
        correct_index: 0,
      },
    ],
    ...overrides,
  };
}

// Re-export testing library utilities
export * from '@testing-library/react-native';
