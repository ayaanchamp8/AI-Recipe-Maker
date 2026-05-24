import { useState, useEffect } from "react";
import type { RecipeResult } from "@workspace/api-client-react";

export interface StoredRecipe extends RecipeResult {
  storedAt: number;
  id: string;
  count: number;
}

const HISTORY_KEY = "recipe-history";
const BOOKMARKS_KEY = "recipe-bookmarks";
const MAX_HISTORY = 50;

export function useRecipeStorage() {
  const [history, setHistory] = useState<StoredRecipe[]>([]);
  const [bookmarks, setBookmarks] = useState<StoredRecipe[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(HISTORY_KEY);
      const savedBookmarks = localStorage.getItem(BOOKMARKS_KEY);
      
      if (savedHistory) setHistory(JSON.parse(savedHistory));
      if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));
    } catch (e) {
      console.error("Failed to load recipe storage:", e);
    }
    setLoaded(true);
  }, []);

  const addToHistory = (recipe: RecipeResult) => {
    setHistory((prev) => {
      // Check if recipe already exists in history
      const existingIndex = prev.findIndex((r) => r.name === recipe.name);
      let updated: StoredRecipe[];

      if (existingIndex >= 0) {
        // Recipe exists - increment count and move to top
        const existing = prev[existingIndex];
        updated = [
          {
            ...existing,
            count: (existing.count || 1) + 1,
            storedAt: Date.now(),
          },
          ...prev.slice(0, existingIndex),
          ...prev.slice(existingIndex + 1),
        ];
      } else {
        // New recipe
        const storedRecipe: StoredRecipe = {
          ...recipe,
          storedAt: Date.now(),
          id: `${recipe.name}-${Date.now()}`,
          count: 1,
        };
        updated = [storedRecipe, ...prev];
      }

      const trimmed = updated.slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
      return trimmed;
    });
  };

  const toggleBookmark = (recipe: RecipeResult) => {
    const storedRecipe: StoredRecipe = {
      ...recipe,
      storedAt: Date.now(),
      id: `${recipe.name}-${Date.now()}`,
      count: 1,
    };

    setBookmarks((prev) => {
      const isBookmarked = prev.some((b) => b.name === recipe.name);
      const updated = isBookmarked
        ? prev.filter((b) => b.name !== recipe.name)
        : [...prev, storedRecipe];

      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const isBookmarked = (recipeName: string) => {
    return bookmarks.some((b) => b.name === recipeName);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  const removeFromHistory = (id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return {
    history,
    bookmarks,
    loaded,
    addToHistory,
    toggleBookmark,
    isBookmarked,
    clearHistory,
    removeFromHistory,
  };
}
