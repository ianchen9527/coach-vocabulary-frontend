# Coach Vocabulary Frontend - AI Agent 設定指南

> **本文件專為 AI Agent（如 Claude Code、Gemini CLI 等）設計**
>
> 目標：讓 AI Agent 能夠引導一位不會寫程式的使用者，從零開始在本機成功執行此專案的開發伺服器。

---

## 專案資訊

- **專案類型**：Expo React Native 應用程式（優先支援 Web 平台）
- **Node.js 版本需求**：18.x 或更高版本（建議 20.x LTS）
- **套件管理器**：npm
- **預設 API 位址**：`http://localhost:8000`（需要後端服務配合）

---

## AI Agent 執行指南

請依照以下步驟順序執行。每個步驟都包含「執行動作」和「驗證方式」，請確保每個驗證都通過後再進入下一步。

---

### 步驟 1：檢查作業系統

**執行動作**（macOS/Linux）：
```bash
uname -s
```

**判斷邏輯**：
- 輸出 `Darwin` → macOS
- 輸出 `Linux` → Linux
- 指令不存在或報錯 → 可能是 Windows

**Windows 判斷方式**：
如果上述指令失敗，嘗試執行：
```powershell
$env:OS
```
若輸出包含 `Windows` 則確認為 Windows 系統。

請記住此結果，後續步驟會根據作業系統有不同指令。

---

### 步驟 2：檢查 Node.js 是否已安裝

**執行動作**：
```bash
node --version
```

**驗證方式**：
- **成功**：輸出類似 `v20.x.x` 或 `v22.x.x` 的版本號（主版本號 >= 18 即可）
- **失敗**：輸出 `command not found` 或類似錯誤 → 進入步驟 2a 安裝 Node.js

---

### 步驟 2a：安裝 Node.js（若步驟 2 失敗才執行）

根據作業系統選擇安裝方式：

#### macOS
```bash
# 檢查是否有 Homebrew
brew --version

# 如果沒有 Homebrew，先安裝它（安裝後需依照終端機提示設定 PATH）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安裝 Node.js（會自動安裝最新 LTS 版本）
brew install node
```

#### Linux (Ubuntu/Debian)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Windows
請告知使用者：
1. 開啟瀏覽器前往 https://nodejs.org/
2. 下載 LTS 版本（通常是綠色按鈕）
3. 執行下載的安裝程式，全部使用預設選項
4. 安裝完成後，關閉並重新開啟終端機

**安裝後驗證**：
```bash
node --version
npm --version
```

兩個指令都應該輸出版本號。

---

### 步驟 3：確認當前目錄

**執行動作**：
```bash
pwd
```

**驗證方式**：
- 輸出的路徑應該以 `coach-vocabulary-frontend` 結尾
- 如果不是，請使用 `cd` 指令切換到專案目錄

**若需要切換目錄**：
```bash
cd /path/to/coach-vocabulary-frontend
```

---

### 步驟 4：檢查專案檔案完整性

**執行動作**：
```bash
ls package.json app.json
```

**驗證方式**：
- **成功**：顯示這兩個檔案名稱
- **失敗**：顯示 `No such file` → 確認目前不在正確的專案目錄，請回到步驟 3

---

### 步驟 5：檢查 node_modules 是否存在

**執行動作**：
```bash
ls node_modules 2>/dev/null && echo "EXISTS" || echo "NOT_EXISTS"
```

**判斷邏輯**：
- 輸出 `EXISTS` → 跳到步驟 7 驗證安裝
- 輸出 `NOT_EXISTS` → 進入步驟 6 安裝依賴

---

### 步驟 6：安裝專案依賴

**執行動作**：
```bash
npm install
```

**預期結果**：
- 執行時間約 1-3 分鐘（視網路速度）
- 結束時不應有紅色的 `ERR!` 錯誤訊息
- 可能會有黃色的 `WARN` 警告，這是正常的可以忽略

**若出現錯誤**：
1. 網路錯誤 → 檢查網路連線後重試
2. 權限錯誤 → 嘗試 `sudo npm install`（僅限 macOS/Linux）
3. 其他錯誤 → 嘗試刪除快取後重試：
   ```bash
   rm -rf node_modules package-lock.json
   npm cache clean --force
   npm install
   ```

