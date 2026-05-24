// ============================================================
// Home page — manages the full recipe search flow:
// 1. User types a dish and clicks "Find Recipe"
// 2. Dietary preferences dialog appears (veg/non-veg + allergies)
// 3. Recipe is fetched from the AI with those preferences
// 4. If vegetarian + dish can't be made veg → special warning shown
// 5. Otherwise recipe is displayed in a clean card layout
// ============================================================

import { useState, useEffect } from "react";
import { useSearchRecipe } from "@workspace/api-client-react";
import { SearchHero } from "@/components/search-hero";
import { RecipeCard } from "@/components/recipe-card";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { AllergyDialog, type DietaryPreferences } from "@/components/allergy-dialog";
import { FeedbackDialog } from "@/components/feedback-dialog";
import { useBackground } from "@/hooks/use-background";
import { useVisitorId } from "@/hooks/use-visitor-id";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, RefreshCw, Mail, Leaf, Info, Shield, FileText } from "lucide-react";
import { Link } from "wouter";
import { getConsentChoice } from "@/components/cookie-consent";

const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT as string | undefined;
const ADSENSE_SLOT = import.meta.env.VITE_ADSENSE_SLOT as string | undefined;
const ADS_ENABLED = Boolean(ADSENSE_CLIENT && ADSENSE_SLOT);

