import { Platform } from "react-native";
import { api } from "./api";
import type { SpeechTranscribeResponse } from "../types/api";
import { createDebugLogger } from "../utils/debug";

export type AudioData = string | Blob; // string = file URI (native), Blob = audio blob (web)
export type SpeechPlatform = "ios" | "android" | "web";

const debug = createDebugLogger("SpeechService");

/**
 * Get the platform identifier for the API
 */
function getPlatform(): SpeechPlatform {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "web";
}

export const speechService = {
  /**
   * Transcribe audio using the Whisper API fallback
   * @param audioData - File URI (native) or Blob (web)
   * @param wordId - ID of the word being practiced
   * @param nativeTranscript - What the device's native speech recognition detected
   * @returns The transcribed text from Whisper
   */
  // Track request count for debugging
  _requestCount: 0,

  async transcribe(
    audioData: AudioData,
    wordId: string,
    nativeTranscript: string | null
  ): Promise<string> {
    this._requestCount++;
    const requestId = this._requestCount;
    const startTime = Date.now();
    const platform = getPlatform();

    debug.log(`=== Starting transcription request #${requestId} ===`);
    debug.log(`[#${requestId}] Timestamp:`, new Date().toISOString());
    debug.log(`[#${requestId}] Platform:`, platform);
    debug.log(`[#${requestId}] Word ID:`, wordId);
    debug.log(`[#${requestId}] Native transcript:`, nativeTranscript);
    debug.log(`[#${requestId}] Audio data type:`, typeof audioData === "string" ? "uri" : "blob");

    if (typeof audioData === "string") {
      debug.log(`[#${requestId}] Audio URI:`, audioData);
    } else {
      debug.log(`[#${requestId}] Audio Blob:`, { size: audioData.size, type: audioData.type });
    }

    const formData = new FormData();

    // Determine file extension and mime type based on platform
    const extension = Platform.OS === "web" ? "webm" : "wav";
    const mimeType = Platform.OS === "web" ? "audio/webm" : "audio/wav";
    const fileName = `recording.${extension}`;

    debug.log(`[#${requestId}] File info:`, { extension, mimeType, fileName });

    // Append audio file to form data - different handling for native vs web
    if (typeof audioData === "string") {
      // Native (iOS/Android): Use URI directly with file object format
      // React Native FormData expects { uri, type, name } for file uploads
      debug.log(`[#${requestId}] Creating native file object from URI`);

      const fileObject = {
        uri: audioData,
        type: mimeType,
        name: fileName,
      } as unknown as Blob; // Type cast for FormData.append compatibility

      formData.append("audio", fileObject);
      debug.log(`[#${requestId}] Native file object appended to FormData`);
    } else {
      // Web: Use Blob directly
      debug.log(`[#${requestId}] Creating File from Blob for web`);

      // Create a File object from Blob for better compatibility
      const file = new File([audioData], fileName, { type: mimeType });
      formData.append("audio", file);
      debug.log(`[#${requestId}] Web File appended to FormData:`, { name: file.name, size: file.size, type: file.type });
    }

    formData.append("word_id", wordId);
    formData.append("platform", platform);

    if (nativeTranscript) {
      formData.append("native_transcript", nativeTranscript);
    }

    debug.log(`[#${requestId}] FormData prepared with fields:`, {
      word_id: wordId,
      platform: platform,
      native_transcript: nativeTranscript,
      has_audio: true,
    });

    // Get the base URL from the api instance
    const baseURL = api.defaults.baseURL;
    debug.log(`[#${requestId}] API Base URL:`, baseURL);
    debug.log(`[#${requestId}] Full URL:`, `${baseURL}/api/speech/transcribe`);

    const formDataPrepTime = Date.now() - startTime;
    debug.log(`[#${requestId}] FormData prep time: ${formDataPrepTime}ms`);

    try {
      debug.log(`[#${requestId}] Sending POST request...`);
      const postStartTime = Date.now();

      const response = await api.post<SpeechTranscribeResponse>(
        "/api/speech/transcribe",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            // Prevent connection reuse issues on Android with multipart uploads
            // This forces a fresh connection for each request
            "Connection": "close",
          },
          timeout: 10000, // 10 second timeout for transcription
        }
      );

      const postDuration = Date.now() - postStartTime;
      debug.log(`[#${requestId}] Response received in ${postDuration}ms:`, {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      });

      if (!response.data.success) {
        debug.log(`[#${requestId}] Transcription failed - API returned success: false`);
        throw new Error(response.data.error || "Transcription failed");
      }

      debug.log(`[#${requestId}] Transcription successful:`, response.data.transcript);
      return response.data.transcript;
    } catch (err: unknown) {
      const errorTime = Date.now() - startTime;
      const error = err as Error & {
        response?: { status: number; data: unknown; headers?: unknown };
        request?: unknown;
        config?: { url?: string; baseURL?: string; headers?: unknown; method?: string };
        code?: string;
      };

      debug.error(`[#${requestId}] === REQUEST FAILED after ${errorTime}ms ===`);
      debug.error(`[#${requestId}] Error name:`, error.name);
      debug.error(`[#${requestId}] Error message:`, error.message);
      debug.error(`[#${requestId}] Error code:`, error.code);
      debug.error(`[#${requestId}] Has response:`, !!error.response);
      debug.error(`[#${requestId}] Has request:`, !!error.request);

      if (error.config) {
        debug.error(`[#${requestId}] Request config:`, {
          method: error.config.method,
          url: error.config.url,
          baseURL: error.config.baseURL,
          headers: error.config.headers,
        });
      }

      if (error.response) {
        debug.error(`[#${requestId}] Response details:`, {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
        });
      }

      if (error.request && !error.response) {
        debug.error(`[#${requestId}] Request was made but no response received`);
        debug.error(`[#${requestId}] Possible causes: server down, network issue, CORS, wrong URL`);
      }

      throw err;
    }
  },
};
