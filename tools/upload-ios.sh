#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_KEY_PATH="$SCRIPT_DIR/../certs/ios-store/app_store_auth.json"
IPA_PATH="$1"

if [ -z "$IPA_PATH" ]; then
    echo "Usage: $0 <path-to-ipa>"
    exit 1
fi

# Upload to TestFlight
echo "Uploading to TestFlight..."
fastlane run upload_to_testflight api_key_path:"$API_KEY_PATH" ipa:"$IPA_PATH"

echo "Upload complete!"
