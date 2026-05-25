
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "AIzaSyBmnc6eZsIH1zM65biwNgWr3-QVpPXE6FI" });

async function play() {
  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "hello",
      config: {
        responseMimeType: "application/json",
        temperature: 0.7,
      }
    });
    console.log(result.text);
  } catch (err) {
    console.error("error:", err);
  }
}
play();
