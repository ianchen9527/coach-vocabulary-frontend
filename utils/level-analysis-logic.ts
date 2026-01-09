import type { LevelAnalysisExerciseSchema } from "../types/api";

export type Confidence = "high" | "medium" | "low";

export interface AnalysisState {
    phase: "q0" | "routing" | "targeted" | "result";
    lb: number;
    ub: number;
    p: number;
    qCount: number; // Q1-Q10 (Q0 not included)
    history: { level: number; correct: boolean }[];
    p_asked: number;
    p_correct: number;
    up_asked: number;
    up_correct: number;
    down_asked: number;
    down_correct: number;
    finalLevel: number | null;
    confidence: Confidence | null;
}

export class LevelAnalysisLogic {
    private state: AnalysisState;
    private exercisesByLevel: Map<number, LevelAnalysisExerciseSchema[]>;
    private usedWordIds: Set<string> = new Set();

    constructor(exercises: LevelAnalysisExerciseSchema[]) {
        this.state = {
            phase: "q0",
            lb: 1,
            ub: 8,
            p: 4,
            qCount: 0,
            history: [],
            p_asked: 0,
            p_correct: 0,
            up_asked: 0,
            up_correct: 0,
            down_asked: 0,
            down_correct: 0,
            finalLevel: null,
            confidence: null,
        };

        this.exercisesByLevel = new Map();
        exercises.forEach((ex) => {
            const level = ex.level_order;
            if (!this.exercisesByLevel.has(level)) {
                this.exercisesByLevel.set(level, []);
            }
            this.exercisesByLevel.get(level)!.push(ex);
        });
    }

    getState() {
        return { ...this.state };
    }

    /**
     * Q0 Behavior
     */
    handleQ0(selection: number): { finished: boolean; level?: number } {
        if (selection === 1) {
            this.state.finalLevel = 1;
            this.state.confidence = "high";
            this.state.phase = "result";
            return { finished: true, level: 1 };
        }

        let s = 4;
        if (selection === 2) s = 2;
        if (selection === 3) s = 4;
        if (selection === 4) s = 7;

        this.state.lb = Math.max(1, s - 3);
        this.state.ub = Math.min(8, s + 3);
        this.state.phase = "routing";
        return { finished: false };
    }

    /**
     * Get Next Question Level and Question
     */
    getNextQuestion(): LevelAnalysisExerciseSchema | null {
        if (this.state.phase === "result") return null;

        let targetLevel = 1;

        if (this.state.phase === "routing") {
            targetLevel = Math.ceil((this.state.lb + this.state.ub) / 2);
        } else if (this.state.phase === "targeted") {
            targetLevel = this.getTargetedNextLevel();
        }

        return this.findUnusedQuestion(targetLevel);
    }

    private getTargetedNextLevel(): number {
        const { p, p_asked, p_correct, up_asked, up_correct, history } = this.state;
        const upLevel = Math.min(8, p + 1);
        const downLevel = Math.max(1, p - 1);

        const questions = history.slice(3); // Q4 onwards

        // T1 (Q4)
        if (questions.length === 0) return p;

        // T1 was incorrect
        if (questions[0] && !questions[0].correct) {
            // T2 (Q5)
            if (questions.length === 1) return downLevel;
            // T3 (Q6)
            if (questions.length === 2 && questions[1].correct) return p;
        }

        // T1 was correct
        if (questions[0] && questions[0].correct) {
            // T2 (Q5)
            if (questions.length === 1) return upLevel;
            // T3 (Q6)
            if (questions.length === 2) {
                if (questions[1].correct) return upLevel;
                return downLevel;
            }
        }

        // Reinforcement logic for Upgrade
        if (up_correct >= 2 && p_correct >= 1 && upLevel !== p && up_correct < 3) {
            return upLevel;
        }

        // Default to P if we are just filling up to 10 questions
        return p;
    }

