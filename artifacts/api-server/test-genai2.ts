import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "AIzaSyBmnc6eZsIH1zM65biwNgWr3-QVpPXE6FI" });

async function play() {
  const models = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"];
  for (const model of models) {
    try {
      const result = await ai.models.generateContent({
        model: model,
        contents: "Say hi!",
      });
      console.log(model, "worked!", result.text);
    } catch (err: any) {
      console.log(model, "failed with", err.status || err.message);
    }
  }
}
play();
