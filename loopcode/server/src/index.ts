import express from "express";
import cors from "cors";
import { problemsRouter } from "./routes/problems.js";
import { reviewsRouter } from "./routes/reviews.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { statsRouter } from "./routes/stats.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "loopcode-api" });
});

app.use("/api/problems", problemsRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/stats", statsRouter);

// Centralised error handler so route handlers can just throw.
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: express.NextFunction
  ) => {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = (err as { status?: number })?.status ?? 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: message });
  }
);

app.listen(PORT, () => {
  console.log(`[loopcode] API listening on http://localhost:${PORT}`);
});