    private findUnusedQuestion(level: number): LevelAnalysisExerciseSchema | null {
        const sequence = [level, level - 1, level + 1, level - 2, level + 2]
            .filter((l) => l >= 1 && l <= 8);

        for (const l of sequence) {
            const pool = this.exercisesByLevel.get(l) || [];
            const available = pool.filter((q) => !this.usedWordIds.has(q.word_id));
            if (available.length > 0) {
                const selected = available[Math.floor(Math.random() * available.length)];
                this.usedWordIds.add(selected.word_id);
                return selected;
            }
        }
        return null;
    }

    /**
     * Handle Answer
     */
    handleAnswer(level: number, correct: boolean): boolean {
        this.state.qCount++;
        this.state.history.push({ level, correct });

        if (this.state.phase === "routing") {
            this.updateRouting(level, correct);
            if (this.state.qCount >= 3) {
                this.state.p = this.state.lb;
                this.state.phase = "targeted";
            }
        } else if (this.state.phase === "targeted") {
            this.updateTargeted(level, correct);
        }

        return this.checkEarlyExit();
    }

    private updateRouting(m: number, correct: boolean) {
        if (correct) {
            this.state.lb = m;
        } else {
            this.state.ub = m - 1;
        }
        if (this.state.ub < this.state.lb) {
            this.state.ub = this.state.lb;
        }
    }

    private updateTargeted(level: number, correct: boolean) {
        const { p } = this.state;
        const upLevel = Math.min(8, p + 1);
        const downLevel = Math.max(1, p - 1);

        if (level === p) {
            this.state.p_asked++;
            if (correct) this.state.p_correct++;
        } else if (level === upLevel && level !== p) {
            this.state.up_asked++;
            if (correct) this.state.up_correct++;
        } else if (level === downLevel && level !== p) {
            this.state.down_asked++;
            if (correct) this.state.down_correct++;
        }
    }

    private checkEarlyExit(): boolean {
        const { p, p_asked, p_correct, up_asked, up_correct, qCount } = this.state;
        const upLevel = Math.min(8, p + 1);
        const downLevel = Math.max(1, p - 1);

        // Targeted Branching Specific Endings
        if (p_asked === 1 && p_correct === 0) {
            const targetedHistory = this.state.history.slice(3);
            if (targetedHistory.length === 2 && !targetedHistory[1].correct) {
                // T1 fail, T2 fail -> End
                this.setResult(downLevel, "high");
                return true;
            }
            if (targetedHistory.length === 3 && targetedHistory[1].correct && !targetedHistory[2].correct) {
                // T1 fail, T2 correct, T3 fail -> End
                this.setResult(downLevel, "medium");
                return true;
            }
        }

        // Upgrade Rule
        if (up_correct >= 2 && p_correct >= 1) {
            if (qCount < 10 && upLevel !== p && up_correct < 3) {
                // Can reinforce with one more upLevel
                return false;
            }
            this.setResult(upLevel, up_correct === 3 ? "high" : "medium");
            return true;
        }

        // Downgrade Rule
        if (p_asked >= 2 && p_correct === 0) {
            this.setResult(downLevel, "medium");
            return true;
        }

        // Max Questions
        if (qCount >= 10) {
            this.calculateFinalResult();
            return true;
        }

        return false;
    }

    private calculateFinalResult() {
        const { p, p_correct, down_correct, up_correct } = this.state;
        this.state.finalLevel = p;
        this.state.phase = "result";

        if (p_correct === 2 && down_correct >= 1 && up_correct <= 1) {
            this.state.confidence = "high";
        } else if (
            (up_correct >= 2 && p_correct === 0) ||
            (down_correct === 0 && p_correct === 0) // Prompt says "down_correct=0 and p_correct very low"
        ) {
            this.state.confidence = "low";
        } else if (p_correct >= 1) {
            this.state.confidence = "medium";
        } else {
            this.state.confidence = "low"; // Fallback for very low performance
        }
    }

    private setResult(level: number, confidence: Confidence) {
        this.state.finalLevel = level;
        this.state.confidence = confidence;
        this.state.phase = "result";
    }
}
