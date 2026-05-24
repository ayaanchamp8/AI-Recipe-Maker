import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const dummyDbUrl = "postgres://dummy:dummy@localhost:5432/dummy";
const isDummy = !process.env.DATABASE_URL;

if (isDummy) {
  console.warn("DATABASE_URL is not set. Database queries will use an in-memory mock.");
}

const dbData = {
  searchEvents: [] as any[],
  pageViews: [] as any[],
  feedbacks: [] as any[],
};

function processQuery(sql: string, params: any[]): any[] {
  const upperSql = sql.toUpperCase();

  // INSERTS
  if (upperSql.includes("INSERT INTO PAGE_VIEWS")) {
    dbData.pageViews.push({ path: params[0], created_at: new Date() });
    return [];
  }
  if (upperSql.includes("INSERT INTO SEARCH_EVENTS")) {
    dbData.searchEvents.push({
      dish: params[0], vegetarian: params[1], allergies: params[2], 
      outcome: params[3], cuisine: params[4], difficulty: params[5],
      ip_address: params[6], country: params[7], visitor_id: params[8], created_at: new Date()
    });
    return [];
  }
  // MOCK SOME INITIAL DATA
  if (dbData.searchEvents.length === 0) {
    dbData.searchEvents.push({ dish: 'Pasta', outcome: 'success', created_at: new Date() });
    dbData.pageViews.push({ path: '/', created_at: new Date() });
  }

  // SELECTS
  if (upperSql.includes("FROM SEARCH_EVENTS")) {
    if (upperSql.includes("COUNT(*) AS TOTAL")) {
      const successes = dbData.searchEvents.filter(e => e.outcome === 'success').length;
      const errors = dbData.searchEvents.length - successes;
      const uniqueDishes = new Set(dbData.searchEvents.map(e => e.dish?.toLowerCase())).size;
      return [{
        total: dbData.searchEvents.length,
        successes, errors, today: dbData.searchEvents.length,
        unique_dishes: uniqueDishes, vegetarian_searches: 0
      }];
    }
    if (upperSql.includes("LIMIT 10") && upperSql.includes("GROUP BY LOWER(DISH)")) {
      // popular
      return [{ dish: 'pasta', count: dbData.searchEvents.filter(e => e.outcome === 'success').length }];
    }
    if (upperSql.includes("GROUP BY DATE(CREATED_AT)")) {
      // by day
      return [{ day: 'Today', total: dbData.searchEvents.length, successes: dbData.searchEvents.filter(e=>e.outcome==='success').length }];
    }
    if (upperSql.includes("GROUP BY CUISINE")) {
      return [{ cuisine: 'Italian', count: dbData.searchEvents.length }];
    }
    if (upperSql.includes("GROUP BY OUTCOME")) {
      return [{ outcome: 'success', count: dbData.searchEvents.length }];
    }
    if (upperSql.includes("ORDER BY CREATED_AT DESC")) {
      // recent
      return dbData.searchEvents.slice(0, params[0] || 10).map(e => ({
        dish: e.dish || 'Unknown', outcome: e.outcome, time: e.created_at.toISOString()
      }));
    }
  }

  if (upperSql.includes("FROM PAGE_VIEWS")) {
    if (upperSql.includes("AS TODAY")) {
      return [{ total: dbData.pageViews.length, today: dbData.pageViews.length }];
    }
    if (upperSql.includes("GROUP BY DATE(CREATED_AT)")) {
      return [{ day: 'Today', date: new Date().toISOString(), visits: dbData.pageViews.length }];
    }
  }

  if (upperSql.includes("FROM RECIPE_FEEDBACK")) {
    return dbData.feedbacks;
  }

  return [];
}

export const pool = isDummy ? {
  query: async (...args: any[]) => {
    let sql: string;
    let params: any[] = [];
    if (typeof args[0] === 'object' && args[0] !== null) {
        sql = args[0].text;
        params = args[0].values || [];
    } else {
        sql = args[0];
        params = args[1] || [];
    }
    try {
       const res = processQuery(sql, params);
       return { rows: res };
    } catch(e) {
       return { rows: [] };
    }
  },
  connect: async () => ({
    query: async () => ({ rows: [] }),
    release: () => {},
  })
} as unknown as pg.Pool : new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });

export * from "./schema";
