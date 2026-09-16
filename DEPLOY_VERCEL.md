# Deploying LoopCode to Vercel (fully Vercel-native)

LoopCode deploys as a **single Vercel project**:

- the **React app** is served as static files, and
- the **Express API** runs as a Vercel serverless function (`api/[...path].ts`),
- backed by **Turso** (libSQL) — SQLite over HTTPS, which works from serverless
  functions where a local SQLite file cannot persist.

The frontend calls the API at `/api/*` on the same domain, so there's no CORS or
cross-host URL to configure.

> Why Turso? Vercel functions have an ephemeral, read-only filesystem, so a
> `file:./dev.db` SQLite database can't hold data between requests. Turso is
> SQLite-compatible, so **the schema and every query stay exactly the same** —
> only the connection changes. Locally you still use a plain SQLite file.

---

## 1. Create the Turso database

Install the CLI and sign up (free tier is plenty):

```bash
curl -sSfL https://get.tur.so/install.sh | bash   # macOS/Linux; or `brew install tursodatabase/tap/turso`
turso auth signup
turso db create loopcode
```

Grab the two values you'll need:

```bash
turso db show loopcode --url            # -> libsql://loopcode-<you>.turso.io
turso db tokens create loopcode         # -> a long ey... token
```

## 2. Create the schema on Turso

From the repo root, generate the SQL for the current Prisma schema and pipe it
into your Turso database:

```bash
npm run db:sql > schema.sql             # emits CREATE TABLE statements
turso db shell loopcode < schema.sql
rm schema.sql
```

## 3. (Recommended) Seed the demo data into Turso

This populates the 40 problems + simulated history so the deployed app looks
alive. Point the seed at Turso by setting the env vars just for this command:

```bash
TURSO_DATABASE_URL="libsql://loopcode-<you>.turso.io" \
TURSO_AUTH_TOKEN="ey..." \
npm run db:seed
```

(You can re-run this anytime to reset the hosted data. You can also just add
problems through the app's **+ Add** screen once it's live.)

## 4. Deploy to Vercel

Push to GitHub, then import the repo at <https://vercel.com/new> (or run
`vercel` from the repo root). Vercel reads `vercel.json`, so build/install/output
settings are already configured — you don't need to change the framework preset.

Before the first successful deploy, add these **Environment Variables** in the
Vercel project (Settings → Environment Variables, for Production **and** Preview):

| Name                  | Value                                             |
| --------------------- | ------------------------------------------------- |
| `TURSO_DATABASE_URL`  | `libsql://loopcode-<you>.turso.io`                |
| `TURSO_AUTH_TOKEN`    | your `ey...` token                                |
| `DATABASE_URL`        | `file:./prisma/dev.db` (a dummy; only satisfies `prisma generate` at build time — runtime uses Turso) |

Then **Deploy** (or redeploy if the first build ran before you added the vars).

That's it — open the Vercel URL and you'll get the seeded app, with the review
queue, mastery map, streak, and dashboard all live.

---

## How the pieces fit (for the interview walkthrough)

- **`vercel.json`** sets `buildCommand: npm run build` (builds `server/dist` +
  `client/dist`), `outputDirectory: client/dist`, and a SPA rewrite that sends
  non-`/api` paths to `index.html` so client-side routes work on refresh.
- **`api/[...path].ts`** is a catch-all serverless function that imports the
  compiled Express app (`server/dist/app.js`) and exports it. Every `/api/*`
  request is handled by the same app used locally.
- **`server/src/db.ts`** picks the connection from the environment: `TURSO_*`
  vars → Turso in production; otherwise a local SQLite file. Because both are
  SQLite, nothing else in the codebase changes between local and prod.

## Troubleshooting

- **Blank data / API 500s:** the env vars aren't set (or you deployed before
  adding them). Set all three, then redeploy.
- **`Environment variable not found: DATABASE_URL` during build:** add the dummy
  `DATABASE_URL` above — `prisma generate` needs the variable to exist.
- **`no such table` errors:** step 2 didn't run against this database. Re-run the
  `turso db shell` import.
- **Local dev unaffected:** `npm install && npm run dev` still uses a local
  SQLite file and seeds itself on first run — no Turso needed.
