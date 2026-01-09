import { api } from "./api";
import type {
    LevelAnalysisSessionResponse,
    LevelAnalysisSubmitRequest,
    LevelAnalysisSubmitResponse,
} from "../types/api";

export const analysisService = {
    /**
     * 取得程度分析 Session
     */
    async getSession(): Promise<LevelAnalysisSessionResponse> {
        const response = await api.get<LevelAnalysisSessionResponse>(
            "/api/level-analysis/session"
        );
        return response.data;
    },

    /**
     * 提交程度分析結果
     * @param levelOrder 等級順序 (1-8)
     */
    async submit(levelOrder: number): Promise<LevelAnalysisSubmitResponse> {
        const request: LevelAnalysisSubmitRequest = { level_order: levelOrder };
        const response = await api.post<LevelAnalysisSubmitResponse>(
            "/api/level-analysis/submit",
            request
        );
        return response.data;
    },
};
