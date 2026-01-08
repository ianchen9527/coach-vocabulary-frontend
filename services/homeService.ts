import { api } from "./api";
import type { StatsResponse, WordPoolResponse } from "../types/api";

export const homeService = {
  /**
   * 取得首頁統計資料
   */
  async getStats(): Promise<StatsResponse> {
    const response = await api.get<StatsResponse>("/api/home/stats");
    return response.data;
  },

  /**
   * 取得單字池詳情（Debug 用）
   */
  async getWordPool(): Promise<WordPoolResponse> {
    const response = await api.get<WordPoolResponse>("/api/home/word-pool");
    return response.data;
  },
};
