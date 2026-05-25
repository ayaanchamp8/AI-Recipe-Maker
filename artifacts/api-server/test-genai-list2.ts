import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "AIzaSyBmnc6eZsIH1zM65biwNgWr3-QVpPXE6FI" });

async function play() {
  const result = await ai.models.list();
  for await (const m of result) {
    console.log(m.name);
  }
}
play();
