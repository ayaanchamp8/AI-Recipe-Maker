import { Router, type IRouter } from "express";
import healthRouter from "./health";
import recipesRouter from "./recipes";
import analyticsRouter from "./analytics";
import feedbackRouter from "./feedback";

const router: IRouter = Router();

router.use(healthRouter);
router.use(recipesRouter);
router.use(analyticsRouter);
router.use(feedbackRouter);

export default router;
