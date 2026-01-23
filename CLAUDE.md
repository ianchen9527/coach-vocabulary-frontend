# Attain - AI Coach Vocabulary Frontend

## Project Overview

A React Native/Expo mobile app for vocabulary learning with AI-powered coaching. Users learn, practice, and review English vocabulary through reading, listening, and speaking exercises.

## Tech Stack

- React Native 0.81+ with Expo 54+
- TypeScript 5.9+ (strict mode)
- Expo Router for file-based navigation
- Axios for API calls
- Jest for testing (80% coverage threshold)

## Project Structure

```
app/                    # Expo Router screens (file-based routing)
├── (auth)/            # Auth group: login.tsx
└── (main)/            # Main app group: index, learn, practice, review, analysis

components/
├── exercise/          # Exercise-specific components
└── ui/                # Reusable UI components

contexts/              # React Context providers
hooks/                 # Custom React hooks
services/              # API service modules
types/                 # TypeScript type definitions
utils/                 # Utility/helper functions
styles/                # Shared StyleSheet definitions
lib/                   # Configuration (colors, config)
__tests__/             # Jest tests (mirrors src structure)
```

## Coding Conventions

### File Naming

- Components: `PascalCase.tsx` (e.g., `ReadingExercise.tsx`)
- Hooks: `camelCase.ts` starting with `use` (e.g., `useExerciseFlow.ts`)
- Services: `camelCase.ts` ending with `Service` (e.g., `practiceService.ts`)
- Types: `camelCase.ts` (e.g., `api.ts`)
- Tests: `*.test.ts` or `*.test.tsx` mirroring source path

### Component Patterns

```tsx
// 1. Imports: React, then RN, then external, then internal (relative)
import { useState, useCallback } from "react";
import { View, Text } from "react-native";
import { SomeIcon } from "lucide-react-native";
import { useAuth } from "../contexts/AuthContext";
import type { SomeType } from "../types/api";

// 2. Props interface with JSDoc comments for clarity
export interface MyComponentProps {
  /** Description of the prop */
  value: string;
  onPress: () => void;
}

// 3. Named function export (not default export)
export function MyComponent({ value, onPress }: MyComponentProps) {
  // Component logic
  return <View>...</View>;
}
```

### Hook Patterns

```ts
// 1. Export interface for config/options
export interface UseMyHookConfig {
  duration?: number;
}

// 2. Export types used by the hook
export type MyHookState = "idle" | "active" | "complete";

// 3. Named function export
export function useMyHook(config: UseMyHookConfig = {}) {
  const [state, setState] = useState<MyHookState>("idle");

  // Use useCallback for functions returned from hooks
  const doSomething = useCallback(() => {
    // ...
  }, [/* deps */]);

  // Use useRef for values that shouldn't trigger re-renders
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup in useEffect
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { state, doSomething };
}
```

### Service Patterns

```ts
import { api } from "./api";
import type { RequestType, ResponseType } from "../types/api";

export const myService = {
  /**
   * JSDoc description
   */
  async getSomething(): Promise<ResponseType> {
    const response = await api.get<ResponseType>("/api/endpoint");
    return response.data;
  },

  async postSomething(data: RequestType): Promise<ResponseType> {
    const response = await api.post<ResponseType>("/api/endpoint", data);
    return response.data;
  },
};
```

### Type Definitions

```ts
// Group related types with comments
// === Section Name ===
export interface RequestType {
  field: string;
}

export interface ResponseType {
  data: string;
}

// Use union types for enums
export type ExerciseType = "reading_lv1" | "reading_lv2" | "listening_lv1";

// Extend interfaces when adding fields
export interface ExtendedSchema extends BaseSchema {
  additionalField: string;
}
```

### Context Patterns

```tsx
import { createContext, useContext, useState, ReactNode } from "react";

interface MyContextType {
  value: string;
  setValue: (v: string) => void;
}

const MyContext = createContext<MyContextType | undefined>(undefined);

export function MyProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState("");

  return (
    <MyContext.Provider value={{ value, setValue }}>
      {children}
    </MyContext.Provider>
  );
}

export function useMyContext() {
  const context = useContext(MyContext);
  if (context === undefined) {
    throw new Error("useMyContext must be used within a MyProvider");
  }
  return context;
}
```

## Testing Conventions

### Test File Structure

```ts
import { myService } from "../../services/myService";
import { api } from "../../services/api";

// Mock dependencies
jest.mock("../../services/api", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe("myService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("methodName", () => {
    it("should do something specific", async () => {
      // Arrange
      const mockResponse = { data: { ... } };
      (api.get as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await myService.methodName();

      // Assert
      expect(api.get).toHaveBeenCalledWith("/api/endpoint");
      expect(result).toEqual(mockResponse.data);
    });
  });
});
```

### Test Naming

- Use descriptive `it` statements: `it("should return error when token is invalid")`
- Group related tests in nested `describe` blocks
- Test both success and error cases

## Styling

### Use lib/tw.ts Utilities

```tsx
import { tw, colors } from "../lib/tw";

// Combine styles with array syntax
<View style={[tw.flex1, tw.bgBackground, tw.p4]}>
  <Text style={[tw.textLg, tw.fontBold, { color: colors.primary }]}>
    Title
  </Text>
</View>
```

### Custom Styles with StyleSheet

```tsx
import { StyleSheet } from "react-native";
import { colors } from "../lib/tw";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
```

## Important Patterns

### Exercise Components

Exercise components (`ReadingExercise`, `ListeningExercise`, `SpeakingExercise`) follow a consistent pattern:
- Accept `phase`, `remainingMs`, `selectedIndex` from `useExerciseFlow`
- Render different UI based on phase: `question` → `options` → `result`
- Use shared components: `ExerciseOptions`, `CountdownText`, etc.

### API Error Handling

- Services throw errors; callers handle them
- AuthContext handles 401 responses via axios interceptor
- Use try/catch in components that call services

### Async Storage Keys

Use `STORAGE_KEYS` from `services/api.ts` for consistent key naming.

## Commands

```bash
# Development
npm start                    # Start Expo dev server
npx expo run:ios            # Run on iOS simulator
npx expo run:android        # Run on Android emulator

# Testing
npm test                    # Run tests
npm run test:coverage       # Run tests with coverage

# Type checking
npx tsc --noEmit            # Check types without emitting

# Building
eas build --platform ios    # Build for iOS
eas build --platform android # Build for Android
```

## Comments

- Use Traditional Chinese (繁體中文) for code comments
- Use JSDoc for public interfaces and exported functions
- Keep comments concise and meaningful
