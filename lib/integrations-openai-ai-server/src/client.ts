import OpenAI from "openai";

let _openai: OpenAI | null = null;

function getClient(): OpenAI {
  if (_openai) return _openai;

  const openRouterKey = process.env.OPENROUTER_API_KEY || process.env.openrounterkey;

  if (openRouterKey) {
    _openai = new OpenAI({
      apiKey: openRouterKey,
      baseURL: "https://openrouter.ai/api/v1",
    });
    return _openai;
  }

  const geminiKey = process.env.GEMINI_API_KEY2 || process.env.GEMINI_API_KEY || process.env.gemini || process.env.GEMINI || process.env.Gemini || "AIzaSyAaUcD2RFnJCoEwEAyfZ3KTAwtwu3SQrwc";

  if (geminiKey) {
    _openai = new OpenAI({
      apiKey: geminiKey,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
    return _openai;
  }

  if (process.env.OPENAI_API_KEY) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return _openai;
  }

  if (!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
    throw new Error(
      "AI_INTEGRATIONS_OPENAI_BASE_URL must be set. Did you forget to provision the OpenAI AI integration?",
    );
  }

  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    throw new Error(
      "AI_INTEGRATIONS_OPENAI_API_KEY must be set. Did you forget to provision the OpenAI AI integration?",
    );
  }

  _openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  return _openai;
}

export const openai = new Proxy({} as OpenAI, {
  get: (_target, prop: keyof OpenAI) => {
    return getClient()[prop];
  },
});

export const usingOpenRouter = !!(process.env.OPENROUTER_API_KEY || process.env.openrounterkey);

export const DEFAULT_CHAT_MODEL = usingOpenRouter ? "google/gemini-2.5-flash" : "gemini-2.5-flash";
export const FALLBACK_CHAT_MODEL = usingOpenRouter ? "google/gemini-1.5-flash" : "gemini-1.5-flash";
