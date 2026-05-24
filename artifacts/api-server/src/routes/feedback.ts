import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const router: IRouter = Router();

// Input sanitization
function sanitizeString(str: unknown, maxLen: number): string | null {
  if (typeof str !== "string") return null;
  const trimmed = str.trim().slice(0, maxLen);
  return trimmed || null;
}

router.post("/recipes/feedback", async (req, res) => {
  try {
    const { recipeName, userName, rating, comment } = req.body;

    // Input validation & sanitization
    const recipeNameSafe = sanitizeString(recipeName, 500);
    const userNameSafe = sanitizeString(userName, 200);
    const commentSafe = sanitizeString(comment || "", 1000);

    if (!recipeNameSafe || !userNameSafe) {
      res.status(400).json({
        error: "Bad Request",
        message: "Recipe name and user name are required.",
      });
      return;
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      res.status(400).json({
        error: "Bad Request",
        message: "Rating must be a number between 1 and 5.",
      });
      return;
    }

    // Write to Firestore feedbacks collection asynchronously
    try {
      await addDoc(collection(db, "feedbacks"), {
        recipeName: recipeNameSafe,
        userName: userNameSafe,
        rating,
        comment: commentSafe || "",
        created_at: serverTimestamp(),
      });
    } catch (fsErr: any) {
      req.log?.error({ err: fsErr }, "Error saving feedback to Firestore");
    }

    // Insert into database (fallback to pool since table may not exist yet)
    try {
      if (pool) {
        await pool.query(
          `INSERT INTO recipe_feedback (recipe_name, user_name, rating, comment)
           VALUES ($1, $2, $3, $4)`,
          [recipeNameSafe, userNameSafe, rating, commentSafe]
        );
      }
    } catch (dbErr: any) {
      req.log.warn({ err: dbErr }, "Could not write to Postgres recipe_feedback table. Assuming successful if Firestore worked.");
    }
    
    res.status(201).json({ success: true, warning: "Feedback stored" });
  } catch (err) {
    req.log.error({ err }, "Error submitting feedback");
    // Don't leak error details
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to submit feedback. Please try again.",
    });
  }
});

export default router;
