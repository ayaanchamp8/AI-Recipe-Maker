// ============================================================
// Recipe Route: /api/recipes/search
// Uses OpenAI to generate a recipe. Handles:
// - Allergy restrictions (substitutes ingredients)
// - Vegetarian preference (returns error if dish can't be made veg)
// - Analytics: logs every search event to the database
// ============================================================

import { Router, type IRouter, type Request } from "express";
import { openai as defaultOpenai, DEFAULT_CHAT_MODEL } from "@workspace/integrations-openai-ai-server";
import OpenAI from "openai";
import { SearchRecipeBody, SearchRecipeResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";
import { db } from "../firebase";
import { collection, addDoc, getDocs, query, where, limit as fsLimit, serverTimestamp } from "firebase/firestore";

const router: IRouter = Router();

// Extract IP from request headers
function getClientIp(req: Request): string {
  const headers = req.headers as Record<string, string | string[] | undefined>;
  const xff = headers["x-forwarded-for"];
  return (
    (headers["cf-connecting-ip"] as string | undefined) ||
    (Array.isArray(xff) ? xff[0] : xff?.split(",")[0]?.trim()) ||
    (headers["x-real-ip"] as string | undefined) ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

// Simple country lookup from IP. We awaited this with a tight timeout so
// the value is actually present when we INSERT — the previous fire-and-forget
// pattern meant the country column was almost always "Unknown".
async function getCountryFromIp(req: Request, ip: string): Promise<string> {
  const customCountry = req.headers["cf-ipcountry"];
  if (typeof customCountry === "string" && customCountry.trim().length > 0) {
     return customCountry;
  }

  if (!ip || ip === "unknown" || ip.startsWith("127.") || ip.startsWith("::1") || ip === "::") {
    return "Unknown";
  }

  try {
    const res = await fetch(`https://ipwho.is/${ip}`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = (await res.json()) as { country?: string };
      return data.country || "Unknown";
    }
  } catch {
    // Fail gracefully — don't block on geolocation
  }
  return "Unknown";
}

// Analytics insert. Logs failures loudly so we can see if writes are dropping.
// Returns true on success so callers can verify.
async function trackEvent(
  req: Request,
  event: {
    dish: string;
    vegetarian: boolean;
    allergies?: string;
    outcome: string;
    cuisine?: string;
    difficulty?: string;
    ipAddress?: string;
    country?: string;
    visitorId?: string;
  }
): Promise<boolean> {
  try {
    const data = {
      dish: event.dish || 'Unknown',
      vegetarian: !!event.vegetarian,
      allergies: event.allergies ?? null,
      outcome: event.outcome,
      cuisine: event.cuisine ?? null,
      difficulty: event.difficulty ?? null,
      ip_address: event.ipAddress ?? null,
      country: event.country ?? null,
      visitor_id: event.visitorId ?? null,
      created_at: serverTimestamp()
    };
    
    await addDoc(collection(db, "searchEvents"), data);
    return true;
  } catch (err) {
    req.log.error({ err, event }, "Failed to insert search_events row");
    return false;
  }
}

router.post("/recipes/search", async (req, res) => {
  // Capture IP + visitor up-front so even early-return paths can be tracked
  const ipAddress = getClientIp(req);
  const visitorId = (req.body?.visitorId as string | undefined) || "unknown";
  // Resolve country synchronously (with a 1.5s cap inside getCountryFromIp).
  // The previous fire-and-forget pattern meant `country` was always "Unknown"
  // by the time the INSERT ran.
  const country = await getCountryFromIp(req, ipAddress);

  try {
    // --- 1. Validate request body ---
    const parseResult = SearchRecipeBody.safeParse(req.body);
    if (!parseResult.success) {
      // Track invalid attempts too — they were previously dropped.
      await trackEvent(req, {
        dish: String(req.body?.dish ?? "").slice(0, 200) || "(invalid)",
        vegetarian: Boolean(req.body?.vegetarian),
        allergies: typeof req.body?.allergies === "string" ? req.body.allergies : undefined,
        outcome: "invalid_request",
        ipAddress,
        country,
        visitorId,
      });
      res.status(400).json({
        error: "Bad Request",
        message: "Please provide a dish name to search for.",
      });
      return;
    }

    const { dish, allergies, vegetarian } = parseResult.data;

    if (!dish.trim()) {
      await trackEvent(req, {
        dish: "(empty)",
        vegetarian: vegetarian ?? false,
        allergies,
        outcome: "invalid_request",
        ipAddress,
        country,
        visitorId,
      });
      res.status(400).json({
        error: "Bad Request",
        message: "Dish name cannot be empty.",
      });
      return;
    }

    // --- 2. Build dietary context for the AI ---
    const allergyClause = allergies?.trim()
      ? `\nALLERGY REQUIREMENT: The user is allergic to: ${allergies}. Avoid those ingredients entirely and substitute with safe alternatives. Mention any substitutions made in the tips section.`
      : "";

    const vegClause = vegetarian
      ? `\nVEGETARIAN: Make this dish fully vegetarian. Use substitutes like tofu, paneer, mushrooms, lentils, or vegetables where needed. ONLY if the dish is something like "beef steak", "lamb chops", or "pork ribs" where the animal protein IS the dish itself with no equivalent, return {"error":"not_vegetarian","message":"<reason and 2 veg alternatives>"}. For dishes like sushi, tacos, burgers, pizza, pasta — always make a vegetarian version instead of refusing.`
      : "";

    const systemPrompt = `You are a world-class professional chef. Provide the absolute tastiest, highest-rated, and most delicious recipe for the request in valid JSON ONLY.
Requirements:
- Safety First: Ensure the dish is actually edible, safe for human consumption, and something a normal person would eat. If it's poisonous, inedible (e.g. mud, glue, rocks), or dangerous, return: {"error":"not_edible","message":"This dish is not safe or suitable for human consumption."}
- Ensure proper food safety (cooking temps/times to prevent illness)
- Include food handling instructions
- Provide specific temperatures and timings (not vague)
- List ingredients clearly with measurements
- Include storage/shelf-life in tips
- List allergens in tips
For fictional dishes: {"error":"not_found","message":"Could not find a recipe for that dish."}`;

    const userPrompt = `Create a recipe for "${dish}".${vegClause}${allergyClause}

CRITICAL: ingredients MUST be an array of STRINGS (not objects). Each ingredient string should include the amount and description.
steps MUST be array of STRINGS. tips MUST be array of STRINGS.

Respond with ONLY valid JSON:
{
  "name": "Dish name",
  "cookingTime": "X minutes",
  "servings": "X servings",
  "difficulty": "Easy|Medium|Hard",
  "cuisine": "Type",
  "description": "2-3 sentence appetizing description",
  "ingredients": ["1 cup flour", "2 eggs", "3 tbsp butter"],
  "steps": ["Step 1 with details", "Step 2 with temps/times"],
  "tips": ["Chef tip", "Safety tip", "Allergen info"],
  "isVegetarian": false,
  "nutrition": {
    "calories": "450 cal",
    "protein": "25g",
    "carbs": "60g",
    "fat": "15g"
  }
}`;

    // --- 2.5 Check Cache ---
    const cacheKey = `${dish.toLowerCase().trim()}_V_${vegetarian ? 'y' : 'n'}_A_${allergies?.toLowerCase().trim() || 'none'}`;
    let cachedRecipeData = null;
    
    try {
      const q = query(collection(db, "cachedRecipes"), where("cacheKey", "==", cacheKey), fsLimit(1));
      const cacheDocs = await getDocs(q);
      if (!cacheDocs.empty) {
        cachedRecipeData = cacheDocs.docs[0].data().recipe;
      }
    } catch (e) {
      req.log.warn({ err: e }, "Failed to read from cache");
    }

    if (cachedRecipeData) {
      await trackEvent(req, {
        dish,
        vegetarian: vegetarian ?? false,
        allergies,
        outcome: "success",
        cuisine: cachedRecipeData.cuisine,
        difficulty: cachedRecipeData.difficulty,
        ipAddress,
        country,
        visitorId,
      });
      res.json(cachedRecipeData);
      return;
    }

    // --- 3. Call OpenAI with fallback & timeout ---
    const performChatCompletion = async (clientOptions: OpenAI, modelToUse: string, timeoutMs: number) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      try {
        const result = await clientOptions.chat.completions.create({
          model: modelToUse,
          max_tokens: 2500, // Used max_tokens instead of max_completion_tokens for broader compatibility
          temperature: 0.7,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }, {
          signal: controller.signal,
        } as any);
        clearTimeout(timeoutId);
        return result;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    };

    try {
      let completion;
      let success = false;
      let lastErr: any = new Error("No AI models available");
      let rateLimitErr: any = null;

      // Simplest approach: Use the default AI integration provided by the environment.
      // If the user's OpenAI quota is exceeded, we must inform them.
      const strategies = [
        { client: defaultOpenai, model: DEFAULT_CHAT_MODEL },
        { client: defaultOpenai, model: "gpt-4o-mini" },
        { client: defaultOpenai, model: "gemini-2.5-flash" } // for GenAI proxy fallback 
      ];
      
      for (const strategy of strategies) {
        try {
          completion = await performChatCompletion(strategy.client, strategy.model, 15000);
          success = true;
          break;
        } catch (aiErr: any) {
          lastErr = aiErr;
          const isRateLimit = aiErr?.status === 429 || aiErr?.type === 'RateLimitError' || aiErr?.name === 'RateLimitError' || aiErr?.code === 'rate_limit_exceeded' || (aiErr?.message && String(aiErr.message).includes('429'));
          if (isRateLimit) {
             rateLimitErr = aiErr;
             // Don't break immediately, maybe another model in the list has a separate quota.
          }
          req.log.warn({ msg: aiErr?.message || "AI Error", model: strategy.model }, `Strategy with model ${strategy.model} failed`);
        }
      }
      
      if (!success) {
        if (rateLimitErr) {
          req.log.warn("Rate limit/quota exceeded. Serving fallback placeholder recipe.");
          // We provide a fallback object so the user sees *something* on the frontend 
          // without crashing the UI, while still logging the quota issue.
          const fallbackContent = {
            name: `(Quota Exceeded) Let's make ${dish}`,
            cookingTime: "20 minutes",
            servings: "2 servings",
            difficulty: "Medium",
            cuisine: "Global",
            description: `We're experiencing an API quota error. This happens when the configured OpenAI/Gemini account runs out of billing credits. You can still use this simple placeholder recipe!`,
            ingredients: ["1 main ingredient", "2 tbsp oil or butter", "Salt and pepper to taste", "Spices as desired"],
            steps: [
              "Prepare the ingredients.",
              "Cook the main ingredient in oil until done.",
              "Season with salt, pepper, and spices.",
              "Serve hot and enjoy."
            ],
            tips: ["To fix the AI, please update your API key billing details on the OpenAI Dashboard."],
            isVegetarian: vegetarian || false,
            nutrition: { calories: "350 cal", protein: "15g", carbs: "20g", fat: "10g" }
          };
          res.json(fallbackContent);
          return;
        }
        throw lastErr;
      }
      
      const rawContent = (completion?.choices?.[0]?.message?.content ?? "").trim();

      if (!rawContent) {
        req.log.error({ dish, vegetarian }, "AI returned empty content");
        await trackEvent(req, { dish, vegetarian: vegetarian ?? false, allergies, outcome: "error", ipAddress, country, visitorId });
        res.status(500).json({
          error: "Internal Server Error",
          message: "The AI didn't return a recipe. Please try again.",
        });
        return;
      }

      const cleaned = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

      let parsed: unknown;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        req.log.error({ rawContent }, "Failed to parse AI JSON response");
        await trackEvent(req, { dish, vegetarian: vegetarian ?? false, allergies, outcome: "error", ipAddress, country, visitorId });
        res.status(500).json({
          error: "Internal Server Error",
          message: "The AI returned an unexpected response. Please try again.",
        });
        return;
      }

      // --- 4. Handle specific error signals from the AI ---
      const maybeError = parsed as { error?: string; message?: string };

      if (maybeError?.error === "not_edible") {
        await trackEvent(req, { dish, vegetarian: vegetarian ?? false, allergies, outcome: "not_edible", ipAddress, country, visitorId });
        res.status(422).json({
          error: "Not Edible",
          message: maybeError.message || `"${dish}" is not considered safe or edible.`,
        });
        return;
      }

      if (maybeError?.error === "not_vegetarian") {
        await trackEvent(req, { dish, vegetarian: true, allergies, outcome: "not_vegetarian", ipAddress, country, visitorId });
        res.status(422).json({
          error: "not_vegetarian",
          message: maybeError.message || `"${dish}" cannot be made vegetarian.`,
        });
        return;
      }

      if (maybeError?.error === "not_found") {
        await trackEvent(req, { dish, vegetarian: vegetarian ?? false, allergies, outcome: "not_found", ipAddress, country, visitorId });
        res.status(404).json({
          error: "Not Found",
          message:
            maybeError.message ||
            `We couldn't find a recipe for "${dish}". Try a different dish name.`,
        });
        return;
      }

      // --- 5. Validate response shape ---
      const recipeResult = SearchRecipeResponse.safeParse(parsed);
      if (!recipeResult.success) {
        req.log.error({ errors: recipeResult.error }, "AI response failed schema validation");
        await trackEvent(req, { dish, vegetarian: vegetarian ?? false, allergies, outcome: "error", ipAddress, country, visitorId });
        res.status(500).json({
          error: "Internal Server Error",
          message: "Received an incomplete recipe from AI. Please try again.",
        });
        return;
      }

      // --- 6. Track success and write to cache ---
      const recipe = recipeResult.data;
      await trackEvent(req, {
        dish,
        vegetarian: vegetarian ?? false,
        allergies,
        outcome: "success",
        cuisine: recipe.cuisine,
        difficulty: recipe.difficulty,
        ipAddress,
        country,
        visitorId,
      });

      try {
        await addDoc(collection(db, "cachedRecipes"), {
          cacheKey,
          dish: dish.toLowerCase().trim(),
          recipe,
          created_at: serverTimestamp()
        });
      } catch (e) {
        req.log.warn({ err: e }, "Failed to write recipe to cache");
      }

      res.json(recipe);
    } catch (aiErr: any) {
      if (aiErr.name === 'AbortError') {
        req.log.error({ dish }, "OpenAI request timeout");
        await trackEvent(req, { dish, vegetarian: vegetarian ?? false, allergies, outcome: "error", ipAddress, country, visitorId });
        res.status(504).json({
          error: "Gateway Timeout",
          message: "The AI took too long to respond. Please try again.",
        });
        return;
      }
      throw aiErr;
    }
  } catch (err: any) {
    req.log.error({ err, message: err?.message }, "Error in recipe search route");
    // Track unexpected errors so they don't disappear from analytics.
    const fallbackDish = String(req.body?.dish ?? "(unknown)").slice(0, 200);
    const fallbackVeg = Boolean(req.body?.vegetarian);
    const fallbackAllergies = typeof req.body?.allergies === "string" ? req.body.allergies : undefined;
    const isAbortError = err?.name === 'AbortError';
    await trackEvent(req, {
      dish: fallbackDish,
      vegetarian: fallbackVeg,
      allergies: fallbackAllergies,
      outcome: isAbortError ? "timeout" : "error",
      ipAddress,
      country,
      visitorId,
    });
    if (isAbortError) {
      res.status(504).json({
        error: "Gateway Timeout",
        message: "The AI took too long to respond. Please try again.",
      });
      return;
    }
    if (err?.status === 429 || err?.type === 'RateLimitError' || err?.name === 'RateLimitError') {
      res.status(429).json({
        error: "Rate Limit Exceeded",
        message: "We are currently receiving too many requests. Please try again in a moment.",
      });
      return;
    }
    res.status(500).json({
      error: "Internal Server Error",
      message: "Something went wrong. Please try again later.",
    });
  }
});

export default router;
