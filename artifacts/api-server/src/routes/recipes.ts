// ============================================================
// Recipe Route: /api/recipes/search
// Uses OpenAI to generate a recipe. Handles:
// - Allergy restrictions (substitutes ingredients)
// - Vegetarian preference (returns error if dish can't be made veg)
// - Analytics: logs every search event to the database
// ============================================================

import { Router, type IRouter, type Request } from "express";
import { openai, DEFAULT_CHAT_MODEL } from "@workspace/integrations-openai-ai-server";
import { SearchRecipeBody, SearchRecipeResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

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
async function getCountryFromIp(ip: string): Promise<string> {
  if (!ip || ip === "unknown" || ip.startsWith("127.") || ip.startsWith("::1") || ip === "::") {
    return "Unknown";
  }

  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) {
      const data = (await res.json()) as { country_name?: string; country?: string };
      return data.country_name || data.country || "Unknown";
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
  const country = await getCountryFromIp(ipAddress);

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

    const systemPrompt = `You are a professional chef. Provide accurate, safe, delicious recipes in valid JSON ONLY.
Requirements:
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

    // --- 3. Call OpenAI with timeout ---
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
    try {
      const completion = await openai.chat.completions.create({
        model: DEFAULT_CHAT_MODEL,
        max_completion_tokens: 2500,
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
      
      const rawContent = (completion.choices[0]?.message?.content ?? "").trim();

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

      // --- 6. Track success ---
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

      res.json(recipe);
    } catch (timeoutErr: any) {
      clearTimeout(timeoutId);
      if (timeoutErr.name === 'AbortError') {
        req.log.error({ dish }, "OpenAI request timeout");
        await trackEvent(req, { dish, vegetarian: vegetarian ?? false, allergies, outcome: "error", ipAddress, country, visitorId });
        res.status(504).json({
          error: "Gateway Timeout",
          message: "The AI took too long to respond. Please try again.",
        });
        return;
      }
      throw timeoutErr;
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
    res.status(500).json({
      error: "Internal Server Error",
      message: "Something went wrong. Please try again later.",
    });
  }
});

export default router;
