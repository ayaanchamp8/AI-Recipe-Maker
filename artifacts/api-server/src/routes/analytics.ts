import { Router, type IRouter } from "express";
import { timingSafeEqual } from "node:crypto";
import { db } from "../firebase";
import { collection, query, orderBy, limit as fsLimit, getDocs, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";

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
    req.log.error("ANALYTICS_SECRET environment variable not set");
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
      created_at: data.created_at?.toDate() || new Date(),
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
    const uniqueDishes = new Set<string>();
    
    const nowStart = startOfDay(new Date());

    events.forEach(e => {
      if (e.outcome === 'success') successes++;
      else errors++;
      
      if (startOfDay(e.created_at).getTime() === nowStart.getTime()) today++;
      if (e.dish) uniqueDishes.add(e.dish.toLowerCase());
      if (e.vegetarian) vegetarianSearches++;
    });

    res.json({
      total: events.length,
      successes,
      errors,
      today,
      uniqueDishes: uniqueDishes.size,
      vegetarianSearches,
      successRate: events.length > 0 ? Math.round((successes / events.length) * 100) : 0,
    });
  } catch (err) {
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
           day: `${parts[1]} ${parts[2]}`, 
           total: c.total,
           successes: c.successes
        };
      });

    res.json(response);
  } catch (err) {
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
      const d = data.created_at?.toDate() || new Date();
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
        time: `${parts[1]} ${parts[2]} ${timeStr}`
      };
    });

    res.json(response);
  } catch (err) {
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
    req.log.error({ err }, "track-visit error");
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
      const createdAt = data.created_at?.toDate() || new Date();
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
           day: `${parts[1]} ${parts[2]}`, 
           visits: c.visits
        };
      });

    res.json({
      total,
      today,
      byDay: responseDays
    });
  } catch (err) {
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
      const d = data.created_at?.toDate() || new Date();
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
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
