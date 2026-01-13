import { api } from "./api";
import type {
  ReviewSessionResponse,
  ReviewCompleteRequest,
  ReviewCompleteResponse,
  AnswerSchema,
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
   * @param answers 答題歷史記錄
   */
  async complete(wordIds: string[], answers?: AnswerSchema[]): Promise<ReviewCompleteResponse> {
    const request: ReviewCompleteRequest = { word_ids: wordIds, answers };
    const response = await api.post<ReviewCompleteResponse>(
      "/api/review/complete",
      request
    );
    return response.data;
  },
};
