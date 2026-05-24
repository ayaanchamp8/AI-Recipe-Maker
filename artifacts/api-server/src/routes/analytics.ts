import { Router, type IRouter } from "express";
import { timingSafeEqual } from "node:crypto";
import { db } from "../firebase";
import { collection, query, orderBy, limit as fsLimit, getDocs, addDoc, serverTimestamp, getCountFromServer } from "firebase/firestore";

const router: IRouter = Router();

function safeCompare(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function checkAuth(req: any, res: any): boolean {
  const secret = process.env["ANALYTICS_SECRET"] || "133521";
  if (!secret) {
    req.log?.error("ANALYTICS_SECRET environment variable not set");
    res.status(500).json({ error: "Server misconfiguration" });
    return false;
  }
  const raw = req.headers["x-analytics-secret"];
  const provided = Array.isArray(raw) ? raw[0] : raw;
  if (typeof provided !== "string" || !safeCompare(provided, secret)) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function safeConvertDate(val: any): Date {
  if (!val) return new Date();
  if (typeof val.toDate === "function") {
    try {
      return val.toDate();
    } catch (e) {
      // Ignore error, fallback below
    }
  }
  if (val instanceof Date) {
    return val;
  }
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  if (typeof val === "object" && typeof val.seconds === "number") {
    const d = new Date(val.seconds * 1000);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

// Memory optimization: just get the latest 5000 search events to aggregate
async function getSearchEvents() {
  const eventsSnap = await getDocs(query(collection(db, "searchEvents"), orderBy("created_at", "desc"), fsLimit(5000)));
  return eventsSnap.docs.map(doc => {
    const data = doc.data();
    return {
      dish: data.dish || '',
      vegetarian: data.vegetarian || false,
      allergies: data.allergies || null,
      outcome: data.outcome || 'error',
      cuisine: data.cuisine || null,
      difficulty: data.difficulty || null,
      ip_address: data.ip_address || null,
      country: data.country || null,
      visitor_id: data.visitor_id || null,
      created_at: safeConvertDate(data.created_at),
    };
  });
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

router.get("/analytics/summary", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const events = await getSearchEvents();
    let successes = 0;
    let errors = 0;
    let today = 0;
    let vegetarianSearches = 0;
    let ingredientsSearches = 0;
    let dishSearches = 0;
    const uniqueDishes = new Set<string>();
    
    const nowStart = startOfDay(new Date());

    events.forEach(e => {
      if (e.outcome === 'success') successes++;
      else errors++;
      
      if (startOfDay(e.created_at).getTime() === nowStart.getTime()) today++;
      if (e.dish) {
        const dLower = e.dish.toLowerCase();
        uniqueDishes.add(dLower);
        if (dLower.includes("recipe using ingredients:")) {
          ingredientsSearches++;
        } else {
          dishSearches++;
        }
      }
      if (e.vegetarian) vegetarianSearches++;
    });

    res.json({
      total: events.length,
      successes,
      errors,
      today,
      uniqueDishes: uniqueDishes.size,
      vegetarianSearches,
      ingredientsSearches,
      dishSearches,
      successRate: events.length > 0 ? Math.round((successes / events.length) * 100) : 0,
    });
  } catch (err) {
    req.log?.error({ err }, "Error in /analytics/summary");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/analytics/popular-ingredients", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const events = await getSearchEvents();
    const countMap: Record<string, number> = {};
    events.forEach(e => {
      if (e.outcome === 'success' && e.dish) {
        const dLower = e.dish.toLowerCase();
        const prefixIndex = dLower.indexOf("recipe using ingredients:");
        if (prefixIndex !== -1) {
          const rawIngredients = e.dish.substring(prefixIndex + "recipe using ingredients:".length);
          const parts = rawIngredients.split(",");
          parts.forEach((p: string) => {
            const ing = p.trim();
            if (ing) {
              const cap = ing.charAt(0).toUpperCase() + ing.slice(1);
              countMap[cap] = (countMap[cap] || 0) + 1;
            }
          });
        }
      }
    });

    const popular = Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ingredient, count]) => ({ ingredient, count }));

    res.json(popular);
  } catch (err) {
    req.log?.error({ err }, "Error in /analytics/popular-ingredients");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/analytics/popular", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const events = await getSearchEvents();
    const countMap: Record<string, number> = {};
    events.forEach(e => {
      if (e.outcome === 'success' && e.dish) {
        const d = e.dish.toLowerCase();
        countMap[d] = (countMap[d] || 0) + 1;
      }
    });

    const popular = Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([dish, count]) => ({ dish, count }));

    res.json(popular);
  } catch (err) {
    req.log?.error({ err }, "Error in /analytics/popular");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/analytics/by-day", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const events = await getSearchEvents();
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const counts: Record<string, { total: number, successes: number, dateObj: Date }> = {};
    events.forEach(e => {
      if (e.created_at >= fourteenDaysAgo) {
        const dStr = e.created_at.toISOString().split('T')[0];
        if (!counts[dStr]) counts[dStr] = { total: 0, successes: 0, dateObj: e.created_at };
        counts[dStr].total++;
        if (e.outcome === 'success') counts[dStr].successes++;
      }
    });

    const response = Object.values(counts)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .map(c => {
        const parts = c.dateObj.toDateString().split(' '); // "Mon Jan 01 2024"
        return {
           day: `${parts[1] || ''} ${parts[2] || ''}`, 
           total: c.total,
           successes: c.successes
        };
      });

    res.json(response);
  } catch (err) {
    req.log?.error({ err }, "Error in /analytics/by-day");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/analytics/cuisines", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const events = await getSearchEvents();
    const countMap: Record<string, number> = {};
    events.forEach(e => {
      if (e.outcome === 'success' && e.cuisine) {
        countMap[e.cuisine] = (countMap[e.cuisine] || 0) + 1;
      }
    });

    const cuisines = Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([cuisine, count]) => ({ cuisine, count }));

    res.json(cuisines);
  } catch (err) {
    req.log?.error({ err }, "Error in /analytics/cuisines");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/analytics/outcomes", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const events = await getSearchEvents();
    const countMap: Record<string, number> = {};
    events.forEach(e => {
      if (e.outcome) {
        countMap[e.outcome] = (countMap[e.outcome] || 0) + 1;
      }
    });

    const outcomes = Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .map(([outcome, count]) => ({ outcome, count }));

    res.json(outcomes);
  } catch (err) {
    req.log?.error({ err }, "Error in /analytics/outcomes");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/analytics/recent", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const limit = Math.min(parseInt((req.query["limit"] as string) ?? "100", 10), 500);
    const eventsSnap = await getDocs(query(collection(db, "searchEvents"), orderBy("created_at", "desc"), fsLimit(limit)));
    
    const response = eventsSnap.docs.map(doc => {
      const data = doc.data();
      const d = safeConvertDate(data.created_at);
      const parts = d.toDateString().split(' ');
      const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      return {
        dish: data.dish || 'Unknown',
        vegetarian: !!data.vegetarian,
        allergies: data.allergies || null,
        outcome: data.outcome || 'unknown',
        cuisine: data.cuisine || null,
        difficulty: data.difficulty || null,
        country: data.country || null,
        ip_address: data.ip_address || null,
        visitor_id: data.visitor_id || null,
        time: `${parts[1] || ''} ${parts[2] || ''} ${timeStr}`
      };
    });

    res.json(response);
  } catch (err) {
    req.log?.error({ err }, "Error in /analytics/recent");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/analytics/track-visit", async (req, res) => {
  try {
    const path = (req.body?.path as string | undefined)?.slice(0, 500) ?? "/";
    await addDoc(collection(db, "pageViews"), {
      path,
      created_at: serverTimestamp()
    });
    res.status(204).end();
  } catch (err) {
    req.log?.error({ err }, "track-visit error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/analytics/visits", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const viewsSnap = await getDocs(query(collection(db, "pageViews"), orderBy("created_at", "desc"), fsLimit(5000)));
    let total = 0;
    let today = 0;
    const nowStart = startOfDay(new Date());
    
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    const counts: Record<string, { visits: number, dateObj: Date }> = {};

    viewsSnap.docs.forEach(doc => {
      const data = doc.data();
      const createdAt = safeConvertDate(data.created_at);
      total++;
      if (startOfDay(createdAt).getTime() === nowStart.getTime()) {
        today++;
      }
      
      if (createdAt >= fourteenDaysAgo) {
        const dStr = createdAt.toISOString().split('T')[0];
        if (!counts[dStr]) counts[dStr] = { visits: 0, dateObj: createdAt };
        counts[dStr].visits++;
      }
    });

    const responseDays = Object.values(counts)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .map(c => {
        const parts = c.dateObj.toDateString().split(' ');
        return {
           day: `${parts[1] || ''} ${parts[2] || ''}`, 
           visits: c.visits
        };
      });

    res.json({
      total,
      today,
      byDay: responseDays
    });
  } catch (err) {
    req.log?.error({ err }, "Error in /analytics/visits");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/analytics/feedback", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 500);
    const fbSnap = await getDocs(query(collection(db, "feedbacks"), orderBy("created_at", "desc"), fsLimit(limit)));
    
    const response = fbSnap.docs.map(doc => {
      const data = doc.data();
      const d = safeConvertDate(data.created_at);
      const id = doc.id;
      return {
        id: id,
        recipeName: data.recipeName || 'Unknown',
        userName: data.userName || 'Anonymous',
        rating: data.rating || 0,
        comment: data.comment || '',
        time: d.toISOString().replace('T', ' ').split('.')[0]
      };
    });
    
    res.json(response);
  } catch (err) {
    req.log?.error({ err }, "Error in /analytics/feedback");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/analytics/dashboard", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const limitParams = Math.min(parseInt((req.query["limit"] as string) ?? "100", 10), 500);

    // Fetch collections IN PARALLEL but only ONCE
    const [events, viewsSnap, fbSnap, recentSnap, usersSnap, cachedCountSnap] = await Promise.all([
      getSearchEvents(),
      getDocs(query(collection(db, "pageViews"), orderBy("created_at", "desc"), fsLimit(5000))),
      getDocs(query(collection(db, "feedbacks"), orderBy("created_at", "desc"), fsLimit(limitParams))),
      getDocs(query(collection(db, "searchEvents"), orderBy("created_at", "desc"), fsLimit(limitParams))),
      getDocs(query(collection(db, "users"), fsLimit(limitParams))),
      getCountFromServer(collection(db, "cachedRecipes")).catch(() => ({ data: () => ({ count: 0 }) }))
    ]);

    const cachedRecipesCount = cachedCountSnap.data().count;

    // Users
    const users = await Promise.all(usersSnap.docs.map(async (docSnap) => {
      const data = docSnap.data();
      const savedSnap = await getDocs(query(collection(db, `users/${docSnap.id}/savedRecipes`), fsLimit(100)));
      return {
        uid: data.uid || docSnap.id,
        email: data.email || "Unknown",
        displayName: data.displayName || "Anonymous",
        photoURL: data.photoURL || null,
        lastLogin: data.lastLogin ? safeConvertDate(data.lastLogin).toISOString() : null,
        savedRecipesCount: savedSnap.size,
      };
    }));

    // 1. Visit Stats
    let totalVisits = 0;
    let todayVisits = 0;
    const nowStart = startOfDay(new Date());
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    const visitCounts: Record<string, { visits: number, dateObj: Date }> = {};
    viewsSnap.docs.forEach(doc => {
      const data = doc.data();
      const createdAt = safeConvertDate(data.created_at);
      totalVisits++;
      if (startOfDay(createdAt).getTime() === nowStart.getTime()) todayVisits++;
      if (createdAt >= fourteenDaysAgo) {
        const dStr = createdAt.toISOString().split('T')[0];
        if (!visitCounts[dStr]) visitCounts[dStr] = { visits: 0, dateObj: createdAt };
        visitCounts[dStr].visits++;
      }
    });

    const byDayVisits = Object.values(visitCounts)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .map(c => {
        const parts = c.dateObj.toDateString().split(' ');
        return { day: `${parts[1] || ''} ${parts[2] || ''}`, visits: c.visits };
      });
      
    const visits = { total: totalVisits, today: todayVisits, byDay: byDayVisits };

    // 2. Search Summary
    let successes = 0, errors = 0, today = 0, vegetarianSearches = 0, ingredientsSearches = 0, dishSearches = 0;
    const uniqueDishes = new Set<string>();
    
    // Separate count maps
    const dishCountMap: Record<string, number> = {};
    const ingredientCountMap: Record<string, number> = {};
    
    // By Day
    const dayCountsDish: Record<string, { total: number, successes: number, dateObj: Date }> = {};
    const dayCountsIngredient: Record<string, { total: number, successes: number, dateObj: Date }> = {};
    
    // Cuisine
    const cuisineCountMapDish: Record<string, number> = {};
    const cuisineCountMapIngredient: Record<string, number> = {};
    
    // Outcome
    const outcomeCountMapDish: Record<string, number> = {};
    const outcomeCountMapIngredient: Record<string, number> = {};

    events.forEach(e => {
      const isIngredient = e.dish?.toLowerCase().includes("recipe using ingredients:");
      
      // Summary
      if (e.outcome === 'success') successes++;
      else errors++;
      if (startOfDay(e.created_at).getTime() === nowStart.getTime()) today++;
      if (e.vegetarian) vegetarianSearches++;
      
      if (e.dish) {
        const dLower = e.dish.toLowerCase();
        uniqueDishes.add(dLower);
        if (isIngredient) {
          ingredientsSearches++;
          const parts = dLower.substring(dLower.indexOf(":") + 1).split(",");
          parts.forEach((p: string) => {
             const ing = p.trim();
             if (ing) {
               const cap = ing.charAt(0).toUpperCase() + ing.slice(1);
               ingredientCountMap[cap] = (ingredientCountMap[cap] || 0) + 1;
             }
          });
        } else {
          dishSearches++;
          if (e.outcome === 'success') dishCountMap[dLower] = (dishCountMap[dLower] || 0) + 1;
        }
      }

      // By Day Searches
      if (e.created_at >= fourteenDaysAgo) {
        const dStr = e.created_at.toISOString().split('T')[0];
        const targetMap = isIngredient ? dayCountsIngredient : dayCountsDish;
        
        if (!targetMap[dStr]) targetMap[dStr] = { total: 0, successes: 0, dateObj: e.created_at };
        targetMap[dStr].total++;
        if (e.outcome === 'success') targetMap[dStr].successes++;
      }

      // Cuisine
      if (e.outcome === 'success' && e.cuisine) {
        const targetMap = isIngredient ? cuisineCountMapIngredient : cuisineCountMapDish;
        targetMap[e.cuisine] = (targetMap[e.cuisine] || 0) + 1;
      }
      
      // Outcome
      if (e.outcome) {
        const targetMap = isIngredient ? outcomeCountMapIngredient : outcomeCountMapDish;
        targetMap[e.outcome] = (targetMap[e.outcome] || 0) + 1;
      }
    });

    const summary = {
      total: events.length,
      successes, errors, today, uniqueDishes: uniqueDishes.size,
      vegetarianSearches, ingredientsSearches, dishSearches,
      successRate: events.length > 0 ? Math.round((successes / events.length) * 100) : 0,
      cachedRecipesCount,
    };

    const popular = Object.entries(dishCountMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([dish, count]) => ({ dish, count }));
    const popularIngredients = Object.entries(ingredientCountMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([ingredient, count]) => ({ ingredient, count }));
    
    const byDaySearchDish = Object.values(dayCountsDish).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime()).map(c => {
        const parts = c.dateObj.toDateString().split(' ');
        return { day: `${parts[1] || ''} ${parts[2] || ''}`, total: c.total, successes: c.successes };
    });
    const byDaySearchIngredient = Object.values(dayCountsIngredient).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime()).map(c => {
        const parts = c.dateObj.toDateString().split(' ');
        return { day: `${parts[1] || ''} ${parts[2] || ''}`, total: c.total, successes: c.successes };
    });
    
    const cuisinesDish = Object.entries(cuisineCountMapDish).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([cuisine, count]) => ({ cuisine, count }));
    const cuisinesIngredient = Object.entries(cuisineCountMapIngredient).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([cuisine, count]) => ({ cuisine, count }));
    
    const outcomesDish = Object.entries(outcomeCountMapDish).sort((a, b) => b[1] - a[1]).map(([outcome, count]) => ({ outcome, count }));
    const outcomesIngredient = Object.entries(outcomeCountMapIngredient).sort((a, b) => b[1] - a[1]).map(([outcome, count]) => ({ outcome, count }));

    // Recent Searches
    const recent = recentSnap.docs.map(doc => {
      const data = doc.data();
      const d = safeConvertDate(data.created_at);
      const parts = d.toDateString().split(' ');
      const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      return {
        dish: data.dish || 'Unknown', vegetarian: !!data.vegetarian, allergies: data.allergies || null,
        outcome: data.outcome || 'unknown', cuisine: data.cuisine || null, difficulty: data.difficulty || null,
        country: data.country || null, ip_address: data.ip_address || null, visitor_id: data.visitor_id || null,
        time: `${parts[1] || ''} ${parts[2] || ''} ${timeStr}`
      };
    });

    // Feedback
    const feedback = fbSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id, recipeName: data.recipeName || 'Unknown', userName: data.userName || 'Anonymous',
        rating: data.rating || 0, comment: data.comment || '',
        time: safeConvertDate(data.created_at).toISOString().replace('T', ' ').split('.')[0]
      };
    });

    res.json({
      summary, visits, popular, popularIngredients,
      byDaySearchDish, byDaySearchIngredient, 
      cuisinesDish, cuisinesIngredient, 
      outcomesDish, outcomesIngredient, 
      recent, feedback, users
    });

  } catch (err) {
    req.log?.error({ err }, "Error in /analytics/dashboard");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/analytics/cache", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const limitParams = Math.min(parseInt((req.query["limit"] as string) ?? "50", 10), 100);
    const cacheSnap = await getDocs(query(collection(db, "cachedRecipes"), orderBy("created_at", "desc"), fsLimit(limitParams)));
    
    const cachedItems = cacheSnap.docs.map(doc => {
      const data = doc.data();
      const created_at = data.created_at?.toDate ? data.created_at.toDate() : new Date();
      return {
        id: doc.id,
        dish: data.dish || 'Unknown',
        cacheKey: data.cacheKey || 'Unknown',
        cuisine: data?.recipe?.cuisine || 'Unknown',
        difficulty: data?.recipe?.difficulty || 'Unknown',
        prepTime: data?.recipe?.prepTime || '0',
        cookTime: data?.recipe?.cookTime || '0',
        generatedAt: created_at.toISOString().replace('T', ' ').split('.')[0],
      };
    });

    res.json(cachedItems);
  } catch (err) {
    req.log?.error({ err }, "Error in /analytics/cache");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
