// === Auth ===
export interface LoginRequest {
  username: string;
}

export interface LoginResponse {
  id: string;
  username: string;
  created_at: string;
  is_new_user: boolean;
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
}

export interface ReviewCompleteResponse {
  success: boolean;
  words_completed: number;
  next_practice_time: string;
}

export interface ReviewSubmitRequest {
  answers: AnswerSchema[];
}

export interface ReviewSubmitResponse {
  success: boolean;
  results: AnswerResultSchema[];
  summary: {
    correct_count: number;
    incorrect_count: number;
    returned_to_p: number;
  };
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

// === Helpers ===
export function getExerciseCategory(type: ExerciseType): ExerciseCategory {
  if (type.startsWith("reading")) return "reading";
  if (type.startsWith("listening")) return "listening";
  return "speaking";
}
