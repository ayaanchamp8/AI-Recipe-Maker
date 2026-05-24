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
import { ArrowLeft, RefreshCw, TrendingUp, Search, ChefHat, CheckCircle, AlertCircle, Users, Eye } from "lucide-react";

// Get PIN from environment variable, fallback to default for development
const SECRET = import.meta.env.VITE_ADMIN_PIN || "133521";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = `${import.meta.env.VITE_API_URL ?? ""}/api`;

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
  const [byDay, setByDay] = useState<any[]>([]);
  const [cuisines, setCuisines] = useState<any[]>([]);
  const [outcomes, setOutcomes] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [recentLimit, setRecentLimit] = useState(100);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadAll = useCallback(async (limit = 100) => {
    setLoading(true);
    try {
      const [s, p, d, c, o, r, v, fb] = await Promise.all([
        fetchAnalytics("summary"),
        fetchAnalytics("popular"),
        fetchAnalytics("by-day"),
        fetchAnalytics("cuisines"),
        fetchAnalytics("outcomes"),
        fetchAnalytics(`recent?limit=${limit}`),
        fetchAnalytics("visits"),
        fetchAnalytics("feedback?limit=50"),
      ]);
      setSummary(s);
      setPopular(p);
      // Merge visits per day into the by-day search data
      const visitMap: Record<string, number> = {};
      for (const vd of v.byDay ?? []) visitMap[vd.day] = vd.visits;
      // Also include days that have visits but no searches
      const searchDays = new Set(d.map((x: any) => x.day));
      const mergedDays = [...d.map((x: any) => ({ ...x, visits: visitMap[x.day] ?? 0 }))];
      for (const vd of v.byDay ?? []) {
        if (!searchDays.has(vd.day)) mergedDays.push({ day: vd.day, total: 0, successes: 0, visits: vd.visits });
      }
      mergedDays.sort((a: any, b: any) => a.day.localeCompare(b.day));
      setByDay(mergedDays);
      setCuisines(c);
      setOutcomes(o.map((x: any) => ({ ...x, name: x.outcome })));
      setRecent(r);
      setFeedback(fb);
      setVisits({ total: v.total, today: v.today, byDay: v.byDay });
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
      } catch (e) {
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
            <StatCard label="Today's Searches" value={summary?.today ?? "—"} icon={Search} color="bg-blue-100 text-blue-600" />
            <StatCard label="Unique Dishes" value={summary?.uniqueDishes ?? "—"} icon={ChefHat} color="bg-purple-100 text-purple-600" />
            <StatCard label="Vegetarian Requests" value={summary?.vegetarianSearches ?? "—"} icon={Users} color="bg-emerald-100 text-emerald-600" />
            <StatCard label="Errors / Not Found" value={summary?.errors ?? "—"} icon={AlertCircle} color="bg-red-100 text-red-600" />
          </div>
        )}

        {/* Visitors & Searches Over Time */}
        {byDay.length > 0 && (
          <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6">
            <h2 className="font-semibold text-foreground mb-4">Visitors & Searches (Last 14 Days)</h2>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={byDay}>
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
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Popular Dishes */}
          {popular.length > 0 && (
            <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6">
              <h2 className="font-semibold text-foreground mb-4">Most Popular Dishes</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={popular} layout="vertical">
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="dish" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Searches" radius={[0, 6, 6, 0]}>
                    {popular.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Outcomes Pie */}
          {outcomes.length > 0 && (
            <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6">
              <h2 className="font-semibold text-foreground mb-4">Search Outcomes</h2>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={outcomes} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {outcomes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Cuisines */}
        {cuisines.length > 0 && (
          <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6">
            <h2 className="font-semibold text-foreground mb-4">Top Cuisines</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cuisines}>
                <XAxis dataKey="cuisine" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Searches" radius={[6, 6, 0, 0]}>
                  {cuisines.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent Searches Table */}
        {recent.length > 0 && (
          <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 mb-4">
              <h2 className="font-semibold text-sm sm:text-base text-foreground">
                Recent Searches
                <span className="ml-2 text-xs sm:text-sm font-normal text-muted-foreground">({recent.length} shown)</span>
              </h2>
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="text-xs sm:text-sm text-primary hover:text-primary/80 font-medium disabled:opacity-50 transition-colors"
              >
                {loadingMore ? "Loading..." : "Load 100 more"}
              </button>
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-left">
                    <th className="pb-3 text-muted-foreground font-medium pr-4">Time</th>
                    <th className="pb-3 text-muted-foreground font-medium pr-4">Dish</th>
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
                  {recent.map((row, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pr-4 text-muted-foreground text-xs">{row.time}</td>
                      <td className="py-2.5 pr-4 font-medium text-foreground capitalize">{row.dish}</td>
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
          </div>
        )}

        {/* Recipe Feedback */}
        {feedback.length > 0 && (
          <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-4 sm:p-6">
            <h2 className="font-semibold text-sm sm:text-base text-foreground mb-4">Recipe Feedback</h2>
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
          </div>
        )}

        {/* Empty state */}
        {!loading && summary?.total === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No searches yet</p>
            <p className="text-sm mt-1">Data will appear here once users start searching for recipes.</p>
          </div>
        )}

      </main>
    </div>
  );
}
