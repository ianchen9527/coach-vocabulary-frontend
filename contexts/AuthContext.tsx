import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authService } from "../services/authService";
import { STORAGE_KEYS } from "../services/api";
import type { UserInfo } from "../types/api";

interface AuthState {
  isAuthenticated: boolean;
  user: UserInfo | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  register: (email: string, username: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
  });

  // 初始化時檢查是否已登入
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const userJson = await AsyncStorage.getItem(STORAGE_KEYS.USER);

        if (token && userJson) {
          // 嘗試驗證 token 有效性
          try {
            const user = await authService.getMe();
            // 更新本地儲存的用戶資訊（以防有變更）
            await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
            setState({
              isAuthenticated: true,
              user,
              isLoading: false,
            });
          } catch {
            // Token 無效，清除本地儲存
            await AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
            await AsyncStorage.removeItem(STORAGE_KEYS.USER);
            setState({
              isAuthenticated: false,
              user: null,
              isLoading: false,
            });
          }
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

  // 共用的認證資料儲存邏輯
  const saveAuthData = async (response: {
    access_token: string;
    id: string;
    email: string;
    username: string;
  }) => {
    await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.access_token);
    const user: UserInfo = {
      id: response.id,
      email: response.email,
      username: response.username,
    };
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

    setState({
      isAuthenticated: true,
      user,
      isLoading: false,
    });
  };

  const register = async (email: string, username: string, password: string) => {
    try {
      const response = await authService.register(email, username, password);
      await saveAuthData(response);
    } catch (error) {
      console.error("Register failed:", error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login(email, password);
      await saveAuthData(response);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);

      setState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  };

  const deleteAccount = async (email: string) => {
    try {
      await authService.deleteAccount(email);
      await AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);

      setState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
    } catch (error) {
      console.error("Delete account failed:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, register, login, logout, deleteAccount }}>
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
