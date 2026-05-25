// ============================================================
// SearchHero component
// Contains the main search input + food suggestion chips.
// Includes a background-switcher dropdown in the top-right corner.
// ============================================================

import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Search, Sparkles, ImageIcon, X, Plus, Heart, LogOut, ChevronDown, Trash2, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BACKGROUND_THEMES } from "@/lib/themes";
import type { BackgroundTheme } from "@/lib/themes";
import { useAuth } from "@/hooks/use-auth";
import { useRecipeStorage } from "@/hooks/use-recipe-storage";

const FOOD_SUGGESTIONS = [
  "Pasta Carbonara",
  "Butter Chicken",
  "Mushroom Risotto",
  "Pad Thai",
  "Margherita Pizza",
  "Sushi Rolls",
  "French Onion Soup",
];

const INGREDIENT_SUGGESTIONS = [
  { name: "Chicken", emoji: "🍗" },
  { name: "Tomatoes", emoji: "🍅" },
  { name: "Eggs", emoji: "🥚" },
  { name: "Cheese", emoji: "🧀" },
  { name: "Garlic", emoji: "🧄" },
  { name: "Spinach", emoji: "🥬" },
  { name: "Onion", emoji: "🧅" },
  { name: "Potato", emoji: "🥔" },
  { name: "Rice", emoji: "🍚" },
];

// Smooth spring preset used throughout
const spring = { type: "spring" as const, stiffness: 200, damping: 40 };
const smoothEase = [0.25, 0.46, 0.45, 0.94] as const;

interface SearchHeroProps {
  onSearch: (dish: string) => void;
  onSuggest?: (ingredients: string[]) => void;
  isPending: boolean;
  currentBgIndex: number;
  onSelectBg: (index: number) => void;
  onSelectSavedRecipe: (recipe: any) => void;
}

