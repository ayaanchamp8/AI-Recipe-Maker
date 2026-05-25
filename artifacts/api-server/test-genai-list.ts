import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY2 });

async function play() {
  const result = await ai.models.list();
  for await (const m of result) {
    console.log(m.name);
  }
}
play();
