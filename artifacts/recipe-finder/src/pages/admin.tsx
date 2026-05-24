// ============================================================
// Admin Analytics Dashboard — /admin
// Protected by a simple PIN. Shows all search analytics.
// ============================================================

import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { Link } from "wouter";
import { ArrowLeft, RefreshCw, TrendingUp, Search, ChefHat, CheckCircle, AlertCircle, Users, Eye, Database } from "lucide-react";

// Get PIN from environment variable, fallback to default for development
const SECRET = (import.meta.env.VITE_ADMIN_PIN || "133521").trim().replace(/[\r\n]+/g, "");
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = `${(import.meta.env.VITE_API_URL ?? "").trim()}/api`;

const COLORS = ["#f97316", "#22c55e", "#3b82f6", "#a855f7", "#f43f5e", "#eab308", "#06b6d4", "#ec4899", "#84cc16", "#f97316"];

async function fetchAnalytics(endpoint: string) {
  const res = await fetch(`${API}/analytics/${endpoint}`, {
    headers: {
      "x-analytics-secret": SECRET,
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
  return res.json();
}

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-lg sm:rounded-2xl border border-border/50 shadow-sm p-3 sm:p-5 flex items-start gap-3 sm:gap-4">
      <div className={`w-9 sm:w-11 h-9 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-4 sm:w-5 h-4 sm:h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-lg sm:text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">{label}</p>
        {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Admin() {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const [summary, setSummary] = useState<any>(null);
  const [visits, setVisits] = useState<{ total: number; today: number; byDay: any[] } | null>(null);
  const [popular, setPopular] = useState<any[]>([]);
  const [popularIngredients, setPopularIngredients] = useState<any[]>([]);
  const [byDayDish, setByDayDish] = useState<any[]>([]);
  const [byDayIngredient, setByDayIngredient] = useState<any[]>([]);
  const [cuisinesDish, setCuisinesDish] = useState<any[]>([]);
  const [cuisinesIngredient, setCuisinesIngredient] = useState<any[]>([]);
  const [outcomesDish, setOutcomesDish] = useState<any[]>([]);
  const [outcomesIngredient, setOutcomesIngredient] = useState<any[]>([]);
  
  const [recent, setRecent] = useState<any[]>([]);
  const [cachedRecipes, setCachedRecipes] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [recentLimit, setRecentLimit] = useState(100);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState<"dishes" | "ingredients">("dishes");

  const buildMergedDays = (searchDaysData: any[], visitMap: Record<string, number>, visitDays: any[]) => {
    const searchDays = new Set(searchDaysData.map((x: any) => x.day));
    const mergedDays = [...searchDaysData.map((x: any) => ({ ...x, visits: visitMap[x.day] ?? 0 }))];
    for (const vd of visitDays) {
      if (!searchDays.has(vd.day)) mergedDays.push({ day: vd.day, total: 0, successes: 0, visits: vd.visits });
    }
    mergedDays.sort((a: any, b: any) => a.day.localeCompare(b.day));
    return mergedDays;
  };

  const loadAll = useCallback(async (limit = 100) => {
    setLoading(true);
    try {
      const data = await fetchAnalytics(`dashboard?limit=${limit}`);
      const cacheData = await fetchAnalytics(`cache?limit=${limit}`);
      
      setSummary(data.summary);
      setPopular(data.popular);
      setPopularIngredients(data.popularIngredients);
      
      // Merge visits per day into the by-day search data
      const visitMap: Record<string, number> = {};
      const visitDays = data.visits.byDay ?? [];
      for (const vd of visitDays) visitMap[vd.day] = vd.visits;
      
      setByDayDish(buildMergedDays(data.byDaySearchDish, visitMap, visitDays));
      setByDayIngredient(buildMergedDays(data.byDaySearchIngredient, visitMap, visitDays));
      
      setCuisinesDish(data.cuisinesDish);
      setCuisinesIngredient(data.cuisinesIngredient);
      
      setOutcomesDish(data.outcomesDish.map((x: any) => ({ ...x, name: x.outcome })));
      setOutcomesIngredient(data.outcomesIngredient.map((x: any) => ({ ...x, name: x.outcome })));
      setRecent(data.recent);
      setCachedRecipes(cacheData);
      setFeedback(data.feedback);
      setUsers(data.users || []);
      setVisits({ total: data.visits.total, today: data.visits.today, byDay: data.visits.byDay });
      
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    const newLimit = recentLimit + 100;
    setLoadingMore(true);
    try {
      const r = await fetchAnalytics(`recent?limit=${newLimit}`);
      setRecent(r);
      setRecentLimit(newLimit);
    } finally {
      setLoadingMore(false);
    }
  }, [recentLimit]);

  // Load all data when unlocked
  useEffect(() => {
    if (unlocked) loadAll(recentLimit);
  }, [unlocked]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for real-time recent searches every 5 seconds
  useEffect(() => {
    if (!unlocked) return;
    
    const pollInterval = setInterval(async () => {
      try {
        const r = await fetchAnalytics(`recent?limit=${recentLimit}`);
        setRecent(r);
      } catch (e: any) {
        // Silently ignore network failures (Load failed) during polling 
        // to avoid spamming the console or user when offline/blocked.
        const msg = (e?.message || e?.toString() || "");
        if (
          msg.includes("Load failed") || 
          msg.includes("fetch") || 
          msg.includes("pattern") || 
          e?.name === "DOMException" || 
          e?.name === "TypeError"
        ) return;
        console.error("Error polling recent searches:", e);
      }
    }, 5000);
    
    return () => clearInterval(pollInterval);
  }, [unlocked, recentLimit]);

  const handleUnlock = () => {
    if (pin === SECRET) {
      setUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const isIngredientSearch = (dish: string) => dish && String(dish).startsWith("Recipe using ingredients:");
  const ingredientSearchesList = recent.filter(r => isIngredientSearch(r.dish));
  const dishSearchesList = recent.filter(r => !isIngredientSearch(r.dish));
  
  const activeSearchesList = activeTab === "dishes" ? dishSearchesList : ingredientSearchesList;
  const activeByDay = activeTab === "dishes" ? byDayDish : byDayIngredient;
  const activeCuisines = activeTab === "dishes" ? cuisinesDish : cuisinesIngredient;
  const activeOutcomes = activeTab === "dishes" ? outcomesDish : outcomesIngredient;

  // PIN gate
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl border border-border/50 p-10 w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <ChefHat className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-display text-foreground mb-1">Analytics</h1>
          <p className="text-sm text-muted-foreground mb-6">Enter the admin password to continue</p>
          <input
            type="password"
            value={pin}
            onChange={e => { setPin(e.target.value); setPinError(false); }}
            onKeyDown={e => e.key === "Enter" && handleUnlock()}
            placeholder="Password"
            className={`w-full px-4 py-3 rounded-xl border-2 text-center text-lg tracking-widest focus:outline-none focus:ring-4 transition-all ${
              pinError ? "border-red-400 focus:ring-red-100" : "border-border focus:border-primary focus:ring-primary/15"
            }`}
          />
          {pinError && <p className="text-red-500 text-sm mt-2">Incorrect password</p>}
          <button
            onClick={handleUnlock}
            className="mt-4 w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all active:scale-95"
          >
            Unlock Dashboard
          </button>
          <Link href={`${BASE}/`} className="block mt-4 text-sm text-muted-foreground hover:text-primary transition-colors">
            ← Back to Recipe Finder
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-border/40 px-3 sm:px-4 md:px-6 py-3 sm:py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link href={`${BASE}/`} className="inline-flex items-center gap-2 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors font-medium">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <div className="hidden sm:block h-5 w-px bg-border" />
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              <ChefHat className="w-4 sm:w-5 h-4 sm:h-5 text-primary flex-shrink-0" />
              <h1 className="font-semibold text-xs sm:text-sm md:text-base text-foreground truncate">Analytics Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex bg-muted/50 p-1 rounded-lg mr-2">
              <button
                onClick={() => setActiveTab("dishes")}
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${activeTab === "dishes" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Dishes
              </button>
              <button
                onClick={() => setActiveTab("ingredients")}
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${activeTab === "ingredients" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Ingredients
              </button>
            </div>
            {lastRefresh && (
              <span className="text-xs text-muted-foreground hidden md:block">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => loadAll()}
              disabled={loading}
              className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg sm:rounded-xl bg-primary/10 text-primary text-xs sm:text-sm font-medium hover:bg-primary/20 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-6 sm:space-y-8">

        {/* Visitor + Summary Cards */}
        {(summary || visits) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <StatCard label="Total Visitors" value={visits?.total ?? "—"} sub="All-time page views" icon={Eye} color="bg-sky-100 text-sky-600" />
            <StatCard label="Visitors Today" value={visits?.today ?? "—"} icon={TrendingUp} color="bg-indigo-100 text-indigo-600" />
            <StatCard label="Total Searches" value={summary?.total ?? "—"} icon={Search} color="bg-orange-100 text-orange-600" />
            <StatCard label="Successful Recipes" value={summary?.successes ?? "—"} sub={summary ? `${summary.successRate}% success rate` : undefined} icon={CheckCircle} color="bg-green-100 text-green-600" />
            
            <StatCard label="Cached Recipes" value={summary?.cachedRecipesCount ?? "—"} sub="Skipped AI generation" icon={Database} color="bg-amber-100 text-amber-600" />
            <StatCard label="Database Storage" value="~1 GiB" sub="Free auto-scaling Firestore tier" icon={Database} color="bg-slate-100 text-slate-600" />
            
            <StatCard label="Dish Searches" value={summary?.dishSearches ?? "—"} sub="Direct dish name lookups" icon={Search} color="bg-orange-100 text-orange-600" />
            <StatCard label="Ingredient Searches" value={summary?.ingredientsSearches ?? "—"} sub="Created using 'My Ingredients'" icon={ChefHat} color="bg-rose-100 text-rose-600" />
            <StatCard label="Today's Searches" value={summary?.today ?? "—"} icon={Search} color="bg-blue-100 text-blue-600" />
            <StatCard label="Unique Dishes" value={summary?.uniqueDishes ?? "—"} icon={ChefHat} color="bg-purple-100 text-purple-600" />
            <StatCard label="Vegetarian Requests" value={summary?.vegetarianSearches ?? "—"} icon={Users} color="bg-emerald-100 text-emerald-600" />
            <StatCard label="Errors / Not Found" value={summary?.errors ?? "—"} icon={AlertCircle} color="bg-red-100 text-red-600" />
          </div>
        )}

        {/* Visitors & Searches Over Time */}
        <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6">
          <h2 className="font-semibold text-foreground mb-4">Visitors & Searches (Last 14 Days)</h2>
          {activeByDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={activeByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="visits" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 4 }} name="Visitors" />
                <Line type="monotone" dataKey="total" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} name="Searches" />
                <Line type="monotone" dataKey="successes" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} name="Successful" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-muted-foreground bg-slate-50/50 rounded-xl border border-dashed border-border/60">
              No data for this time period
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Popular Searches */}
          <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6">
            <h2 className="font-semibold text-foreground mb-4">Most Popular {activeTab === "dishes" ? "Dishes" : "Ingredients"}</h2>
            {(activeTab === "dishes" ? popular : popularIngredients).length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={activeTab === "dishes" ? popular : popularIngredients} layout="vertical">
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey={activeTab === "dishes" ? "dish" : "ingredient"} width={120} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Searches" radius={[0, 6, 6, 0]}>
                    {(activeTab === "dishes" ? popular : popularIngredients).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground bg-slate-50/50 rounded-xl border border-dashed border-border/60">
                Not enough searches yet
              </div>
            )}
          </div>

          {/* Outcomes Pie */}
          <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6">
            <h2 className="font-semibold text-foreground mb-4">Search Outcomes</h2>
            {activeOutcomes.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={activeOutcomes} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {activeOutcomes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground bg-slate-50/50 rounded-xl border border-dashed border-border/60">
                No outcomes logged yet
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Cuisines */}
          <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6 md:col-span-2">
            <h2 className="font-semibold text-foreground mb-4">Top Cuisines</h2>
            {activeCuisines.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={activeCuisines}>
                  <XAxis dataKey="cuisine" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Searches" radius={[6, 6, 0, 0]}>
                    {activeCuisines.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground bg-slate-50/50 rounded-xl border border-dashed border-border/60">
                No cuisine data found
              </div>
            )}
          </div>
        </div>

        {/* Recent Searches Table */}
        <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <h2 className="font-semibold text-sm sm:text-base text-foreground">
                Recent Searches
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-normal text-muted-foreground">({activeSearchesList.length} shown)</span>
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="text-xs sm:text-sm text-primary hover:text-primary/80 font-medium disabled:opacity-50 transition-colors ml-4"
              >
                {loadingMore ? "Loading..." : "Load 100 more"}
              </button>
            </div>
          </div>
          {activeSearchesList.length > 0 ? (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-left">
                    <th className="pb-3 text-muted-foreground font-medium pr-4">Time</th>
                    <th className="pb-3 text-muted-foreground font-medium pr-4">{activeTab === "dishes" ? "Dish" : "Ingredients"}</th>
                    <th className="pb-3 text-muted-foreground font-medium pr-4">Country</th>
                    <th className="pb-3 text-muted-foreground font-medium pr-4">IP Address</th>
                    <th className="pb-3 text-muted-foreground font-medium pr-4">Visitor ID</th>
                    <th className="pb-3 text-muted-foreground font-medium pr-4">Cuisine</th>
                    <th className="pb-3 text-muted-foreground font-medium pr-4">Difficulty</th>
                    <th className="pb-3 text-muted-foreground font-medium pr-4">Vegetarian</th>
                    <th className="pb-3 text-muted-foreground font-medium">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {activeSearchesList.map((row, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pr-4 text-muted-foreground text-xs">{row.time}</td>
                      <td className="py-2.5 pr-4 font-medium text-foreground capitalize">
                        {activeTab === "ingredients" ? row.dish.replace(/^Recipe using ingredients:\s*/i, "") : row.dish}
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground text-xs">{row.country ?? "Unknown"}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground text-xs font-mono">{row.ip_address ?? "—"}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground text-xs font-mono">{row.visitor_id ? row.visitor_id.substring(0, 8) : "—"}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{row.cuisine ?? "—"}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{row.difficulty ?? "—"}</td>
                      <td className="py-2.5 pr-4">{row.vegetarian ? "🌿 Yes" : "No"}</td>
                      <td className="py-2.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          row.outcome === "success" ? "bg-green-100 text-green-700"
                          : row.outcome === "not_vegetarian" ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                        }`}>
                          {row.outcome}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground bg-slate-50/50 rounded-xl border border-dashed border-border/60">
              <Search className="w-8 h-8 mb-2 opacity-40" />
              <p>No {activeTab} searches yet</p>
            </div>
          )}
        </div>

        {/* Cached Recipes Table */}
        <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-4 sm:p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm sm:text-base text-foreground flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-500" />
              Cached Recipes <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{cachedRecipes.length} Total</span>
            </h2>
          </div>
          
          {cachedRecipes.length > 0 ? (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-left">
                    <th className="pb-3 text-muted-foreground font-medium px-4 sm:px-0 pr-4">Generated At</th>
                    <th className="pb-3 text-muted-foreground font-medium pr-4">Dish</th>
                    <th className="pb-3 text-muted-foreground font-medium pr-4">Cache Key</th>
                    <th className="pb-3 text-muted-foreground font-medium pr-4">Cuisine</th>
                    <th className="pb-3 text-muted-foreground font-medium pr-4">Difficulty</th>
                    <th className="pb-3 text-muted-foreground font-medium pr-4">Time (P/C)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {cachedRecipes.map((row, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-4 sm:px-0 pr-4 text-muted-foreground text-xs whitespace-nowrap">{row.generatedAt}</td>
                      <td className="py-2.5 pr-4 font-medium text-foreground capitalize truncate max-w-[150px]">{row.dish}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground text-[10px] font-mono truncate max-w-[150px]">{row.cacheKey}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{row.cuisine || "—"}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">{row.difficulty || "—"}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">{row.prepTime}m / {row.cookTime}m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground bg-slate-50/50 rounded-xl border border-dashed border-border/60">
              <Database className="w-8 h-8 mb-2 opacity-40 text-amber-500" />
              <p>No recipes cached yet</p>
            </div>
          )}
        </div>

        {/* Recipe Feedback */}
        <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-4 sm:p-6">
          <h2 className="font-semibold text-sm sm:text-base text-foreground mb-4">Recipe Feedback</h2>
          {feedback.length > 0 ? (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-left">
                    <th className="pb-3 text-muted-foreground font-medium pr-4">Time</th>
                    <th className="pb-3 text-muted-foreground font-medium pr-4">Recipe</th>
                    <th className="pb-3 text-muted-foreground font-medium pr-4">User</th>
                    <th className="pb-3 text-muted-foreground font-medium pr-4">Rating</th>
                    <th className="pb-3 text-muted-foreground font-medium">Comment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {feedback.map((row, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pr-4 text-muted-foreground text-xs">{row.time}</td>
                      <td className="py-2.5 pr-4 font-medium text-foreground capitalize">{row.recipeName}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{row.userName}</td>
                      <td className="py-2.5 pr-4">
                        <span className="inline-flex items-center gap-1">
                          {'⭐'.repeat(row.rating)}
                          <span className="text-muted-foreground text-xs">({row.rating}/5)</span>
                        </span>
                      </td>
                      <td className="py-2.5 text-muted-foreground text-sm">{row.comment || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-muted-foreground bg-slate-50/50 rounded-xl border border-dashed border-border/60">
              No feedback collected yet
            </div>
          )}
        </div>

        {/* Registered Users */}
        <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-4 sm:p-6">
          <h2 className="font-semibold text-sm sm:text-base text-foreground mb-4">Registered Users & Saved Dishes</h2>
          {users.length > 0 ? (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-left">
                    <th className="pb-3 text-muted-foreground font-medium pr-4">Name</th>
                    <th className="pb-3 text-muted-foreground font-medium pr-4">Email</th>
                    <th className="pb-3 text-muted-foreground font-medium pr-4">Saved Dishes</th>
                    <th className="pb-3 text-muted-foreground font-medium">Last Login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {users.map((row, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pr-4 font-medium text-foreground">{row.displayName}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{row.email}</td>
                      <td className="py-2.5 pr-4 text-foreground font-semibold">{row.savedRecipesCount}</td>
                      <td className="py-2.5 text-muted-foreground text-sm">{row.lastLogin ? new Date(row.lastLogin).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-muted-foreground bg-slate-50/50 rounded-xl border border-dashed border-border/60">
              <Users className="w-8 h-8 mb-2 opacity-40" />
              <p>No registered users yet</p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
