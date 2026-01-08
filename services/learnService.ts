import { api } from "./api";
import type {
  LearnSessionResponse,
  LearnCompleteRequest,
  LearnCompleteResponse,
} from "../types/api";

export const learnService = {
  /**
   * 取得學習 Session
   */
  async getSession(): Promise<LearnSessionResponse> {
    const response = await api.get<LearnSessionResponse>("/api/learn/session");
    return response.data;
  },

  /**
   * 完成學習
   * @param wordIds 已學習的單字 ID 列表
   */
  async complete(wordIds: string[]): Promise<LearnCompleteResponse> {
    const request: LearnCompleteRequest = { word_ids: wordIds };
    const response = await api.post<LearnCompleteResponse>(
      "/api/learn/complete",
      request
    );
    return response.data;
  },
};
