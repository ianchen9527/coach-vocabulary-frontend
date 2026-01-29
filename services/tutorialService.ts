import { api } from "./api";
import type {
  TutorialItemType,
  TutorialStatusResponse,
  TutorialItemCompleteResponse,
} from "../types/api";

export const tutorialService = {
  /**
   * 取得教學狀態（所有項目完成狀態 + 練習資料）
   */
  async getStatus(): Promise<TutorialStatusResponse> {
    const response = await api.get<TutorialStatusResponse>(
      "/api/tutorial/status"
    );
    return response.data;
  },

  /**
   * 完成單一教學項目
   */
  async completeItem(type: TutorialItemType): Promise<TutorialItemCompleteResponse> {
    const response = await api.post<TutorialItemCompleteResponse>(
      "/api/tutorial/complete",
      { type }
    );
    return response.data;
  },
};
