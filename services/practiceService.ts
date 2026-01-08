import { api } from "./api";
import type {
  PracticeSessionResponse,
  PracticeSubmitRequest,
  PracticeSubmitResponse,
  AnswerSchema,
} from "../types/api";

export const practiceService = {
  /**
   * 取得練習 Session
   */
  async getSession(): Promise<PracticeSessionResponse> {
    const response = await api.get<PracticeSessionResponse>(
      "/api/practice/session"
    );
    return response.data;
  },

  /**
   * 提交練習答案
   * @param answers 答案列表
   */
  async submit(answers: AnswerSchema[]): Promise<PracticeSubmitResponse> {
    const request: PracticeSubmitRequest = { answers };
    const response = await api.post<PracticeSubmitResponse>(
      "/api/practice/submit",
      request
    );
    return response.data;
  },
};
