import express, { type Express, type Request, type Response, type NextFunction } from "express";
import path from "node:path";
import fs from "node:fs";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Serve the built frontend (single-port deploy). Set FRONTEND_DIST to the absolute
// path of `artifacts/bon-barang/dist/public` — or rely on the default which assumes
// the standard monorepo layout (dist/index.mjs sitting next to the frontend bundle).
const frontendDist =
  process.env.FRONTEND_DIST ??
  path.resolve(process.cwd(), "../bon-barang/dist/public");

if (fs.existsSync(frontendDist)) {
  logger.info({ frontendDist }, "Serving static frontend");
  app.use(express.static(frontendDist, { index: false }));

  app.get(/^\/(?!api(?:\/|$)).*/, (req: Request, res: Response, next: NextFunction) => {
    const indexPath = path.join(frontendDist, "index.html");
    fs.access(indexPath, fs.constants.R_OK, (err) => {
      if (err) return next();
      res.sendFile(indexPath);
    });
  });
} else {
  logger.info({ frontendDist }, "Frontend bundle not found — API-only mode");
}

export default app;
