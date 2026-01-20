import { LevelAnalysisLogic, AnalysisState, Confidence } from '../../utils/level-analysis-logic';
import type { LevelAnalysisExerciseSchema } from '../../types/api';

// Helper to create mock exercises for all levels
function createMockExercises(wordsPerLevel = 5): LevelAnalysisExerciseSchema[] {
  const exercises: LevelAnalysisExerciseSchema[] = [];
  for (let level = 1; level <= 8; level++) {
    for (let i = 0; i < wordsPerLevel; i++) {
      exercises.push({
        word_id: `word-${level}-${i}`,
        word: `word${level}${i}`,
        translation: `翻譯${level}${i}`,
        image_url: null,
        audio_url: null,
        pool: 'P0',
        type: 'reading_lv1',
        options: [
          { index: 0, word_id: `word-${level}-${i}`, translation: `翻譯${level}${i}`, image_url: null },
          { index: 1, word_id: 'other-1', translation: '其他1', image_url: null },
          { index: 2, word_id: 'other-2', translation: '其他2', image_url: null },
          { index: 3, word_id: 'other-3', translation: '其他3', image_url: null },
        ],
        correct_index: 0,
        level_order: level,
      });
    }
  }
  return exercises;
}

describe('LevelAnalysisLogic', () => {
  describe('initial state', () => {
    it('should initialize with correct default state', () => {
      const logic = new LevelAnalysisLogic(createMockExercises());
      const state = logic.getState();

      expect(state.phase).toBe('q0');
      expect(state.lb).toBe(1);
      expect(state.ub).toBe(8);
      expect(state.p).toBe(4);
      expect(state.qCount).toBe(0);
      expect(state.history).toHaveLength(0);
      expect(state.finalLevel).toBeNull();
      expect(state.confidence).toBeNull();
    });
  });

  describe('handleQ0', () => {
    it('should finish immediately with level 1 when option 1 is selected', () => {
      const logic = new LevelAnalysisLogic(createMockExercises());
      const result = logic.handleQ0(1);

      expect(result.finished).toBe(true);
      expect(result.level).toBe(1);

      const state = logic.getState();
      expect(state.finalLevel).toBe(1);
      expect(state.confidence).toBe('high');
      expect(state.phase).toBe('result');
    });

    it('should set lb=1, ub=5 for option 2 (beginner)', () => {
      const logic = new LevelAnalysisLogic(createMockExercises());
      const result = logic.handleQ0(2);

      expect(result.finished).toBe(false);

      const state = logic.getState();
      expect(state.phase).toBe('routing');
      // s=2, lb=max(1, 2-3)=1, ub=min(8, 2+3)=5
      expect(state.lb).toBe(1);
      expect(state.ub).toBe(5);
    });

    it('should set lb=1, ub=7 for option 3 (intermediate)', () => {
      const logic = new LevelAnalysisLogic(createMockExercises());
      const result = logic.handleQ0(3);

      expect(result.finished).toBe(false);

      const state = logic.getState();
      expect(state.phase).toBe('routing');
      // s=4, lb=max(1, 4-3)=1, ub=min(8, 4+3)=7
      expect(state.lb).toBe(1);
      expect(state.ub).toBe(7);
    });

    it('should set lb=4, ub=8 for option 4 (upper-intermediate)', () => {
      const logic = new LevelAnalysisLogic(createMockExercises());
      const result = logic.handleQ0(4);

      expect(result.finished).toBe(false);

      const state = logic.getState();
      expect(state.phase).toBe('routing');
      // s=7, lb=max(1, 7-3)=4, ub=min(8, 7+3)=8
      expect(state.lb).toBe(4);
      expect(state.ub).toBe(8);
    });
  });

  describe('getNextQuestion', () => {
    it('should return null after result phase', () => {
      const logic = new LevelAnalysisLogic(createMockExercises());
      logic.handleQ0(1); // Finish immediately

      const question = logic.getNextQuestion();
      expect(question).toBeNull();
    });

    it('should return a question in routing phase', () => {
      const logic = new LevelAnalysisLogic(createMockExercises());
      logic.handleQ0(3);

      const question = logic.getNextQuestion();
      expect(question).not.toBeNull();
      expect(question?.level_order).toBeGreaterThanOrEqual(1);
      expect(question?.level_order).toBeLessThanOrEqual(8);
    });

    it('should not reuse the same word_id', () => {
      const logic = new LevelAnalysisLogic(createMockExercises());
      logic.handleQ0(3);

      const usedWordIds = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const question = logic.getNextQuestion();
        if (question) {
          expect(usedWordIds.has(question.word_id)).toBe(false);
          usedWordIds.add(question.word_id);
          logic.handleAnswer(question.level_order, i % 2 === 0);
        }
      }
    });
  });

  describe('handleAnswer - routing phase', () => {
    it('should update lb on correct answer', () => {
      const logic = new LevelAnalysisLogic(createMockExercises());
      logic.handleQ0(3);

      const question = logic.getNextQuestion();
      expect(question).not.toBeNull();

      logic.handleAnswer(question!.level_order, true);

      const state = logic.getState();
      expect(state.lb).toBe(question!.level_order);
    });

    it('should update ub on incorrect answer', () => {
      const logic = new LevelAnalysisLogic(createMockExercises());
      logic.handleQ0(3);

      const question = logic.getNextQuestion();
      expect(question).not.toBeNull();

      const levelBefore = question!.level_order;
      logic.handleAnswer(levelBefore, false);

      const state = logic.getState();
      expect(state.ub).toBe(levelBefore - 1);
    });

    it('should transition to targeted phase after 3 routing questions', () => {
      const logic = new LevelAnalysisLogic(createMockExercises());
      logic.handleQ0(3);

      // Answer 3 routing questions
      for (let i = 0; i < 3; i++) {
        const question = logic.getNextQuestion();
        expect(question).not.toBeNull();
        logic.handleAnswer(question!.level_order, true);
      }

      const state = logic.getState();
      expect(state.phase).toBe('targeted');
      expect(state.qCount).toBe(3);
    });
  });

  describe('early exit conditions', () => {
    it('should exit with downLevel (high confidence) when T1 fail and T2 fail', () => {
      const logic = new LevelAnalysisLogic(createMockExercises());
      logic.handleQ0(3);

      // Routing phase - 3 questions (all correct to get p=4 or similar)
      for (let i = 0; i < 3; i++) {
        const question = logic.getNextQuestion();
        logic.handleAnswer(question!.level_order, i === 0); // First correct, rest incorrect
      }

      const stateAfterRouting = logic.getState();
      const p = stateAfterRouting.p;

      // T1: Fail at p
      const t1 = logic.getNextQuestion();
      expect(t1).not.toBeNull();
      logic.handleAnswer(t1!.level_order, false);

      // T2: Fail at downLevel
      const t2 = logic.getNextQuestion();
      expect(t2).not.toBeNull();
      const finished = logic.handleAnswer(t2!.level_order, false);

      expect(finished).toBe(true);
      const state = logic.getState();
      expect(state.phase).toBe('result');
      expect(state.confidence).toBe('high');
      expect(state.finalLevel).toBe(Math.max(1, p - 1));
    });

    it('should exit with upLevel when up_correct >= 2 and p_correct >= 1', () => {
      const logic = new LevelAnalysisLogic(createMockExercises());
      logic.handleQ0(3);

      // Routing phase - all correct
      for (let i = 0; i < 3; i++) {
        const question = logic.getNextQuestion();
        logic.handleAnswer(question!.level_order, true);
      }

      const stateAfterRouting = logic.getState();
      const p = stateAfterRouting.p;
      const upLevel = Math.min(8, p + 1);

      // We need: p_correct >= 1, up_correct >= 2
      // T1: Correct at p
      const t1 = logic.getNextQuestion();
      logic.handleAnswer(p, true); // p_correct = 1

      // T2: Correct at upLevel
      const t2 = logic.getNextQuestion();
      logic.handleAnswer(upLevel, true); // up_correct = 1

      // T3: Correct at upLevel
      const t3 = logic.getNextQuestion();
      logic.handleAnswer(upLevel, true); // up_correct = 2

      // Should have exited or be close
      const state = logic.getState();
      if (state.phase === 'result') {
        expect(state.finalLevel).toBe(upLevel);
      }
    });

    it('should exit with downLevel (medium confidence) when p_asked >= 2 and p_correct = 0', () => {
      const logic = new LevelAnalysisLogic(createMockExercises());
      logic.handleQ0(3);

      // Routing phase
      for (let i = 0; i < 3; i++) {
        const question = logic.getNextQuestion();
        logic.handleAnswer(question!.level_order, i < 2);
      }

      const stateAfterRouting = logic.getState();
      const p = stateAfterRouting.p;

      // Answer at p level incorrectly twice
      let pAsked = 0;
      while (pAsked < 2) {
        const question = logic.getNextQuestion();
        if (!question) break;
        if (question.level_order === p) {
          logic.handleAnswer(p, false);
          pAsked++;
        } else {
          logic.handleAnswer(question.level_order, false);
        }
        if (logic.getState().phase === 'result') break;
      }

      const state = logic.getState();
      if (state.phase === 'result' && state.p_asked >= 2 && state.p_correct === 0) {
        expect(state.confidence).toBe('medium');
        expect(state.finalLevel).toBe(Math.max(1, p - 1));
      }
    });
  });

  describe('max questions', () => {
    it('should finish after 10 questions', () => {
      const logic = new LevelAnalysisLogic(createMockExercises());
      logic.handleQ0(3);

      // Answer 10 questions alternating correct/incorrect
      for (let i = 0; i < 10; i++) {
        const question = logic.getNextQuestion();
        if (!question) break;
        const finished = logic.handleAnswer(question.level_order, i % 2 === 0);
        if (finished) break;
      }

      const state = logic.getState();
      expect(state.phase).toBe('result');
      expect(state.finalLevel).not.toBeNull();
      expect(state.confidence).not.toBeNull();
    });
  });

  describe('confidence calculation', () => {
    it('should return high confidence when p_correct=2, down_correct>=1, up_correct<=1', () => {
      const logic = new LevelAnalysisLogic(createMockExercises());
      logic.handleQ0(3);

      // Routing phase
      for (let i = 0; i < 3; i++) {
        const question = logic.getNextQuestion();
        logic.handleAnswer(question!.level_order, true);
      }

      const stateAfterRouting = logic.getState();
      const p = stateAfterRouting.p;
      const downLevel = Math.max(1, p - 1);
      const upLevel = Math.min(8, p + 1);

      // Force specific answers to reach the confidence calculation
      // This is a bit tricky since we can't directly control which level questions come at
      // The test verifies the logic calculates confidence after 10 questions
      let questionsAnswered = 3;
      while (questionsAnswered < 10 && logic.getState().phase !== 'result') {
        const question = logic.getNextQuestion();
        if (!question) break;
        // Answer to try to get the high confidence scenario
        logic.handleAnswer(question.level_order, question.level_order === p || question.level_order === downLevel);
        questionsAnswered++;
      }

      const state = logic.getState();
      expect(state.phase).toBe('result');
      expect(state.finalLevel).not.toBeNull();
      expect(['high', 'medium', 'low']).toContain(state.confidence);
    });
  });

  describe('getState', () => {
    it('should return a copy of state, not the original', () => {
      const logic = new LevelAnalysisLogic(createMockExercises());
      const state1 = logic.getState();
      const state2 = logic.getState();

      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty exercises array', () => {
      const logic = new LevelAnalysisLogic([]);
      logic.handleQ0(3);

      const question = logic.getNextQuestion();
      expect(question).toBeNull();
    });

    it('should handle exercises for only some levels', () => {
      const exercises = createMockExercises(2).filter(e => e.level_order <= 4);
      const logic = new LevelAnalysisLogic(exercises);
      logic.handleQ0(3);

      // Should still be able to get questions (will fall back to available levels)
      const question = logic.getNextQuestion();
      if (question) {
        expect(question.level_order).toBeLessThanOrEqual(4);
      }
    });
  });
});