export default function Home() {
  const { bgIndex, setBgIndex } = useBackground();
  const visitorId = useVisitorId();
  const [hasSearched, setHasSearched] = useState(false);
  const [allergyDialogOpen, setAllergyDialogOpen] = useState(false);
  const [pendingDish, setPendingDish] = useState("");
  const [dietaryPreference, setDietaryPreference] = useState<"vegan" | "vegetarian" | "non-veg" | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Track the last error type so we can show a targeted message
  const [errorType, setErrorType] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Initialise AdSense slot on mount — only if a real publisher + slot is
  // configured AND the user has not rejected cookies. Pushing a request with
  // a placeholder slot ID violates AdSense policy.
  useEffect(() => {
    if (!ADS_ENABLED) return;
    if (getConsentChoice() === "rejected") return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (_) {}
  }, []);

  // Track page view on mount and ensure it's saved
  useEffect(() => {
    const api = `${import.meta.env.VITE_API_URL ?? ""}/api`;
    const trackVisit = async () => {
      try {
        const res = await fetch(`${api}/analytics/track-visit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: window.location.pathname }),
        });
        if (!res.ok) {
          console.error("Failed to track visit:", res.status);
        }
      } catch (err) {
        console.error("Error tracking visit:", err);
      }
    };
    trackVisit();
  }, []);

  const searchMutation = useSearchRecipe({
    mutation: {
      onSuccess: () => {
        setErrorType(null);
        setTimeout(() => {
          window.scrollTo({ top: window.innerHeight * 0.6, behavior: "smooth" });
        }, 100);
      },
      onError: (err: unknown) => {
        // ApiError carries the parsed body in .data (not .response.data)
        const anyErr = err as { data?: { error?: string; message?: string }; status?: number };
        const data = anyErr?.data;
        if (data?.error === "not_vegetarian") {
          setErrorType("not_vegetarian");
          setErrorMessage(data.message ?? "This dish cannot be made vegetarian.");
        } else if (data?.error === "not_found" || anyErr?.status === 404) {
          setErrorType("not_found");
          setErrorMessage("Can't find this dish, please try again.");
        } else {
          setErrorType("generic");
          const msgErr = err as { message?: string };
          setErrorMessage(msgErr?.message ?? "Our AI chef got a little confused. Please try again.");
        }
      },
    },
  });

  // Step 1: User submits a dish — open dietary dialog first
  const handleSearch = (dish: string) => {
    setPendingDish(dish);
    setAllergyDialogOpen(true);
  };

  // Step 2: User confirms dietary preferences — fetch the recipe
  const handleDietaryConfirm = (prefs: DietaryPreferences) => {
    setAllergyDialogOpen(false);
    setHasSearched(true);
    setErrorType(null);
    setFeedbackSubmitted(false);
    setDietaryPreference(prefs.dietType);
    searchMutation.mutate({
      data: {
        dish: pendingDish,
        ...(prefs.allergies ? { allergies: prefs.allergies } : {}),
        vegetarian: prefs.dietType === "vegan" || prefs.dietType === "vegetarian",
        vegan: prefs.dietType === "vegan",
        visitorId,
      },
    });
  };

  // Apply theme based on actual recipe, not user preference
  useEffect(() => {
    if (searchMutation.isSuccess && searchMutation.data) {
      const actualType = searchMutation.data.isVegetarian ? (dietaryPreference === "vegan" ? "vegan" : "vegetarian") : "non-vegetarian";
      applyDietaryTheme(actualType);
    }
  }, [searchMutation.isSuccess, searchMutation.data]);

  const handleReset = () => {
    setHasSearched(false);
    setErrorType(null);
    setErrorMessage("");
    setDietaryPreference(null);
    resetDietaryTheme();
    searchMutation.reset();
  };

  function applyDietaryTheme(type: "vegan" | "vegetarian" | "non-vegetarian") {
    const root = document.documentElement;
    if (type === "vegan") {
      root.style.setProperty("--primary", "48 96% 53%"); // Yellow
    } else if (type === "vegetarian") {
      root.style.setProperty("--primary", "142 71% 29%");
    } else {
      root.style.setProperty("--primary", "0 84% 60%");
    }
  }

  function resetDietaryTheme() {
    const root = document.documentElement;
    root.style.setProperty("--primary", "24 95% 53%");
  }

  const handleSubmitFeedback = async (feedback: { userName: string; rating: number; comment: string }) => {
    if (!searchMutation.data) return;
    
    const api = `${import.meta.env.VITE_API_URL ?? ""}/api`;
    try {
      const res = await fetch(`${api}/recipes/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeName: searchMutation.data.name,
          userName: feedback.userName,
          rating: feedback.rating,
          comment: feedback.comment,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit feedback");
      setFeedbackSubmitted(true);
    } catch (err) {
      console.error("Error submitting feedback:", err);
    }
  };

  const suggestions = ["Pasta Carbonara", "Chicken Tikka Masala", "Mushroom Risotto"];

  return (
    <div className="min-h-screen bg-transparent flex flex-col">

      <SearchHero
        onSearch={handleSearch}
        isPending={searchMutation.isPending}
        currentBgIndex={bgIndex}
        onSelectBg={setBgIndex}
      />

      <main className="flex-1 container max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 mt-4 sm:mt-6 md:mt-8 pb-4 sm:pb-6 md:pb-8">
        <AnimatePresence mode="wait">

          {/* Empty state */}
          {!hasSearched && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 200, damping: 40 }}
              className="flex flex-col items-center justify-center py-6 sm:py-8 md:py-12 text-center px-4"
            >
              <motion.div
                className="w-32 sm:w-40 md:w-48 h-32 sm:h-40 md:h-48 mb-4 sm:mb-6 md:mb-8"
                whileHover={{ scale: 1.07, rotate: 2 }}
                transition={{ type: "spring", stiffness: 200, damping: 40 }}
              >
                <img
                  src={`${import.meta.env.BASE_URL}images/empty-plate.png`}
                  alt="Empty plate"
                  className="w-full h-full object-contain drop-shadow-xl"
                />
              </motion.div>
              <h2 className="text-2xl sm:text-3xl font-display text-foreground mb-2 sm:mb-4">Hungry for ideas?</h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 max-w-md">
                Search for any dish above, or try one of these classics to get started.
              </p>
              <motion.div
                className="flex flex-wrap justify-center gap-2 sm:gap-3"
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } }}
              >
                {suggestions.map((dish) => (
                  <motion.button
                    key={dish}
                    variants={{
                      hidden: { opacity: 0, scale: 0.85, y: 8 },
                      visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 40 } },
                    }}
                    whileHover={{ scale: 1.06, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSearch(dish)}
                    className="px-3 sm:px-5 py-2 sm:py-2.5 bg-white border border-border/80 rounded-full text-foreground text-xs sm:text-sm font-medium shadow-sm hover:shadow-md hover:border-primary/40 hover:text-primary transition-colors duration-150"
                  >
                    {dish}
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* Loading state */}
          {hasSearched && searchMutation.isPending && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 200, damping: 40 }}
              className="pt-8"
            >
              <LoadingSkeleton />
            </motion.div>
          )}

          {/* Error: dish cannot be made vegetarian */}
          {hasSearched && searchMutation.isError && errorType === "not_vegetarian" && (
            <motion.div
              key="not-veg-error"
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ type: "spring", stiffness: 200, damping: 40 }}
              className="max-w-2xl mx-auto mt-6 sm:mt-8 md:mt-12 bg-green-50 border border-green-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center mx-4"
            >
              <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Leaf className="w-6 sm:w-8 h-6 sm:h-8 text-green-600" />
              </div>
              <h3 className="text-xl sm:text-2xl font-display text-foreground mb-2 sm:mb-3">
                This dish can't be made vegetarian 🌿
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 max-w-md mx-auto leading-relaxed">
                {errorMessage}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleReset}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-white border border-border rounded-lg sm:rounded-xl font-medium text-sm sm:text-base shadow-sm hover:bg-muted transition-colors duration-150"
                >
                  <RefreshCw className="w-4 h-4" />
                  Search a different dish
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Error: generic / not-found */}
          {hasSearched && searchMutation.isError && errorType !== "not_vegetarian" && (
            <motion.div
              key="generic-error"
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ type: "spring", stiffness: 200, damping: 40 }}
              className="max-w-2xl mx-auto mt-6 sm:mt-8 md:mt-12 bg-destructive/5 border border-destructive/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center mx-4"
            >
              <AlertCircle className="w-12 sm:w-16 h-12 sm:h-16 text-destructive mx-auto mb-3 sm:mb-4" />
              <h3 className="text-xl sm:text-2xl font-display text-foreground mb-2 sm:mb-3">
                {errorType === "not_found" ? "Dish Not Found" : "Oops, something went wrong"}
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">{errorMessage}</p>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleReset}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-white border border-border rounded-lg sm:rounded-xl font-medium text-sm sm:text-base shadow-sm hover:bg-muted transition-colors duration-150"
              >
                <RefreshCw className="w-4 h-4" />
                Try Another Search
              </motion.button>
            </motion.div>
          )}

          {/* Success: show recipe */}
          {hasSearched && searchMutation.isSuccess && searchMutation.data && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 200, damping: 40 }}
              className="pt-8"
            >
              <RecipeCard 
                recipe={searchMutation.data}
                dietType={dietaryPreference}
                onFeedback={() => setFeedbackOpen(true)}
                onFeedbackSubmitted={() => setFeedbackSubmitted(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Google Ad Banner — only rendered when both client + slot are
          configured. Showing an empty/placeholder ad slot is an AdSense
          policy violation, so the entire block is gated. */}
      {ADS_ENABLED && (
        <div className="container max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <p className="text-xs text-muted-foreground text-center mb-2 uppercase tracking-widest">Advertisement</p>
          <div className="w-full rounded-lg sm:rounded-xl overflow-hidden border border-border/50 bg-white shadow-sm">
            <ins
              className="adsbygoogle"
              style={{ display: "block" }}
              data-ad-client={ADSENSE_CLIENT}
              data-ad-slot={ADSENSE_SLOT}
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-border/40 bg-white/60 backdrop-blur-sm py-4 sm:py-6">
        <div className="container max-w-7xl mx-auto px-3 sm:px-4 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-3 text-xs sm:text-sm text-muted-foreground text-center">
          <p>© {new Date().getFullYear()} AI Recipe Finder. Powered by AI.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            <Link
              href="/about"
              className="inline-flex items-center gap-1.5 text-foreground/70 hover:text-primary font-medium transition-colors"
            >
              <Info className="w-4 h-4" />
              About
            </Link>
            <span className="text-border">|</span>
            <Link
              href="/privacy"
              className="inline-flex items-center gap-1.5 text-foreground/70 hover:text-primary font-medium transition-colors"
            >
              <Shield className="w-4 h-4" />
              Privacy
            </Link>
            <span className="text-border">|</span>
            <Link
              href="/terms"
              className="inline-flex items-center gap-1.5 text-foreground/70 hover:text-primary font-medium transition-colors"
            >
              <FileText className="w-4 h-4" />
              Terms
            </Link>
            <span className="text-border">|</span>
            <a
              href="mailto:ayaan.kriplani2212@gmail.com"
              className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 font-medium transition-colors"
            >
              <Mail className="w-4 h-4" />
              Contact
            </a>
          </div>
        </div>
      </footer>

      {/* Dietary preferences dialog */}
      <AllergyDialog
        isOpen={allergyDialogOpen}
        dishName={pendingDish}
        onConfirm={handleDietaryConfirm}
        onClose={() => setAllergyDialogOpen(false)}
      />

      {/* Feedback dialog */}
      <FeedbackDialog
        isOpen={feedbackOpen}
        recipeName={searchMutation.data?.name || ""}
        onClose={() => setFeedbackOpen(false)}
        onSubmit={handleSubmitFeedback}
      />
    </div>
  );
}
