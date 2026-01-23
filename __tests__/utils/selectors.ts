import { screen, within } from '@testing-library/react-native';

/**
 * Helpers for finding exercise UI elements by accessibility
 */
export const exerciseScreen = {
  // Exercise header
  getTitle: () => screen.getByRole('header'),
  queryTitle: () => screen.queryByRole('header'),
  getBackButton: () => screen.getByLabelText(/back|返回/i),
  queryBackButton: () => screen.queryByLabelText(/back|返回/i),

  // Progress
  getProgressText: () => screen.getByText(/\d+\s*\/\s*\d+/),
  queryProgressText: () => screen.queryByText(/\d+\s*\/\s*\d+/),

  // Word display
  getWordText: (word: string) => screen.getByText(word),
  queryWordText: (word: string) => screen.queryByText(word),
  getTranslationText: (translation: string) => screen.getByText(translation),
  queryTranslationText: (translation: string) => screen.queryByText(translation),

  // Options
  getOptions: () => screen.getAllByRole('button'),
  getOptionByText: (text: string) => screen.getByText(text),
  queryOptionByText: (text: string) => screen.queryByText(text),
  getOptionButtons: () => screen.getAllByRole('button'),

  // Countdown / Timer
  getCountdown: () => screen.getByText(/\d+\.\d+/),
  queryCountdown: () => screen.queryByText(/\d+\.\d+/),

  // Result indicators
  getCorrectIndicator: () => screen.getByText(/正確|correct/i),
  queryCorrectIndicator: () => screen.queryByText(/正確|correct/i),
  getIncorrectIndicator: () => screen.getByText(/錯誤|incorrect/i),
  queryIncorrectIndicator: () => screen.queryByText(/錯誤|incorrect/i),

  // Speaking-specific
  getMicButton: () => screen.getByLabelText(/麥克風|microphone|mic/i),
  queryMicButton: () => screen.queryByLabelText(/麥克風|microphone|mic/i),
  getRecordingIndicator: () => screen.getByText(/錄音中|recording/i),
  queryRecordingIndicator: () => screen.queryByText(/錄音中|recording/i),
  getStopButton: () => screen.getByText(/完成|stop/i),
  queryStopButton: () => screen.queryByText(/完成|stop/i),
  getVerifyingText: () => screen.getByText(/驗證中|verifying/i),
  queryVerifyingText: () => screen.queryByText(/驗證中|verifying/i),

  // Completion screen
  getCompleteTitle: () => screen.getByText(/完成|complete/i),
  queryCompleteTitle: () => screen.queryByText(/完成|complete/i),
  getContinueButton: () => screen.getByText(/繼續|continue|確定|ok/i),
  queryContinueButton: () => screen.queryByText(/繼續|continue|確定|ok/i),

  // Loading
  getLoadingIndicator: () => screen.getByText(/載入中|loading/i),
  queryLoadingIndicator: () => screen.queryByText(/載入中|loading/i),

  // Intro screen
  getStartButton: () => screen.getByText(/開始|start/i),
  queryStartButton: () => screen.queryByText(/開始|start/i),

  // Audio
  getPlayingIndicator: () => screen.getByText(/播放中/i),
  queryPlayingIndicator: () => screen.queryByText(/播放中/i),
  getPlayedIndicator: () => screen.getByText(/已播放/i),
  queryPlayedIndicator: () => screen.queryByText(/已播放/i),
};

/**
 * Helpers for finding auth screen elements by accessibility
 */
export const authScreen = {
  // Form fields
  getEmailInput: () => screen.getByPlaceholderText(/email|電子郵件/i),
  queryEmailInput: () => screen.queryByPlaceholderText(/email|電子郵件/i),
  getPasswordInput: () => screen.getByPlaceholderText(/password|密碼/i),
  queryPasswordInput: () => screen.queryByPlaceholderText(/password|密碼/i),
  getUsernameInput: () => screen.getByPlaceholderText(/username|使用者名稱|用戶名/i),
  queryUsernameInput: () => screen.queryByPlaceholderText(/username|使用者名稱|用戶名/i),

  // Buttons
  getLoginButton: () => screen.getByText(/登入|login|sign in/i),
  queryLoginButton: () => screen.queryByText(/登入|login|sign in/i),
  getRegisterButton: () => screen.getByText(/註冊|register|sign up/i),
  queryRegisterButton: () => screen.queryByText(/註冊|register|sign up/i),
  getLogoutButton: () => screen.getByText(/登出|logout|sign out/i),
  queryLogoutButton: () => screen.queryByText(/登出|logout|sign out/i),

  // Error messages
  getErrorMessage: () => screen.getByRole('alert'),
  queryErrorMessage: () => screen.queryByRole('alert'),
  getErrorText: (message: string) => screen.getByText(message),
  queryErrorText: (message: string) => screen.queryByText(message),

  // Links
  getRegisterLink: () => screen.getByText(/沒有帳號|create account|sign up/i),
  queryRegisterLink: () => screen.queryByText(/沒有帳號|create account|sign up/i),
  getLoginLink: () => screen.getByText(/已有帳號|already have|sign in/i),
  queryLoginLink: () => screen.queryByText(/已有帳號|already have|sign in/i),

  // Loading state
  getSubmitLoading: () => screen.getByText(/loading|處理中/i),
  querySubmitLoading: () => screen.queryByText(/loading|處理中/i),
};

/**
 * Helpers for finding home screen elements
 */
export const homeScreen = {
  // Stats
  getTodayLearnedCount: () => screen.getByLabelText(/today.*(learned|學習)/i),
  queryTodayLearnedCount: () => screen.queryByLabelText(/today.*(learned|學習)/i),

  // Action buttons
  getLearnButton: () => screen.getByText(/學習|learn/i),
  queryLearnButton: () => screen.queryByText(/學習|learn/i),
  getPracticeButton: () => screen.getByText(/練習|practice/i),
  queryPracticeButton: () => screen.queryByText(/練習|practice/i),
  getReviewButton: () => screen.getByText(/複習|review/i),
  queryReviewButton: () => screen.queryByText(/複習|review/i),

  // User info
  getUserName: () => screen.getByLabelText(/user.*name|使用者/i),
  queryUserName: () => screen.queryByLabelText(/user.*name|使用者/i),
};

/**
 * Helpers for finding modal elements
 */
export const modal = {
  getContainer: () => screen.getByRole('dialog'),
  queryContainer: () => screen.queryByRole('dialog'),
  getTitle: () => within(screen.getByRole('dialog')).getByRole('header'),
  getCloseButton: () => screen.getByLabelText(/close|關閉/i),
  queryCloseButton: () => screen.queryByLabelText(/close|關閉/i),
  getConfirmButton: () => screen.getByText(/確定|confirm|yes/i),
  queryConfirmButton: () => screen.queryByText(/確定|confirm|yes/i),
  getCancelButton: () => screen.getByText(/取消|cancel|no/i),
  queryCancelButton: () => screen.queryByText(/取消|cancel|no/i),
};

/**
 * Helpers for finding alert elements
 */
export const alert = {
  getTitle: (title: string) => screen.getByText(title),
  queryTitle: (title: string) => screen.queryByText(title),
  getMessage: (message: string) => screen.getByText(message),
  queryMessage: (message: string) => screen.queryByText(message),
  getPrimaryButton: () => screen.getByText(/確定|ok|yes/i),
  queryPrimaryButton: () => screen.queryByText(/確定|ok|yes/i),
  getSecondaryButton: () => screen.getByText(/取消|cancel|no/i),
  querySecondaryButton: () => screen.queryByText(/取消|cancel|no/i),
};
