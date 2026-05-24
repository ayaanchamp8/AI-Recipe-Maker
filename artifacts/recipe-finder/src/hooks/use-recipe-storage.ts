import { useState, useEffect } from "react";
import type { RecipeResult } from "@workspace/api-client-react";
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useAuth } from "./use-auth";

export interface StoredRecipe extends RecipeResult {
  storedAt: number;
  id: string;
  count: number;
  recipe?: RecipeResult;
}

const HISTORY_KEY = "recipe-history";
const BOOKMARKS_KEY = "recipe-bookmarks";
const MAX_HISTORY = 50;

enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error("Firestore SavedRecipes Error: ", JSON.stringify(errInfo));
}

export function useRecipeStorage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<StoredRecipe[]>([]);
  const [bookmarks, setBookmarks] = useState<StoredRecipe[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load history from localStorage (always local)
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(HISTORY_KEY);
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    } catch (e) {
      console.error("Failed to load recipe history:", e);
    }
  }, []);

  // Sync bookmarks based on Auth state
  useEffect(() => {
    if (!user) {
      // Logged out — load bookmarks from localStorage
      try {
        const savedBookmarks = localStorage.getItem(BOOKMARKS_KEY);
        if (savedBookmarks) {
          setBookmarks(JSON.parse(savedBookmarks));
        } else {
          setBookmarks([]);
        }
      } catch (e) {
        console.error("Failed to load local bookmarks:", e);
      }
      setLoaded(true);
      return;
    }

    // Logged in — load bookmarks from Firestore
    const path = `users/${user.uid}/savedRecipes`;
    const unsubscribe = onSnapshot(
      collection(db, "users", user.uid, "savedRecipes"),
      (snapshot) => {
        const items: StoredRecipe[] = [];
        snapshot.forEach((docRef) => {
          const data = docRef.data();
          items.push({
            name: data.name,
            recipe: data.recipe,
            storedAt: data.storedAt || Date.now(),
            id: docRef.id,
            count: data.count || 1,
            // also spread additional recipe attributes if stored
            ...data.recipe,
          });
        });
        // Sort by storedAt descending
        items.sort((a, b) => b.storedAt - a.storedAt);
        setBookmarks(items);
        setLoaded(true);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
        setLoaded(true);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addToHistory = (recipe: RecipeResult) => {
    setHistory((prev) => {
      const existingIndex = prev.findIndex((r) => r.name === recipe.name);
      let updated: StoredRecipe[];

      if (existingIndex >= 0) {
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

  const toggleBookmark = async (recipe: RecipeResult) => {
    const isBookmarkedCurrently = bookmarks.some((b) => b.name === recipe.name);

    if (user) {
      // Cloud bookmark operations
      const safeId = recipe.name.replace(/[^a-zA-Z0-9_\-]/g, "_");
      const docPath = `users/${user.uid}/savedRecipes/${safeId}`;

      if (isBookmarkedCurrently) {
        try {
          await deleteDoc(doc(db, "users", user.uid, "savedRecipes", safeId));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, docPath);
        }
      } else {
        try {
          await setDoc(doc(db, "users", user.uid, "savedRecipes", safeId), {
            name: recipe.name,
            recipe: recipe,
            storedAt: Date.now(),
            count: 1,
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, docPath);
        }
      }
    } else {
      // Local bookmark operations
      const storedRecipe: StoredRecipe = {
        ...recipe,
        storedAt: Date.now(),
        id: `${recipe.name}-${Date.now()}`,
        count: 1,
      };

      setBookmarks((prev) => {
        const updated = isBookmarkedCurrently
          ? prev.filter((b) => b.name !== recipe.name)
          : [...prev, storedRecipe];

        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
        return updated;
      });
    }
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
