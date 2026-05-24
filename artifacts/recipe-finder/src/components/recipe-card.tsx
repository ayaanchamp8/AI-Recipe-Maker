import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, Users, ChefHat, Utensils, CheckCircle2, Flame, BadgeCheck, Leaf, Drumstick, MessageSquare, Star, Clover, Heart } from "lucide-react";
import type { RecipeResult } from "@workspace/api-client-react";
import { useRecipeStorage } from "@/hooks/use-recipe-storage";

interface RecipeCardProps {
  recipe: RecipeResult;
  dietType?: "vegan" | "vegetarian" | "non-veg" | null;
  onFeedback?: () => void;
  onFeedbackSubmitted?: () => void;
}

const spring = { type: "spring" as const, stiffness: 200, damping: 40 };

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: spring },
};

const fadeLeft = {
  hidden: { opacity: 0, x: -14 },
  visible: { opacity: 1, x: 0, transition: spring },
};

export function RecipeCard({ recipe, dietType, onFeedback, onFeedbackSubmitted }: RecipeCardProps) {
  const { toggleBookmark, isBookmarked } = useRecipeStorage();
  const bookmarked = isBookmarked(recipe.name);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const displayAsVegetarian = recipe.isVegetarian;
  const displayAsVegan = dietType === "vegan" && displayAsVegetarian;

  const handleQuickRate = () => {
    if (onFeedback) {
      onFeedback();
    }
  };

  const handleFeedbackSuccess = () => {
    setFeedbackSubmitted(true);
    onFeedbackSubmitted?.();
  };
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
      className="w-full max-w-4xl mx-auto bg-card rounded-2xl sm:rounded-3xl shadow-xl shadow-primary/5 border border-border/50 overflow-hidden"
    >
      {/* Header banner */}
      <div className="relative hero-gradient px-4 sm:px-6 md:px-10 py-6 sm:py-8 md:py-10">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-4 mb-3">
          <motion.div variants={fadeLeft} className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
              <Flame className="w-4 h-4" />
              {recipe.cuisine}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium border border-emerald-200">
              <BadgeCheck className="w-4 h-4" />
              Chef Verified
            </span>
            {displayAsVegan ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm font-medium border border-yellow-200">
                <Clover className="w-4 h-4" />
                100% Vegan
              </span>
            ) : displayAsVegetarian ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium border border-green-200">
                <Leaf className="w-4 h-4" />
                Pure Vegetarian
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-medium border border-orange-200">
                <Drumstick className="w-4 h-4" />
                Non-Vegetarian
              </span>
            )}
          </motion.div>
          <div className="flex gap-2">
            <motion.button
              variants={fadeLeft}
              onClick={() => toggleBookmark(recipe)}
              className={`px-3 py-2 rounded-lg transition-colors font-medium flex items-center gap-1.5 cursor-pointer ${
                bookmarked
                  ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                  : "bg-white/90 text-foreground/80 hover:bg-white hover:text-foreground"
              }`}
              title={bookmarked ? "Saved to your list" : "Save this recipe"}
            >
              <Heart className={`w-5 h-5 ${bookmarked ? "text-rose-500 fill-rose-500" : "text-muted-foreground"}`} />
              <span className="text-sm hidden sm:inline">{bookmarked ? "Saved" : "Save"}</span>
            </motion.button>

            {onFeedback && (
              <motion.button
                variants={fadeLeft}
                onClick={onFeedback}
                className="px-3 py-2 rounded-lg bg-cyan-100 text-cyan-700 hover:bg-cyan-200 transition-colors font-medium flex items-center gap-1.5 cursor-pointer"
                title="Share your feedback"
              >
                <MessageSquare className="w-5 h-5" />
                <span className="text-sm hidden sm:inline">Feedback</span>
              </motion.button>
            )}
          </div>
        </div>
        <motion.h2
          variants={fadeUp}
          className="text-2xl sm:text-3xl md:text-5xl font-display text-foreground"
        >
          {recipe.name}
        </motion.h2>
      </div>

      <div className="p-4 sm:p-6 md:p-8">
        {/* Stat cards */}
        <motion.div
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8"
        >
          {[
            { icon: Clock, label: "Time", value: recipe.cookingTime },
            { icon: Users, label: "Yield", value: recipe.servings },
            { icon: ChefHat, label: "Level", value: recipe.difficulty },
            { icon: Utensils, label: "Type", value: recipe.cuisine },
          ].map(({ icon: Icon, label, value }) => (
            <motion.div
              key={label}
              variants={{
                hidden: { opacity: 0, scale: 0.88, y: 12 },
                visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 40 } },
              }}
              whileHover={{ scale: 1.04, y: -2 }}
              transition={spring}
              className="flex flex-col items-center justify-center p-4 rounded-2xl bg-secondary/30 border border-secondary/50 cursor-default"
            >
              <Icon className="w-6 h-6 text-primary mb-2" />
              <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
              <span className="text-foreground font-semibold text-center">{value}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Description */}
        <motion.p
          variants={fadeUp}
          className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-6 sm:mb-8 border-l-4 border-primary/30 pl-4 py-1 italic"
        >
          {recipe.description}
        </motion.p>

        {/* Nutrition Info */}
        {recipe.nutrition && (
          <motion.div
            variants={fadeUp}
            className="mb-8 sm:mb-10 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-100"
          >
            <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              Nutrition per Serving
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label: "Calories", value: recipe.nutrition.calories },
                { label: "Protein", value: recipe.nutrition.protein },
                { label: "Carbs", value: recipe.nutrition.carbs },
                { label: "Fat", value: recipe.nutrition.fat },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-emerald-700">{value}</p>
                  <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider mt-1">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6 sm:gap-8 md:gap-10">
          {/* Ingredients */}
          <motion.div variants={fadeUp}>
            <h3 className="text-xl sm:text-2xl font-display text-foreground mb-4 sm:mb-6 flex items-center gap-2">
              <span className="bg-primary/10 text-primary p-2 rounded-xl">
                <Utensils className="w-5 h-5" />
              </span>
              Ingredients
            </h3>
            <motion.ul
              variants={{ visible: { transition: { staggerChildren: 0.045 } } }}
              className="space-y-2 sm:space-y-3"
            >
              {recipe.ingredients.map((ingredient: string, index: number) => (
                <motion.li
                  key={index}
                  variants={fadeLeft}
                  whileHover={{ x: 4 }}
                  transition={{ type: "spring", stiffness: 200, damping: 40 }}
                  className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl hover:bg-muted/50 transition-colors duration-150"
                >
                  <CheckCircle2 className="w-4 sm:w-5 h-4 sm:h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-foreground">{ingredient}</span>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>

          {/* Instructions */}
          <motion.div variants={fadeUp}>
            <h3 className="text-xl sm:text-2xl font-display text-foreground mb-4 sm:mb-6 flex items-center gap-2">
              <span className="bg-primary/10 text-primary p-2 rounded-xl">
                <ChefHat className="w-5 h-5" />
              </span>
              Instructions
            </h3>
            <motion.div
              variants={{ visible: { transition: { staggerChildren: 0.055 } } }}
              className="space-y-4 sm:space-y-6"
            >
              {recipe.steps.map((step: string, index: number) => (
                <motion.div
                  key={index}
                  variants={fadeUp}
                  className="flex gap-2 sm:gap-4"
                >
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    transition={spring}
                    className="flex-shrink-0 w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-secondary flex items-center justify-center text-primary font-bold text-sm sm:text-lg border border-primary/20"
                  >
                    {index + 1}
                  </motion.div>
                  <div className="pt-0.5 sm:pt-1.5">
                    <p className="text-sm sm:text-base text-foreground leading-relaxed">{step}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {recipe.tips && recipe.tips.length > 0 && (
              <motion.div
                variants={fadeUp}
                className="mt-10 p-6 bg-amber-50 rounded-2xl border border-amber-200/60"
              >
                <h4 className="text-lg font-bold text-amber-800 mb-3 flex items-center gap-2">
                  💡 Chef's Tips
                </h4>
                <ul className="space-y-2 mb-6">
                  {recipe.tips.map((tip: string, index: number) => (
                    <li key={index} className="text-amber-900/80 flex items-start gap-2 text-sm md:text-base">
                      <span className="text-amber-500 mt-0.5">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
                
                {/* Rating Section */}
                {!feedbackSubmitted && (
                  <div className="border-t border-amber-200/60 pt-4 flex flex-col items-center gap-3">
                    <p className="text-sm font-medium text-amber-800">Rate this recipe</p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <motion.button
                          key={star}
                          onClick={handleQuickRate}
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          className="transition-transform"
                        >
                          <Star
                            className="w-6 h-6 transition-all"
                            fill="none"
                            color="#d1d5db"
                          />
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Feedback Submitted Message */}
                {feedbackSubmitted && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border-t border-amber-200/60 pt-4 flex flex-col items-center gap-2"
                  >
                    <p className="text-sm font-medium text-emerald-600">✓ Thanks for your feedback!</p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
