import OpenAI from "openai";

const defaultOpenai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "dummy",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "http://dummy",
});

async function main() {
  const customOpenai = new OpenAI({
    apiKey: "AIzaSyBmnc6eZsIH1zM65biwNgWr3-QVpPXE6FI",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
  });

  const tests = [
    { model: "gemini-2.5-flash", client: customOpenai },
    { model: "gpt-4o-mini", client: defaultOpenai }
  ];

  for (const t of tests) {
    try {
      console.log(`Trying ${t.model}...`);
      const result = await t.client.chat.completions.create({
        model: t.model,
        messages: [{ role: "user", content: "Hi" }],
        max_completion_tokens: 10,
        response_format: { type: "json_object" }
      });
      console.log(`Success with ${t.model}!`);
      console.log(result.choices[0].message.content);
    } catch (e: any) {
      console.error(`Failed ${t.model}:`, e.message);
    }
  }
}

main().catch(console.error);
