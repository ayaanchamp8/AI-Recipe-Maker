import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY2 });

async function play() {
  const models = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash", "gemini-1.5-flash-8b"];
  for (const model of models) {
    try {
      const result = await ai.models.generateContent({
        model: model,
        contents: "Say hi!",
      });
      console.log(model, "worked!");
    } catch (err: any) {
      console.log(model, "failed with", err.status, err.message, err.statusText);
    }
  }
}
play();
