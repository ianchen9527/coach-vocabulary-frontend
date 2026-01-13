import { api } from "./api";
import type {
  ReviewSessionResponse,
  ReviewCompleteRequest,
  ReviewCompleteResponse,
} from "../types/api";

export const reviewService = {
  /**
   * 取得複習 Session
   */
  async getSession(): Promise<ReviewSessionResponse> {
    const response = await api.get<ReviewSessionResponse>("/api/review/session");
    return response.data;
  },

  /**
   * 完成複習
   * @param wordIds 已複習的單字 ID 列表
   */
  async complete(wordIds: string[]): Promise<ReviewCompleteResponse> {
    const request: ReviewCompleteRequest = { word_ids: wordIds };
    const response = await api.post<ReviewCompleteResponse>(
      "/api/review/complete",
      request
    );
    return response.data;
  },
};
