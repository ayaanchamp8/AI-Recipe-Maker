/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Utensils, ChefHat, Loader2, Sparkles, ChefHat as ChefHatIcon } from "lucide-react";
import { motion } from "motion/react";

export default function App() {
  const [ingredients, setIngredients] = useState("");
  const [style, setStyle] = useState("Any");
  const [recipe, setRecipe] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredients.trim()) return;

    setLoading(true);
    setError("");
    setRecipe("");

    try {
      const response = await fetch("/api/recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ingredients, style }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate recipe");
      }

      setRecipe(data.recipe);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-orange-200">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <header className="mb-12 text-center md:text-left flex flex-col md:flex-row items-center gap-4">
          <div className="bg-orange-100 p-4 rounded-2xl text-orange-600 shadow-sm">
            <ChefHatIcon size={40} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">AI Recipe Finder</h1>
            <p className="text-neutral-500 mt-1">Turn what's in your fridge into a delicious meal.</p>
          </div>
        </header>

        <main className="grid md:grid-cols-12 gap-8 items-start">
          <section className="md:col-span-4 bg-white p-6 rounded-3xl shadow-sm border border-neutral-200/50">
            <form onSubmit={generateRecipe} className="flex flex-col gap-6">
              <div>
                <label htmlFor="ingredients" className="block text-sm font-medium text-neutral-700 mb-2">
                  What ingredients do you have?
                </label>
                <textarea
                  id="ingredients"
                  rows={4}
                  className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all resize-none"
                  placeholder="e.g., chicken breast, broccoli, rice, garlic"
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="style" className="block text-sm font-medium text-neutral-700 mb-2">
                  Cuisine or Diet (Optional)
                </label>
                <input
                  type="text"
                  id="style"
                  placeholder="e.g., Italian, Keto, Spicy"
                  className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !ingredients.trim()}
                className="w-full bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-medium py-3 px-4 rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Sparkles size={18} />
                )}
                {loading ? "Cooking..." : "Generate Recipe"}
              </button>
            </form>
          </section>

          <section className="md:col-span-8 min-h-[400px]">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 text-red-700 p-4 rounded-2xl border border-red-200/50 mb-6"
              >
                {error}
              </motion.div>
            )}

            {!recipe && !loading && !error && (
              <div className="h-full flex flex-col items-center justify-center text-neutral-400 bg-white/50 border border-neutral-200 border-dashed rounded-3xl p-12 text-center">
                <Utensils size={48} strokeWidth={1} className="mb-4 text-neutral-300" />
                <p>Your AI-crafted recipe will appear here.</p>
              </div>
            )}

            {loading && (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                <ChefHatIcon size={48} strokeWidth={1} className="text-orange-300 animate-bounce mb-6" />
                <div className="flex gap-1.5 items-center justify-center">
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div>
                </div>
              </div>
            )}

            {recipe && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-neutral-200/50 prose prose-neutral prose-orange max-w-none"
              >
                <div className="markdown-body">
                  <ReactMarkdown>{recipe}</ReactMarkdown>
                </div>
              </motion.div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
