/**
 * bootstrap.ts — used by `npm run dev` to make first-run seamless.
 *
 * It checks whether the database already has problems and, if it's empty, runs
 * the seed. On subsequent starts it does nothing, so your review history is
 * never wiped by restarting the dev server. (Use `npm run db:reset` to force a
 * fresh seed.)
 */
import { prisma } from "../src/db.js";
import { seedDatabase } from "./seed.js";

async function main() {
  const count = await prisma.problem.count();
  if (count > 0) {
    console.log(`[bootstrap] Database already has ${count} problems — skipping seed.`);
    return;
  }
  console.log("[bootstrap] Empty database — seeding demo data…");
  await seedDatabase();
}

main()
  .catch((e) => {
    console.error("[bootstrap] Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
