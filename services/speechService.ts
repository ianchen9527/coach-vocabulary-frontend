import { Platform } from "react-native";
import { api } from "./api";
import type { SpeechTranscribeResponse } from "../types/api";

export type AudioData = string | Blob; // string = file URI (native), Blob = audio blob (web)
export type SpeechPlatform = "ios" | "android" | "web";

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
  async transcribe(
    audioData: AudioData,
    wordId: string,
    nativeTranscript: string | null
  ): Promise<string> {
    const platform = getPlatform();
    const formData = new FormData();

    // Determine file extension and mime type based on platform
    const extension = Platform.OS === "web" ? "webm" : "wav";
    const mimeType = Platform.OS === "web" ? "audio/webm" : "audio/wav";
    const fileName = `recording.${extension}`;

    // Append audio file to form data - different handling for native vs web
    if (typeof audioData === "string") {
      // Native (iOS/Android): Use URI directly with file object format
      // React Native FormData expects { uri, type, name } for file uploads
      const fileObject = {
        uri: audioData,
        type: mimeType,
        name: fileName,
      } as unknown as Blob; // Type cast for FormData.append compatibility

      formData.append("audio", fileObject);
    } else {
      // Web: Use Blob directly
      // Create a File object from Blob for better compatibility
      const file = new File([audioData], fileName, { type: mimeType });
      formData.append("audio", file);
    }

    formData.append("word_id", wordId);
    formData.append("platform", platform);

    if (nativeTranscript) {
      formData.append("native_transcript", nativeTranscript);
    }

    const response = await api.post<SpeechTranscribeResponse>(
      "/api/speech/transcribe",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 10000, // 10 second timeout for transcription
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || "Transcription failed");
    }

    return response.data.transcript;
  },
};
