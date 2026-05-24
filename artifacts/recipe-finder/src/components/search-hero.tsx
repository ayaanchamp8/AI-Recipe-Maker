// ============================================================
// SearchHero component
// Contains the main search input + food suggestion chips.
// Includes a background-switcher dropdown in the top-right corner.
// ============================================================

import { useState } from "react";
import { useLocation } from "wouter";
import { Search, Sparkles, ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BACKGROUND_THEMES } from "@/lib/themes";
import type { BackgroundTheme } from "@/lib/themes";

const FOOD_SUGGESTIONS = [
  "Pasta Carbonara",
  "Butter Chicken",
  "Mushroom Risotto",
  "Pad Thai",
  "Margherita Pizza",
  "Sushi Rolls",
  "French Onion Soup",
];

// Smooth spring preset used throughout
const spring = { type: "spring" as const, stiffness: 200, damping: 40 };
const smoothEase = [0.25, 0.46, 0.45, 0.94] as const;

interface SearchHeroProps {
  onSearch: (dish: string) => void;
  isPending: boolean;
  currentBgIndex: number;
  onSelectBg: (index: number) => void;
}

export function SearchHero({ onSearch, isPending, currentBgIndex, onSelectBg }: SearchHeroProps) {
  const [dish, setDish] = useState("");
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [, navigate] = useLocation();

  const theme = BACKGROUND_THEMES[currentBgIndex];

  const handleSearch = () => {
    if (!dish.trim() || isPending) return;
    if (dish.trim() === "/admin") {
      navigate("/admin");
      return;
    }
    onSearch(dish.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleSuggestion = (suggestion: string) => {
    setDish(suggestion);
    onSearch(suggestion);
  };

  return (
    <div
      className="relative w-full py-12 sm:py-20 md:py-32 flex flex-col items-center justify-center px-4 overflow-hidden"
      style={{ ...theme.heroStyle, transition: "background 0.7s cubic-bezier(0.25,0.46,0.45,0.94), background-image 0.7s cubic-bezier(0.25,0.46,0.45,0.94)" }}
    >
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
          <span className="inline-flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/80 backdrop-blur-sm text-primary font-medium text-xs sm:text-sm mb-4 sm:mb-6 border border-white/30 shadow-sm">
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

        {/* Search bar */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { ...spring } },
          }}
          className="w-full max-w-2xl mx-auto flex flex-col gap-4"
        >
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

          {/* Suggestion chips */}
          <motion.div
            className="flex flex-wrap justify-center gap-2 pt-1 px-2"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
            }}
          >
            <span className="text-xs text-muted-foreground/70 self-center mr-0 sm:mr-1">Try:</span>
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
                className="px-3 py-1.5 bg-white/80 backdrop-blur-sm border border-white/80 rounded-full text-sm text-foreground/80 hover:bg-white hover:text-primary hover:border-primary/30 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
              >
                {suggestion}
              </motion.button>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
