/**
 * Vercel serverless entry point for the LoopCode API.
 *
 * This catch-all function ([...path]) receives every request under `/api/*` and
 * hands it to the same Express app used in local development. An Express app is
 * itself a `(req, res)` handler, so Vercel can invoke it directly.
 *
 * The database connection (Turso/libSQL) is configured in server/src/db.ts via
 * the TURSO_DATABASE_URL / TURSO_AUTH_TOKEN environment variables.
 */
// Imports the COMPILED server output (produced by `npm run build`), so Vercel's
// function bundler works with real .js files rather than TypeScript sources.
import { createApp } from "../server/dist/app.js";

const app = createApp();

export default app;
