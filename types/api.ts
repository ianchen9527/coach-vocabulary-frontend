// === Auth ===
export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  id: string;
  email: string;
  username: string;
  access_token: string;
  token_type: string;
}

export interface UserInfo {
  id: string;
  email: string;
  username: string;
}

export interface DeleteAccountRequest {
  email: string;
}

export interface DeleteAccountResponse {
  success: boolean;
  message: string;
  deleted_at: string;
}

// === Home ===
export interface StatsResponse {
  today_learned: number;
  available_practice: number;
  available_review: number;
  upcoming_24h: number;
  can_learn: boolean;
  can_practice: boolean;
  can_review: boolean;
  next_available_time: string | null;
  current_level: {
    id: number;
    order: number;
    label: string;
  } | null;
  current_category: {
    id: number;
    order: number;
    label: string;
  } | null;
}

export interface WordPoolItem {
  word_id: string;
  word: string;
  translation: string;
  next_available_time: string | null;
}

export interface WordPoolResponse {
  pools: Record<string, WordPoolItem[]>;
  total_count: number;
}

// === Common ===
export interface OptionSchema {
  index: number;
  word_id: string;
  translation: string;
  image_url: string | null;
}

export interface WordDetailSchema {
  id: string;
  word: string;
  translation: string;
  sentence: string | null;
  sentence_zh: string | null;
  image_url: string | null;
  audio_url: string | null;
}

export interface ExerciseSchema {
  word_id: string;
  type: ExerciseType;
  options: OptionSchema[];
  correct_index: number | null;
}

export interface ExerciseWithWordSchema extends ExerciseSchema {
  word: string;
  translation: string;
  image_url: string | null;
  audio_url: string | null;
  pool: string;
}

export interface AnswerSchema {
  word_id: string;
  correct: boolean;
  exercise_type: string;      // 練習類型
  user_answer?: string;       // 使用者的回答內容
  response_time_ms?: number;  // 回答花費時間（毫秒）
}

export interface AnswerResultSchema {
  word_id: string;
  correct: boolean;
  previous_pool: string;
  new_pool: string;
  next_available_time: string;
}

// === Learn ===
export interface LearnSessionResponse {
  available: boolean;
  reason: string | null;
  words: WordDetailSchema[];
  exercises: ExerciseSchema[];
}

export interface LearnCompleteRequest {
  word_ids: string[];
  answers?: AnswerSchema[];
}

export interface LearnCompleteResponse {
  success: boolean;
  words_moved: number;
  today_learned: number;
}

// === Practice ===
export interface PracticeSessionResponse {
  available: boolean;
  reason: string | null;
  exercises: ExerciseWithWordSchema[];
  exercise_order: string[];
}

export interface PracticeSubmitRequest {
  answers: AnswerSchema[];
}

export interface PracticeSubmitResponse {
  success: boolean;
  results: AnswerResultSchema[];
  summary: {
    correct_count: number;
    incorrect_count: number;
  };
}

// === Review ===
export interface ReviewSessionResponse {
  available: boolean;
  reason: string | null;
  words: (WordDetailSchema & { pool: string })[];
  exercises: ExerciseSchema[];
}

export interface ReviewCompleteRequest {
  word_ids: string[];
  answers?: AnswerSchema[];
}

export interface ReviewCompleteResponse {
  success: boolean;
  words_completed: number;
  next_practice_time: string;
}

// === Admin ===
export interface ResetCooldownResponse {
  success: boolean;
  words_affected: number;
}

// === Types ===
export type PoolType =
  | "P0" | "P1" | "P2" | "P3" | "P4" | "P5" | "P6"
  | "R1" | "R2" | "R3" | "R4" | "R5";

export type ExerciseType =
  | "reading_lv1"
  | "reading_lv2"
  | "listening_lv1"
  | "listening_lv2"
  | "speaking_lv1"
  | "speaking_lv2";

export type SessionMode = "learn" | "practice" | "review";

export type ExerciseCategory = "reading" | "listening" | "speaking";

// === Level Analysis ===
export interface LevelAnalysisExerciseSchema extends ExerciseWithWordSchema {
  level_order: number;
}

export interface LevelAnalysisSessionResponse {
  exercises: LevelAnalysisExerciseSchema[];
}

export interface LevelAnalysisSubmitRequest {
  level_order: number;
}

export interface LevelAnalysisSubmitResponse {
  success: boolean;
  current_level: {
    id: number;
    order: number;
    label: string;
  } | null;
  current_category: {
    id: number;
    order: number;
    label: string;
  } | null;
}

// === Helpers ===
export function getExerciseCategory(type: ExerciseType): ExerciseCategory {
  if (type.startsWith("reading")) return "reading";
  if (type.startsWith("listening")) return "listening";
  return "speaking";
}
