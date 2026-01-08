import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authService } from "../services/authService";

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  username: string | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (username: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER_ID: "userId",
  USERNAME: "username",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    userId: null,
    username: null,
    isLoading: true,
  });

  // 初始化時檢查是否已登入
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const userId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
        const username = await AsyncStorage.getItem(STORAGE_KEYS.USERNAME);

        if (userId && username) {
          setState({
            isAuthenticated: true,
            userId,
            username,
            isLoading: false,
          });
        } else {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error("Failed to load auth state:", error);
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    loadStoredAuth();
  }, []);

  const login = async (username: string) => {
    try {
      const response = await authService.login(username);

      await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, response.id);
      await AsyncStorage.setItem(STORAGE_KEYS.USERNAME, response.username);

      setState({
        isAuthenticated: true,
        userId: response.id,
        username: response.username,
        isLoading: false,
      });
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_ID);
      await AsyncStorage.removeItem(STORAGE_KEYS.USERNAME);

      setState({
        isAuthenticated: false,
        userId: null,
        username: null,
        isLoading: false,
      });
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
