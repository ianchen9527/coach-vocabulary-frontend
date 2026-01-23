import { api } from "./api";
import type {
  TutorialSessionResponse,
  TutorialCompleteResponse,
} from "../types/api";

export const tutorialService = {
  /**
   * 取得教學 Session
   */
  async getSession(): Promise<TutorialSessionResponse> {
    const response = await api.get<TutorialSessionResponse>(
      "/api/tutorial/vocabulary"
    );
    return response.data;
  },

  /**
   * 完成教學
   */
  async complete(): Promise<TutorialCompleteResponse> {
    const response = await api.post<TutorialCompleteResponse>(
      "/api/tutorial/vocabulary/complete"
    );
    return response.data;
  },
};
