import { api } from "./api";
import type { LoginRequest, LoginResponse } from "../types/api";

export const authService = {
  /**
   * 登入或註冊用戶
   * @param username 用戶名
   * @returns 登入回應，包含 userId 和是否為新用戶
   */
  async login(username: string): Promise<LoginResponse> {
    const request: LoginRequest = { username };
    const response = await api.post<LoginResponse>("/api/auth/login", request);
    return response.data;
  },
};
