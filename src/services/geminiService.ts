import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const PRIMARY_MODEL = "gemini-3.1-pro-preview";
const FALLBACK_MODEL = "gemini-3-flash-preview";
const MAX_RETRIES = 3;

/**
 * Helper function for exponential backoff
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface ChatMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

/**
 * Robust Gemini API service with error handling, exponential backoff, and automatic fallback.
 */
export const geminiService = {
  /**
   * Generates content with automatic fallback and retry logic.
   */
  async generateContent(
    prompt: string,
    history: ChatMessage[] = []
  ): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Prepare the contents including history
    const contents = [
      ...history,
      { role: "user", parts: [{ text: prompt }] }
    ];

    try {
      // 1. Try with Primary Model (gemini-3.1-pro)
      return await this.executeWithRetry(ai, PRIMARY_MODEL, contents);
    } catch (error: any) {
      const isQuotaError = error.message?.includes("429") || error.message?.includes("403") || error.status === 429 || error.status === 403;

      if (isQuotaError) {
        console.warn("Pro model limit reached. Switching to fallback model to maintain context...");
        try {
          // 2. Fallback to Lighter Model (gemini-3-flash)
          return await this.executeWithRetry(ai, FALLBACK_MODEL, contents);
        } catch (fallbackError: any) {
          console.error("Fallback model also failed:", fallbackError);
          return "The system is currently experiencing high traffic. Please wait a moment and try again.";
        }
      }

      console.error("API Error:", error);
      return "An unexpected error occurred. Please try again later.";
    }
  },

  /**
   * Executes an API call with exponential backoff retry logic.
   */
  async executeWithRetry(
    ai: any,
    model: string,
    contents: any,
    retryCount = 0
  ): Promise<string> {
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model,
        contents,
      });

      if (!response.text) {
        throw new Error("Empty response from model");
      }

      return response.text;
    } catch (error: any) {
      const isRateLimit = error.message?.includes("429") || error.status === 429;

      if (isRateLimit && retryCount < MAX_RETRIES) {
        const waitTime = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.log(`Rate limit hit for ${model}. Retrying in ${waitTime}ms... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await delay(waitTime);
        return this.executeWithRetry(ai, model, contents, retryCount + 1);
      }

      throw error; // Re-throw if not a rate limit or max retries reached
    }
  }
};
