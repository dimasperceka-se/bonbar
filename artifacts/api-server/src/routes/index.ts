import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import parseRouter from "./parse.js";
import dashboardRouter from "./dashboard.js";
import requestsRouter from "./requests.js";
import itemsRouter from "./items.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(parseRouter);
router.use(dashboardRouter);
router.use(requestsRouter);
router.use(itemsRouter);

export default router;