export function SearchHero({ onSearch, onSuggest, isPending, currentBgIndex, onSelectBg, onSelectSavedRecipe }: SearchHeroProps) {
  const [dish, setDish] = useState("");
  const [searchMode, setSearchMode] = useState<"dish" | "ingredients">("dish");
  const [ingredientInput, setIngredientInput] = useState("");
  const [ingredientsList, setIngredientsList] = useState<string[]>([]);
  const [showBgPicker, setShowBgPicker] = useState(false);
  
  const [showSavedMenu, setShowSavedMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const { user, login, logout } = useAuth();
  const { bookmarks, toggleBookmark } = useRecipeStorage();
  const [, navigate] = useLocation();

  const savedRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (savedRef.current && !savedRef.current.contains(event.target as Node)) {
        setShowSavedMenu(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const theme = BACKGROUND_THEMES[currentBgIndex];

  const handleSearch = () => {
    if (searchMode === "dish") {
      if (!dish.trim() || isPending) return;
      if (dish.trim() === "/admin") {
        navigate("/admin");
        return;
      }
      onSearch(dish.trim());
    } else {
      // Ingredients mode
      let activeList = [...ingredientsList];
      const currentInput = ingredientInput.trim();
      if (currentInput && !activeList.map(v => v.toLowerCase()).includes(currentInput.toLowerCase())) {
        activeList.push(currentInput);
        setIngredientsList(activeList);
        setIngredientInput("");
      }

      if (activeList.length === 0 || isPending) return;
      
      const sortedIngredients = [...activeList].sort((a, b) => a.localeCompare(b));
      if (onSuggest) {
        onSuggest(sortedIngredients);
      } else {
        const queryStr = `Recipe using ingredients: ${sortedIngredients.join(", ")}`;
        onSearch(queryStr);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (searchMode === "dish") {
        handleSearch();
      } else {
        const cur = ingredientInput.trim();
        if (cur) {
          if (!ingredientsList.map(v => v.toLowerCase()).includes(cur.toLowerCase())) {
            setIngredientsList([...ingredientsList, cur]);
          }
          setIngredientInput("");
        } else if (ingredientsList.length > 0) {
          handleSearch();
        }
      }
    } else if (e.key === "," && searchMode === "ingredients") {
      e.preventDefault();
      const cur = ingredientInput.trim();
      if (cur) {
        if (!ingredientsList.map(v => v.toLowerCase()).includes(cur.toLowerCase())) {
          setIngredientsList([...ingredientsList, cur]);
        }
        setIngredientInput("");
      }
    }
  };

  const handleSuggestion = (suggestion: string) => {
    setDish(suggestion);
    onSearch(suggestion);
  };

  const handleIngredientSuggestion = (item: string) => {
    if (ingredientsList.map(v => v.toLowerCase()).includes(item.toLowerCase())) {
      setIngredientsList(ingredientsList.filter(v => v.toLowerCase() !== item.toLowerCase()));
    } else {
      setIngredientsList([...ingredientsList, item]);
    }
  };

  const addIngredientFromInput = () => {
    const cur = ingredientInput.trim();
    if (cur) {
      if (!ingredientsList.map(v => v.toLowerCase()).includes(cur.toLowerCase())) {
        setIngredientsList([...ingredientsList, cur]);
      }
      setIngredientInput("");
    }
  };

  return (
    <div
      className="relative w-full py-12 sm:py-20 md:py-32 flex flex-col items-center justify-center px-4 overflow-hidden"
      style={{ ...theme.heroStyle, transition: "background 0.7s cubic-bezier(0.25,0.46,0.45,0.94), background-image 0.7s cubic-bezier(0.25,0.46,0.45,0.94)" }}
    >
      {/* Auth and Saved Recipes — top left */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        {/* Saved Recipes Menu Dropdown */}
        <div className="relative" ref={savedRef}>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowSavedMenu(!showSavedMenu)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 backdrop-blur-sm border border-white/90 shadow-sm text-sm font-medium text-foreground/80 hover:bg-white hover:shadow-md transition-colors cursor-pointer"
            title="Saved Recipes"
          >
            <Heart className={`w-4 h-4 flex-shrink-0 ${bookmarks.length > 0 ? "text-rose-500 fill-rose-500" : "text-muted-foreground"}`} />
            <span className="hidden sm:inline font-semibold">Saved</span>
            <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {bookmarks.length}
            </span>
          </motion.button>

          <AnimatePresence>
            {showSavedMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                transition={spring}
                className="absolute left-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-border/50 p-3 min-w-[280px] max-w-[320px] z-30 max-h-[70vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between border-b border-border/30 pb-2 mb-2">
                  <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Saved Recipes</span>
                  {!user && (
                    <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium">Local Only</span>
                  )}
                </div>

                {bookmarks.length === 0 ? (
                  <div className="text-center py-6 px-4">
                    <Heart className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30 animate-pulse" />
                    <p className="text-xs text-muted-foreground">No saved recipes yet.</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">Search and click the heart icon on any recipe to save it!</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {bookmarks.map((b) => (
                      <div
                        key={b.id || b.name}
                        className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-muted/70 group transition-all"
                      >
                        <button
                          onClick={() => {
                            if (b.recipe) {
                              onSelectSavedRecipe(b.recipe);
                            } else {
                              onSelectSavedRecipe(b);
                            }
                            setShowSavedMenu(false);
                          }}
                          className="flex-1 text-left text-xs font-semibold text-foreground/80 hover:text-primary truncate cursor-pointer"
                        >
                          {b.name}
                        </button>
                        <button
                          onClick={() => toggleBookmark(b.recipe || b)}
                          className="text-muted-foreground/40 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {!user && (
                  <div className="border-t border-border/30 mt-3 pt-2 text-center">
                    <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">Want to save recipes permanently across devices?</p>
                    <button
                      onClick={() => {
                        login().catch(() => {});
                        setShowSavedMenu(false);
                      }}
                      className="w-full text-xs py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg font-bold transition-all cursor-pointer"
                    >
                      Log in to Sync
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Auth Dropdown or Google Login button */}
        <div className="relative" ref={profileRef}>
          {user ? (
            <div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-1.5 p-1 rounded-full bg-white/80 backdrop-blur-sm border border-white/90 shadow-sm text-sm font-medium text-foreground/85 hover:bg-white select-none cursor-pointer"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    className="w-7 h-7 rounded-full border border-border/30"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
                  </div>
                )}
                <ChevronDown className="w-3.5 h-3.5 pr-1 opacity-70" />
              </motion.button>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={spring}
                    className="absolute left-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-border/50 p-3 min-w-[200px] z-30"
                  >
                    <div className="pb-2 mb-2 border-b border-border/30">
                      <p className="text-xs font-bold text-foreground leading-tight truncate">
                        {user.displayName || "User"}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        logout().catch(() => {});
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-2 text-xs py-1.5 px-2 text-red-600 hover:bg-red-50 rounded-xl font-semibold transition-all cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => login().catch(() => {})}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/85 hover:bg-white border border-white/90 shadow-sm text-xs sm:text-sm font-semibold text-foreground/80 hover:text-foreground transition-all duration-150 cursor-pointer"
            >
              <User className="w-4 h-4 text-muted-foreground/80" />
              <span>Login</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Background switcher — top right */}
      <div className="absolute top-4 right-4 z-20">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowBgPicker((v) => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 backdrop-blur-sm border border-white/90 shadow-sm text-sm font-medium text-foreground/80 hover:bg-white hover:shadow-md transition-colors"
          title="Change background"
        >
          <ImageIcon className="w-4 h-4 flex-shrink-0" />
          <span className="hidden sm:inline">{theme.emoji} {theme.name}</span>
          <span className="sm:hidden">{theme.emoji}</span>
        </motion.button>

        <AnimatePresence>
          {showBgPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ ...spring, stiffness: 200, damping: 45 }}
              className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-border/50 p-2 min-w-[200px] z-30 max-h-[70vh] overflow-y-auto"
            >
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-3 pt-1 pb-1.5">
                Food Photos
              </p>
              {BACKGROUND_THEMES.slice(0, 6).map((bg, i) => (
                <motion.button
                  key={bg.name}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { onSelectBg(i); setShowBgPicker(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors hover:bg-muted ${
                    i === currentBgIndex ? "bg-primary/10 text-primary" : "text-foreground/80"
                  }`}
                >
                  <span
                    className="w-8 h-8 rounded-lg border border-border/40 shadow-sm flex-shrink-0 bg-cover bg-center"
                    style={{ backgroundImage: bg.swatchGradient }}
                  />
                  {bg.emoji} {bg.name}
                </motion.button>
              ))}

              <div className="border-t border-border/30 my-2" />

              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-3 pt-1 pb-1.5">
                Colours
              </p>
              {BACKGROUND_THEMES.slice(6).map((bg, i) => {
                const idx = i + 6;
                return (
                  <motion.button
                    key={bg.name}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { onSelectBg(idx); setShowBgPicker(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors hover:bg-muted ${
                      idx === currentBgIndex ? "bg-primary/10 text-primary" : "text-foreground/80"
                    }`}
                  >
                    <span
                      className="w-8 h-8 rounded-lg border border-border/40 shadow-sm flex-shrink-0"
                      style={{ background: bg.swatchGradient }}
                    />
                    {bg.emoji} {bg.name}
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main content — staggered children */}
      <motion.div
        className="relative z-10 w-full max-w-3xl mx-auto text-center space-y-8"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.12 } },
        }}
      >
        {/* Badge */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: -16 },
            visible: { opacity: 1, y: 0, transition: { ...spring } },
          }}
        >
          <span className="inline-flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/80 backdrop-blur-sm text-primary font-medium text-xs sm:text-sm mb-4 sm:mb-6 border border-white/30 shadow-sm mt-12 sm:mt-0">
            <Sparkles className="w-3 sm:w-4 h-3 sm:h-4" />
            <span className="hidden sm:inline">AI-Powered Recipe Generation</span>
            <span className="sm:hidden">AI Recipe Generator</span>
          </span>
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold text-white mb-4 sm:mb-6 leading-tight drop-shadow-lg">
            What are you <span className="text-yellow-300 italic pr-1 sm:pr-2">craving?</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto drop-shadow-md font-medium px-2">
            Type any dish and our culinary AI will craft a perfect recipe — tailored to your dietary needs.
          </p>
        </motion.div>

        {/* Toggle mode selector */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: -8 },
            visible: { opacity: 1, y: 0, transition: { ...spring } },
          }}
          className="flex justify-center mb-2"
        >
          <div className="inline-flex p-1.5 bg-black/15 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg">
            <button
              id="mode-dish-btn"
              onClick={() => setSearchMode("dish")}
              disabled={isPending}
              className={`relative px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                searchMode === "dish"
                  ? "bg-white text-primary shadow-sm"
                  : "text-white/80 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>🍽️</span> Search Dish
            </button>
            <button
              id="mode-ingredients-btn"
              onClick={() => setSearchMode("ingredients")}
              disabled={isPending}
              className={`relative px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                searchMode === "ingredients"
                  ? "bg-white text-primary shadow-sm"
                  : "text-white/80 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>🥫</span> My Ingredients
            </button>
          </div>
        </motion.div>

        {/* Search bar */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { ...spring } },
          }}
          className="w-full max-w-2xl mx-auto flex flex-col gap-4"
        >
          {searchMode === "dish" ? (
            <>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors duration-200">
                  <Search className="w-6 h-6" />
                </div>
                <input
                  type="text"
                  value={dish}
                  onChange={(e) => setDish(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. Creamy Tuscan Garlic Chicken"
                  className="w-full pl-10 sm:pl-14 pr-28 sm:pr-36 py-3 sm:py-5 md:py-6 rounded-xl md:rounded-full bg-white/90 backdrop-blur-sm border-2 border-white/80 text-foreground placeholder:text-muted-foreground/60 text-sm sm:text-lg md:text-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all duration-200 shadow-xl shadow-black/10"
                />
                <motion.button
                  onClick={handleSearch}
                  disabled={!dish.trim() || isPending}
                  whileHover={dish.trim() && !isPending ? { scale: 1.03 } : {}}
                  whileTap={dish.trim() && !isPending ? { scale: 0.97 } : {}}
                  transition={spring}
                  className="hidden md:flex absolute inset-y-1.5 right-1.5 px-6 sm:px-8 items-center justify-center rounded-lg sm:rounded-full bg-primary text-white font-semibold text-sm sm:text-lg shadow-md hover:bg-primary/90 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isPending ? "Cooking..." : "Find Recipe"}
                </motion.button>
              </div>

              <motion.button
                onClick={handleSearch}
                disabled={!dish.trim() || isPending}
                whileHover={dish.trim() && !isPending ? { scale: 1.02 } : {}}
                whileTap={dish.trim() && !isPending ? { scale: 0.97 } : {}}
                transition={spring}
                className="md:hidden w-full py-3 sm:py-4 rounded-lg sm:rounded-xl bg-primary text-white font-semibold text-base sm:text-lg shadow-md hover:bg-primary/90 disabled:opacity-50 transition-colors duration-200 min-h-[44px]"
              >
                {isPending ? "Cooking..." : "Find Recipe"}
              </motion.button>
            </>
          ) : (
            <>
              <div className="relative group animate-fade-in">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors duration-200">
                  <Plus className="w-6 h-6" />
                </div>
                <input
                  type="text"
                  value={ingredientInput}
                  onChange={(e) => setIngredientInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type ingredient (e.g. eggs) and press Enter..."
                  className="w-full pl-10 sm:pl-14 pr-20 sm:pr-24 py-3 sm:py-5 md:py-6 rounded-xl md:rounded-full bg-white/90 backdrop-blur-sm border-2 border-white/80 text-foreground placeholder:text-muted-foreground/60 text-sm sm:text-lg md:text-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all duration-200 shadow-xl shadow-black/10"
                />
                <motion.button
                  onClick={addIngredientFromInput}
                  disabled={!ingredientInput.trim()}
                  whileHover={ingredientInput.trim() ? { scale: 1.03 } : {}}
                  whileTap={ingredientInput.trim() ? { scale: 0.97 } : {}}
                  transition={spring}
                  className="absolute inset-y-1.5 right-1.5 px-4 sm:px-6 flex items-center justify-center rounded-lg sm:rounded-full bg-primary text-white hover:bg-primary/90 font-semibold text-xs sm:text-sm transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </motion.button>
              </div>

              {/* Active ingredient tags */}
              <AnimatePresence>
                {ingredientsList.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="flex flex-wrap gap-2 justify-center py-3 px-3 sm:px-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-inner max-w-full overflow-hidden"
                  >
                    {ingredientsList.map((ing, i) => (
                      <motion.span
                        key={ing}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1, transition: spring }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 bg-white hover:bg-red-50 text-foreground hover:text-red-700 text-xs sm:text-sm font-semibold rounded-full border border-white/20 shadow-sm transition-colors duration-150 cursor-pointer select-none"
                        onClick={() => setIngredientsList(ingredientsList.filter((_, idx) => idx !== i))}
                        title="Click to remove"
                      >
                        {ing}
                        <X className="w-4 h-4 text-muted-foreground hover:text-red-600 rounded-full hover:bg-red-100 p-0.5 transition-colors" />
                      </motion.span>
                    ))}
                    <button
                      type="button"
                      onClick={() => setIngredientsList([])}
                      className="text-xs font-semibold text-white hover:text-yellow-300 underline underline-offset-2 ml-2 self-center cursor-pointer transition-colors"
                    >
                      Clear All
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Make Recipe CTA */}
              <motion.button
                onClick={handleSearch}
                disabled={(ingredientsList.length === 0 && !ingredientInput.trim()) || isPending}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={spring}
                className="w-full py-4 sm:py-5 rounded-xl md:rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold text-base sm:text-lg md:text-xl shadow-lg hover:shadow-xl hover:from-yellow-500 hover:to-orange-600 transition-all duration-300 min-h-[44px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Generating delicious recipe..." : `Make with my ${ingredientsList.length + (ingredientInput.trim() ? 1 : 0)} Ingredient(s)! 🧑‍🍳`}
              </motion.button>
            </>
          )}

          {/* Suggestion chips */}
          <motion.div
            className="flex flex-wrap justify-center gap-2 pt-1 px-2"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
            }}
          >
            {searchMode === "dish" ? (
              <>
                <span className="text-xs text-white/80 self-center mr-1 drop-shadow-sm font-medium">Try:</span>
                {FOOD_SUGGESTIONS.map((suggestion) => (
                  <motion.button
                    key={suggestion}
                    variants={{
                      hidden: { opacity: 0, scale: 0.85 },
                      visible: { opacity: 1, scale: 1, transition: spring },
                    }}
                    whileHover={{ scale: 1.06, y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSuggestion(suggestion)}
                    disabled={isPending}
                    className="px-3 py-1.5 bg-white/85 backdrop-blur-sm border border-white/85 rounded-full text-xs sm:text-sm text-foreground hover:bg-white hover:text-primary hover:border-primary/30 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer"
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </>
            ) : (
              <>
                <span className="text-xs text-white/80 self-center mr-1 drop-shadow-sm font-medium">Have these?</span>
                {INGREDIENT_SUGGESTIONS.map((item) => {
                  const isActive = ingredientsList.map(v => v.toLowerCase()).includes(item.name.toLowerCase());
                  return (
                    <motion.button
                      key={item.name}
                      variants={{
                        hidden: { opacity: 0, scale: 0.85 },
                        visible: { opacity: 1, scale: 1, transition: spring },
                      }}
                      whileHover={{ scale: 1.06, y: -1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleIngredientSuggestion(item.name)}
                      disabled={isPending}
                      className={`px-3 py-1.5 backdrop-blur-sm border rounded-full text-xs sm:text-sm flex items-center gap-1 cursor-pointer transition-all duration-150 ${
                        isActive
                          ? "bg-primary border-primary text-white shadow-md hover:bg-primary/95"
                          : "bg-white/80 border-white/80 text-foreground hover:bg-white"
                      }`}
                    >
                      <span>{item.emoji}</span>
                      {item.name}
                    </motion.button>
                  );
                })}
              </>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
