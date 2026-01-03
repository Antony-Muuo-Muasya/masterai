
import { GoogleGenAI, Type } from "@google/genai";
import { SonicProfile } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function analyzeTrackProfile(fileName: string, fileSize: number): Promise<SonicProfile> {
  // In a real app, we'd send audio segments. 
  // For this architecture demo, we use file metadata and simulated analysis via Gemini 3 Flash.
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the potential sonic characteristics of a professional audio file named "${fileName}" (Size: ${fileSize} bytes) and suggest mastering parameters.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          genre: { type: Type.STRING },
          lufs: { type: Type.NUMBER },
          peak: { type: Type.NUMBER },
          dynamics: { type: Type.STRING },
          recommendedEq: {
            type: Type.OBJECT,
            properties: {
              low: { type: Type.NUMBER },
              mid: { type: Type.NUMBER },
              high: { type: Type.NUMBER },
            },
            required: ["low", "mid", "high"],
          },
          suggestedWidening: { type: Type.NUMBER },
        },
        required: ["genre", "lufs", "peak", "dynamics", "recommendedEq", "suggestedWidening"]
      },
    },
  });

  try {
    const data = JSON.parse(response.text);
    return data as SonicProfile;
  } catch (e) {
    // Fallback profile
    return {
      genre: "Electronic / Neutral",
      lufs: -14.2,
      peak: -1.1,
      dynamics: "Medium",
      recommendedEq: { low: 1.2, mid: -0.5, high: 2.1 },
      suggestedWidening: 1.15
    };
  }
}
