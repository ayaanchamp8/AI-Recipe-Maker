// ============================================================
// AllergyDialog component
// Shown after the user enters a dish. Asks two things:
// 1. Vegetarian or non-vegetarian preference
// 2. Any allergy/dietary restrictions
// The AI then tailors the recipe — or warns if a dish can't be made veg.
// ============================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, ChefHat, ArrowRight, Leaf, Drumstick, Clover } from "lucide-react";

const COMMON_ALLERGIES = [
  "Nuts", "Peanuts", "Dairy", "Gluten", "Eggs",
  "Shellfish", "Soy", "Wheat", "Fish", "Sesame",
];

export interface DietaryPreferences {
  allergies: string;
  dietType: "vegan" | "vegetarian" | "non-veg" | null; // null = not selected yet
}

interface AllergyDialogProps {
  isOpen: boolean;
  dishName: string;
  onConfirm: (prefs: DietaryPreferences) => void;
  onClose: () => void;
}

export function AllergyDialog({ isOpen, dishName, onConfirm, onClose }: AllergyDialogProps) {
  const [dietType, setDietType] = useState<"vegan" | "vegetarian" | "non-veg" | null>(null);
  const [allergies, setAllergies] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const toggleTag = (tag: string) => {
    setSelected((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const buildAllergyString = () => {
    const typed = allergies.trim();
    const tags = selected.join(", ");
    if (typed && tags) return `${tags}, ${typed}`;
    return typed || tags;
  };

  const resetState = () => {
    setDietType(null);
    setAllergies("");
    setSelected([]);
  };

  const handleConfirm = () => {
    onConfirm({
      allergies: buildAllergyString(),
      dietType: dietType ?? "non-veg",
    });
    resetState();
  };

  const handleSkip = () => {
    onConfirm({ allergies: "", dietType: "non-veg" });
    resetState();
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Dialog */}
          <motion.div
            key="dialog"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 flex items-center justify-center z-50 px-4 pointer-events-none"
          >
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-6 pt-6 pb-5 border-b border-border/40 relative shrink-0">
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground hover:bg-black/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <ChefHat className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-display text-foreground">Dietary preferences</h2>
                    <p className="text-sm text-muted-foreground">
                      For <span className="font-medium text-foreground">{dishName}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Scrollable body */}
              <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">

                {/* === Section 1: Dietary Preference === */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                    Dietary preference
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Vegan button */}
                    <button
                      type="button"
                      onClick={() => setDietType("vegan")}
                      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-colors duration-150 active:scale-[0.97] ${
                        dietType === "vegan"
                          ? "border-yellow-500 bg-yellow-50 text-yellow-700"
                          : "border-border bg-white text-foreground hover:border-yellow-300 hover:bg-yellow-50/50"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-150 ${
                          dietType === "vegan" ? "bg-yellow-100" : "bg-muted/50"
                        }`}
                      >
                        <Clover className={`w-5 h-5 transition-colors duration-150 ${dietType === "vegan" ? "text-yellow-600" : "text-muted-foreground"}`} />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-xs">Vegan</p>
                        <p className="text-xs text-muted-foreground mt-0.5">No animal products</p>
                      </div>
                    </button>

                    {/* Vegetarian button */}
                    <button
                      type="button"
                      onClick={() => setDietType("vegetarian")}
                      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-colors duration-150 active:scale-[0.97] ${
                        dietType === "vegetarian"
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-border bg-white text-foreground hover:border-green-300 hover:bg-green-50/50"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-150 ${
                          dietType === "vegetarian" ? "bg-green-100" : "bg-muted/50"
                        }`}
                      >
                        <Leaf className={`w-5 h-5 transition-colors duration-150 ${dietType === "vegetarian" ? "text-green-600" : "text-muted-foreground"}`} />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-xs">Vegetarian</p>
                        <p className="text-xs text-muted-foreground mt-0.5">No meat or fish</p>
                      </div>
                    </button>

                    {/* Non-vegetarian button */}
                    <button
                      type="button"
                      onClick={() => setDietType("non-veg")}
                      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-colors duration-150 active:scale-[0.97] ${
                        dietType === "non-veg"
                          ? "border-red-500 bg-red-50 text-red-600"
                          : "border-border bg-white text-foreground hover:border-red-300 hover:bg-red-50/50"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-150 ${
                          dietType === "non-veg" ? "bg-red-100" : "bg-muted/50"
                        }`}
                      >
                        <Drumstick className={`w-5 h-5 transition-colors duration-150 ${dietType === "non-veg" ? "text-red-600" : "text-muted-foreground"}`} />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-xs">Non-Veg</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Includes meat</p>
                      </div>
                    </button>
                  </div>

                  {/* Info hint */}
                  {(dietType === "vegan" || dietType === "vegetarian") && (
                    <div
                      className={`mt-3 flex items-start gap-2 text-xs rounded-xl px-3 py-2.5 border animate-in fade-in slide-in-from-top-1 duration-150 ${
                        dietType === "vegan"
                          ? "text-yellow-700 bg-yellow-50 border-yellow-100"
                          : "text-green-700 bg-green-50 border-green-100"
                      }`}
                    >
                      {dietType === "vegan" ? (
                        <Clover className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      ) : (
                        <Leaf className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      )}
                      <p>
                        {dietType === "vegan"
                          ? "We'll create a vegan-friendly recipe with no animal products."
                          : "If this dish cannot be made vegetarian, we'll let you know instead of guessing."}
                      </p>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="border-t border-border/50" />

                {/* === Section 2: Allergies === */}
                <div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground bg-amber-50 rounded-xl px-4 py-3 border border-amber-100 mb-4">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <p>Any food allergies? The AI will avoid those ingredients entirely.</p>
                  </div>

                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Common allergens</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {COMMON_ALLERGIES.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all active:scale-95 ${
                          selected.includes(tag)
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "bg-white text-foreground border-border hover:border-primary/40 hover:text-primary"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Or type your own</p>
                  <input
                    type="text"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                    placeholder="e.g. lactose, tree nuts, shellfish..."
                    className="w-full px-4 py-3 rounded-xl border border-border bg-white text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 pb-6 pt-4 border-t border-border/30 flex gap-3 shrink-0">
                <button
                  onClick={handleSkip}
                  className="flex-1 py-3 rounded-xl border border-border text-foreground font-medium text-sm hover:bg-muted/50 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={dietType === null}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold text-sm shadow-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  Find Recipe
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
