# Tools

Scripts for generating app assets and deployment.

## Prerequisites

For AI image generation, set your Google API key:
```bash
export GOOGLE_API_KEY="your-api-key"
```
Get your key from: https://aistudio.google.com/app/apikey

---

## Scripts

### generate-icons.py

Generate app icons from a source image.

```bash
python3 tools/generate-icons.py <source-image>
```

**Output:** `assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash-icon.png`, `assets/favicon.png`

---

### generate-previews-ai.py

Generate App Store preview images using Gemini AI.

```bash
GOOGLE_API_KEY="your-key" python3 tools/generate-previews-ai.py
```

**Input:** Place screenshots in `tools/screenshots/` (01.png, 02.png, 03.png, 04.png)

**Output:** `tools/previews-ai/` (1290x2796 for Google Play)

---

### crop-for-apple.py

Crop preview images to Apple App Store dimensions.

```bash
python3 tools/crop-for-apple.py        # iPhone 6.7" (1284x2778)
python3 tools/crop-for-apple.py 6.5    # iPhone 6.5" (1242x2688)
```

**Input:** `tools/previews-ai/`

**Output:** `tools/previews-apple/`

---

### generate-feature-graphic.py

Generate Google Play feature graphic (1024x500) using Gemini AI.

```bash
GOOGLE_API_KEY="your-key" python3 tools/generate-feature-graphic.py
```

**Output:** `tools/feature-graphic/feature-graphic.png`

---

### upload-ios.sh

Upload iOS app to TestFlight via Fastlane.

```bash
./tools/upload-ios.sh /path/to/app.ipa
```

Requires API key config at `../certs/ios-store/app_store_auth.json`
