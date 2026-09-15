// Ensures server/.env exists so Prisma has a DATABASE_URL on first run.
// Copies .env.example → .env when .env is missing. Safe to run repeatedly.
import { existsSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const serverDir = join(here, "..");
const envPath = join(serverDir, ".env");
const examplePath = join(serverDir, ".env.example");

if (!existsSync(envPath)) {
  if (existsSync(examplePath)) {
    copyFileSync(examplePath, envPath);
    console.log("[loopcode] Created server/.env from .env.example");
  } else {
    console.warn("[loopcode] No .env.example found; skipping .env creation");
  }
}
