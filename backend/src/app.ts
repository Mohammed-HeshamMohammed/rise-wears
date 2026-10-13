import { resolve } from "node:path";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import { ZodError } from "zod";
import { config } from "./config.js";
import { HttpError } from "./lib/auth.js";
import { accountRouter } from "./routes/account.js";
import { adminRouter } from "./routes/admin.js";
import { adminAuthRouter } from "./routes/adminAuth.js";
import { publicRouter } from "./routes/public.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: config.corsOrigins,
      allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Session"],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    }),
  );
  app.use(express.json({ limit: "100kb" }));

  app.use("/uploads", express.static(resolve(config.UPLOAD_DIR), { maxAge: "30d", immutable: true, index: false }));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/admin/auth", adminAuthRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api", accountRouter);
  app.use("/api", publicRouter);

  app.use("/api", (_req, _res, next) => next(new HttpError(404, "Not found")));

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err instanceof ZodError) {
      const first = err.issues[0];
      return res.status(400).json({ error: `${first?.path.join(".") || "request"}: ${first?.message ?? "invalid"}` });
    }
    const e = err as { code?: string; type?: string; status?: number };
    if (e.code === "23505") return res.status(409).json({ error: "That value already exists." });
    if (e.code === "23503") return res.status(409).json({ error: "This item is in use by something else." });
    if (e.type === "entity.too.large") return res.status(413).json({ error: "Too large" });
    if (e.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON" });
    console.error(err);
    res.status(500).json({ error: "Something went wrong." });
  });
  return app;
}
