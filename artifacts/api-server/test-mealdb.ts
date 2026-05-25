
import { GoogleGenAI } from "@google/genai";

async function play() {
  const dish = "pizza";
  try {
            const mealRes = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(dish)}`);
            if (mealRes.ok) {
              const mealData = await mealRes.json();
              if (mealData.meals && mealData.meals.length > 0) {
                const meal = mealData.meals[0];
                const ingredients = [];
                for (let i = 1; i <= 20; i++) {
                  const ingredient = meal[`strIngredient${i}`];
                  const measure = meal[`strMeasure${i}`];
                  if (ingredient && ingredient.trim() !== '') {
                    ingredients.push(`${measure ? measure.trim() + ' ' : ''}${ingredient.trim()}`);
                  }
                }
                const fallbackRecipe = {
                  name: meal.strMeal,
                  cookingTime: "30 minutes",
                  servings: "4 servings",
                  difficulty: "Medium",
                  cuisine: meal.strArea || "Global",
                  description: `A delicious ${meal.strArea || ''} ${meal.strCategory || ''} dish. (Served via Public API fallback since AI is at capacity)`,
                  ingredients: ingredients,
                  steps: meal.strInstructions.split(/\\r\\n|\\n/).filter((s: string) => s.trim() !== ''),
                  tips: ["Original recipe from TheMealDB. Enjoy!"],
                  isVegetarian: meal.strCategory === 'Vegetarian' || meal.strCategory === 'Vegan',
                  nutrition: { calories: "N/A", protein: "N/A", carbs: "N/A", fat: "N/A" }
                };
                console.log(fallbackRecipe);
                return;
              }
            }
          } catch (e) {
             console.error("TheMealDB fallback failed", e);
          }
}
play();
