import { api } from "./api";
import type {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  UserInfo,
  DeleteAccountRequest,
  DeleteAccountResponse,
} from "../types/api";

export const authService = {
  /**
   * 註冊新用戶
   * @param email 電子郵件
   * @param username 用戶名
   * @param password 密碼
   * @returns 認證回應，包含 access_token 和用戶資訊
   */
  async register(
    email: string,
    username: string,
    password: string
  ): Promise<AuthResponse> {
    const request: RegisterRequest = { email, username, password };
    const response = await api.post<AuthResponse>("/api/auth/register", request);
    return response.data;
  },

  /**
   * 登入用戶
   * @param email 電子郵件
   * @param password 密碼
   * @returns 認證回應，包含 access_token 和用戶資訊
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const request: LoginRequest = { email, password };
    const response = await api.post<AuthResponse>("/api/auth/login", request);
    return response.data;
  },

  /**
   * 取得目前登入用戶資訊
   * @returns 用戶資訊
   */
  async getMe(): Promise<UserInfo> {
    const response = await api.get<UserInfo>("/api/auth/me");
    return response.data;
  },

  /**
   * 刪除用戶帳號
   * @param email 用戶電子郵件（用於確認）
   * @returns 刪除結果
   */
  async deleteAccount(email: string): Promise<DeleteAccountResponse> {
    const request: DeleteAccountRequest = { email };
    const response = await api.delete<DeleteAccountResponse>("/api/auth/me", {
      data: request,
    });
    return response.data;
  },
};