---

### 步驟 7：驗證依賴安裝

**執行動作**：
```bash
npx expo --version
```

**驗證方式**：
- **成功**：輸出版本號（如 `54.x.x`）
- **失敗**：回到步驟 6 重新安裝

---

### 步驟 8：設定環境變數（選擇性）

如果後端 API 不是在 `http://localhost:8000` 執行，需要建立環境變數檔案。

**執行動作**：
```bash
# 檢查是否已有 .env 檔案
ls .env 2>/dev/null && echo "EXISTS" || echo "NOT_EXISTS"
```

**若需要自訂 API 位址**：
```bash
echo 'EXPO_PUBLIC_API_URL=http://your-api-server:port' > .env
```

將 `http://your-api-server:port` 替換為實際的後端 API 位址。

**預設值說明**：
- 如果不建立 `.env` 檔案，系統會自動使用 `http://localhost:8000` 作為 API 位址
- 這表示後端服務需要在本機的 8000 port 執行

---

### 步驟 9：啟動開發伺服器

**執行動作**：
```bash
npm run web
```

**預期結果**：
1. 終端機會顯示 Expo 的啟動畫面
2. 幾秒後會自動在瀏覽器開啟 `http://localhost:8081`
3. 應該會看到應用程式的登入畫面

**若瀏覽器沒有自動開啟**：
- 手動開啟瀏覽器，前往 `http://localhost:8081`

**若出現錯誤**：

| 錯誤訊息 | 解決方式 |
|---------|---------|
| `Port 8081 is already in use` | 執行 `npx expo start --web --port 8082` 使用其他 port |
| `Cannot find module` | 回到步驟 6 重新安裝依賴 |
| `Network error` / API 連線失敗 | 確認後端服務是否正在執行 |

---

### 步驟 10：驗證應用程式運作

**手動驗證清單**（請告知使用者確認）：

1. [ ] 瀏覽器顯示「Coach Vocabulary」登入畫面
2. [ ] 畫面上有用戶名輸入框
3. [ ] 畫面上有「開始學習」按鈕

如果以上都正確，設定完成！

---

## 常用指令參考

| 指令 | 用途 |
|-----|------|
| `npm run web` | 啟動 Web 開發伺服器 |
| `npm run start` | 啟動 Expo 開發伺服器（可選擇平台） |
| `npm run ios` | 啟動 iOS 模擬器（需要 macOS + Xcode） |
| `npm run android` | 啟動 Android 模擬器（需要 Android Studio） |
| `npx tsc --noEmit` | 檢查 TypeScript 類型錯誤 |

---

## 故障排除

### Q: 安裝依賴時出現 `EACCES` 權限錯誤

**macOS/Linux 解決方式**：
```bash
sudo chown -R $(whoami) ~/.npm
npm install
```

### Q: 啟動時出現 `Watchman` 相關警告

這是正常的警告，不影響使用。如要消除警告：

**macOS**：
```bash
brew install watchman
```

### Q: 網頁顯示但 API 連線失敗

1. 確認後端服務正在執行
2. 確認 `.env` 中的 `EXPO_PUBLIC_API_URL` 設定正確
3. 確認後端服務允許來自 `localhost:8081` 的 CORS 請求

### Q: 如何停止開發伺服器？

在終端機按下 `Ctrl + C`

---

## 專案結構簡介

```
coach-vocabulary-frontend/
├── app/                    # 頁面路由（Expo Router）
│   ├── (auth)/            # 認證相關頁面
│   │   └── login.tsx      # 登入頁
│   └── (main)/            # 主要功能頁面
│       ├── index.tsx      # 首頁
│       ├── learn.tsx      # 學習頁
│       ├── practice.tsx   # 練習頁
│       └── review.tsx     # 複習頁
├── components/            # React 元件
├── contexts/              # React Context（狀態管理）
├── hooks/                 # 自定義 Hooks
├── services/              # API 服務層
├── types/                 # TypeScript 類型定義
└── lib/                   # 工具函式
```

---

## 版本資訊

- Expo SDK: ~54.0
- React: 19.1.0
- React Native: 0.81.5
- TypeScript: ~5.9
- Node.js: 18.x+ (建議 20.x LTS)
