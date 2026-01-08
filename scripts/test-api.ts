#!/usr/bin/env npx ts-node

/**
 * Coach Vocabulary API 測試腳本
 *
 * 這個腳本會測試所有後端 API 端點，確認格式和行為正確。
 * 在串接前端之前先執行此腳本驗證。
 *
 * 使用方式:
 *   npx ts-node scripts/test-api.ts
 *
 * 前置條件:
 *   確保後端 API 正在 http://localhost:8000 執行
 */

const API_BASE = "http://localhost:8000";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  response?: unknown;
}

const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

function log(color: string, ...args: unknown[]) {
  console.log(color, ...args, colors.reset);
}

// === 測試用例 ===

async function testLogin(): Promise<TestResult> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "api_test_user" }),
    });
    const data = await response.json();

    const passed =
      response.ok &&
      typeof data.id === "string" &&
      typeof data.username === "string" &&
      typeof data.is_new_user === "boolean" &&
      typeof data.created_at === "string";

    return {
      name: "POST /api/auth/login",
      passed,
      response: data,
      error: passed ? undefined : `回應格式不符預期: ${JSON.stringify(data)}`,
    };
  } catch (error) {
    return {
      name: "POST /api/auth/login",
      passed: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function testHomeStats(userId: string): Promise<TestResult> {
  try {
    const response = await fetch(`${API_BASE}/api/home/stats`, {
      headers: { "X-User-Id": userId },
    });
    const data = await response.json();

    const passed =
      response.ok &&
      typeof data.today_learned === "number" &&
      typeof data.available_practice === "number" &&
      typeof data.available_review === "number" &&
      typeof data.upcoming_24h === "number" &&
      typeof data.can_learn === "boolean" &&
      typeof data.can_practice === "boolean" &&
      typeof data.can_review === "boolean";

    return {
      name: "GET /api/home/stats",
      passed,
      response: data,
      error: passed ? undefined : `回應格式不符預期: ${JSON.stringify(data)}`,
    };
  } catch (error) {
    return {
      name: "GET /api/home/stats",
      passed: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function testLearnSession(userId: string): Promise<TestResult> {
  try {
    const response = await fetch(`${API_BASE}/api/learn/session`, {
      headers: { "X-User-Id": userId },
    });
    const data = await response.json();

    const passed =
      response.ok &&
      typeof data.available === "boolean" &&
      Array.isArray(data.words) &&
      Array.isArray(data.exercises);

    // 驗證單字格式
    if (passed && data.words.length > 0) {
      const word = data.words[0];
      const wordValid =
        typeof word.id === "string" &&
        typeof word.word === "string" &&
        typeof word.translation === "string";

      if (!wordValid) {
        return {
          name: "GET /api/learn/session",
          passed: false,
          response: data,
          error: `單字格式不符預期: ${JSON.stringify(word)}`,
        };
      }
    }

    // 驗證練習題格式
    if (passed && data.exercises.length > 0) {
      const exercise = data.exercises[0];
      const exerciseValid =
        typeof exercise.word_id === "string" &&
        typeof exercise.type === "string" &&
        Array.isArray(exercise.options);

      if (!exerciseValid) {
        return {
          name: "GET /api/learn/session",
          passed: false,
          response: data,
          error: `練習題格式不符預期: ${JSON.stringify(exercise)}`,
        };
      }
    }

    return {
      name: "GET /api/learn/session",
      passed,
      response: {
        available: data.available,
        reason: data.reason,
        wordsCount: data.words?.length || 0,
        exercisesCount: data.exercises?.length || 0,
      },
      error: passed ? undefined : `回應格式不符預期`,
    };
  } catch (error) {
    return {
      name: "GET /api/learn/session",
      passed: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function testLearnComplete(
  userId: string,
  wordIds: string[]
): Promise<TestResult> {
  try {
    const response = await fetch(`${API_BASE}/api/learn/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": userId,
      },
      body: JSON.stringify({ word_ids: wordIds }),
    });
    const data = await response.json();

    const passed =
      response.ok &&
      data.success === true &&
      typeof data.words_moved === "number" &&
      typeof data.today_learned === "number";

    return {
      name: "POST /api/learn/complete",
      passed,
      response: data,
      error: passed ? undefined : `回應格式不符預期: ${JSON.stringify(data)}`,
    };
  } catch (error) {
    return {
      name: "POST /api/learn/complete",
      passed: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function testPracticeSession(userId: string): Promise<TestResult> {
  try {
    const response = await fetch(`${API_BASE}/api/practice/session`, {
      headers: { "X-User-Id": userId },
    });
    const data = await response.json();

    const passed =
      response.ok &&
      typeof data.available === "boolean" &&
      Array.isArray(data.exercises);

    // 驗證練習題格式（包含單字資訊）
    if (passed && data.exercises.length > 0) {
      const exercise = data.exercises[0];
      const exerciseValid =
        typeof exercise.word_id === "string" &&
        typeof exercise.type === "string" &&
        typeof exercise.word === "string" &&
        typeof exercise.translation === "string" &&
        typeof exercise.pool === "string" &&
        Array.isArray(exercise.options);

      if (!exerciseValid) {
        return {
          name: "GET /api/practice/session",
          passed: false,
          response: data,
          error: `練習題格式不符預期: ${JSON.stringify(exercise)}`,
        };
      }
    }

    return {
      name: "GET /api/practice/session",
      passed,
      response: {
        available: data.available,
        reason: data.reason,
        exercisesCount: data.exercises?.length || 0,
        exerciseOrder: data.exercise_order,
      },
      error: passed ? undefined : `回應格式不符預期`,
    };
  } catch (error) {
    return {
      name: "GET /api/practice/session",
      passed: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function testPracticeSubmit(
  userId: string,
  answers: { word_id: string; correct: boolean }[]
): Promise<TestResult> {
  try {
    const response = await fetch(`${API_BASE}/api/practice/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": userId,
      },
      body: JSON.stringify({ answers }),
    });
    const data = await response.json();

    const passed =
      response.ok &&
      data.success === true &&
      Array.isArray(data.results) &&
      typeof data.summary === "object" &&
      typeof data.summary.correct_count === "number" &&
      typeof data.summary.incorrect_count === "number";

    // 驗證結果格式
    if (passed && data.results.length > 0) {
      const result = data.results[0];
      const resultValid =
        typeof result.word_id === "string" &&
        typeof result.correct === "boolean" &&
        typeof result.previous_pool === "string" &&
        typeof result.new_pool === "string" &&
        typeof result.next_available_time === "string";

      if (!resultValid) {
        return {
          name: "POST /api/practice/submit",
          passed: false,
          response: data,
          error: `結果格式不符預期: ${JSON.stringify(result)}`,
        };
      }
    }

    return {
      name: "POST /api/practice/submit",
      passed,
      response: data,
      error: passed ? undefined : `回應格式不符預期`,
    };
  } catch (error) {
    return {
      name: "POST /api/practice/submit",
      passed: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function testReviewSession(userId: string): Promise<TestResult> {
  try {
    const response = await fetch(`${API_BASE}/api/review/session`, {
      headers: { "X-User-Id": userId },
    });
    const data = await response.json();

    const passed =
      response.ok &&
      typeof data.available === "boolean" &&
      Array.isArray(data.words) &&
      Array.isArray(data.exercises);

    return {
      name: "GET /api/review/session",
      passed,
      response: {
        available: data.available,
        reason: data.reason,
        wordsCount: data.words?.length || 0,
        exercisesCount: data.exercises?.length || 0,
      },
      error: passed ? undefined : `回應格式不符預期`,
    };
  } catch (error) {
    return {
      name: "GET /api/review/session",
      passed: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function testHealthCheck(): Promise<TestResult> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    const passed = response.ok;

    return {
      name: "GET /health",
      passed,
      error: passed ? undefined : `Status: ${response.status}`,
    };
  } catch (error) {
    return {
      name: "GET /health",
      passed: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// === 主程式 ===

async function runAllTests() {
  log(colors.bold + colors.blue, "\n========================================");
  log(colors.bold + colors.blue, "  Coach Vocabulary API 測試");
  log(colors.bold + colors.blue, "========================================\n");

  const results: TestResult[] = [];

  // 1. Health Check
  log(colors.yellow, "檢查伺服器狀態...\n");
  const healthResult = await testHealthCheck();
  results.push(healthResult);

  if (!healthResult.passed) {
    log(colors.red, "❌ 伺服器未啟動或無法連線");
    log(colors.yellow, "\n請確保後端 API 正在執行:");
    log(colors.reset, "  cd ../coach-vocabulary-backend");
    log(colors.reset, "  uvicorn app.main:app --reload");
    process.exit(1);
  }

  log(colors.green, "✓ 伺服器已啟動\n");

  // 2. Login
  log(colors.bold, "=== 認證測試 ===\n");
  const loginResult = await testLogin();
  results.push(loginResult);
  printResult(loginResult);

  if (!loginResult.passed || !loginResult.response) {
    log(colors.red, "\n登入失敗，無法繼續測試");
    printSummary(results);
    process.exit(1);
  }

  const userId = (loginResult.response as { id: string }).id;
  log(colors.blue, `  User ID: ${userId}\n`);

  // 3. Home Stats
  log(colors.bold, "=== 首頁統計測試 ===\n");
  const statsResult = await testHomeStats(userId);
  results.push(statsResult);
  printResult(statsResult);

  // 4. Learn Session
  log(colors.bold, "\n=== 學習 Session 測試 ===\n");
  const learnSessionResult = await testLearnSession(userId);
  results.push(learnSessionResult);
  printResult(learnSessionResult);

  // 5. Learn Complete (如果有可學習的單字)
  if (
    learnSessionResult.passed &&
    learnSessionResult.response &&
    (learnSessionResult.response as { wordsCount: number }).wordsCount > 0
  ) {
    // 需要先取得完整的 session 資料
    const sessionResponse = await fetch(`${API_BASE}/api/learn/session`, {
      headers: { "X-User-Id": userId },
    });
    const sessionData = await sessionResponse.json();

    if (sessionData.available && sessionData.words?.length > 0) {
      const wordIds = sessionData.words.map((w: { id: string }) => w.id);
      const completeResult = await testLearnComplete(userId, wordIds);
      results.push(completeResult);
      printResult(completeResult);
    }
  }

  // 6. Practice Session
  log(colors.bold, "\n=== 練習 Session 測試 ===\n");
  const practiceSessionResult = await testPracticeSession(userId);
  results.push(practiceSessionResult);
  printResult(practiceSessionResult);

  // 7. Review Session
  log(colors.bold, "\n=== 複習 Session 測試 ===\n");
  const reviewSessionResult = await testReviewSession(userId);
  results.push(reviewSessionResult);
  printResult(reviewSessionResult);

  // Summary
  printSummary(results);
}

function printResult(result: TestResult) {
  const icon = result.passed ? "✓" : "✗";
  const color = result.passed ? colors.green : colors.red;

  log(color, `  ${icon} ${result.name}`);

  if (result.response) {
    log(colors.reset, `    回應: ${JSON.stringify(result.response, null, 2).split('\n').join('\n    ')}`);
  }

  if (result.error) {
    log(colors.yellow, `    錯誤: ${result.error}`);
  }
}

function printSummary(results: TestResult[]) {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  log(colors.bold + colors.blue, "\n========================================");
  log(colors.bold + colors.blue, "  測試結果摘要");
  log(colors.bold + colors.blue, "========================================\n");

  log(colors.reset, `  總共: ${total}`);
  log(colors.green, `  通過: ${passed}`);
  log(colors.red, `  失敗: ${failed}`);

  if (failed > 0) {
    log(colors.bold + colors.red, "\n失敗的測試:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        log(colors.red, `  - ${r.name}: ${r.error}`);
      });
  }

  log(
    colors.reset,
    `\n${failed === 0 ? "🎉 所有測試通過！" : "❌ 部分測試失敗"}\n`
  );

  process.exit(failed === 0 ? 0 : 1);
}

// 執行測試
runAllTests().catch((error) => {
  log(colors.red, "測試執行錯誤:", error);
  process.exit(1);
});
