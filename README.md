# 🔁 LoopCode

**A spaced-repetition trainer for coding-interview patterns.**

Grinding LeetCode once teaches you a problem. LoopCode helps you _retain the
pattern_ — Two Pointers, DFS/BFS, Dynamic Programming — by scheduling reviews
over time with the **SM-2 spaced-repetition algorithm**, the same family of
algorithm that powers Anki.

> Built as a portfolio project. The scheduling engine is deliberately isolated,
> commented, and unit-tested so it's easy to walk through in an interview.

---

## Why this exists — the forgetting curve

Hermann Ebbinghaus's _forgetting curve_ shows that newly-learned information
decays exponentially: without reinforcement, you lose most of it within days.
Anyone who has "solved" a medium on Monday and stared blankly at the same
pattern two weeks later has felt this directly.

Spaced repetition fights the curve by reviewing each item at **expanding
intervals**, timed to just before you'd forget it. Each successful recall
strengthens the memory and lets the next interval grow, so you convert
short-term recognition into durable long-term memory with the _fewest possible
reviews_. LoopCode applies this to problem-solving **patterns** rather than
trivia: you solve on LeetCode/NeetCode, then honestly rate how well you recalled
the approach, and the app schedules the next review.

---

## Features

- **Daily review queue** — see exactly what's due today, ordered by urgency.
  Open the problem, solve it, then self-rate **Again / Hard / Good / Easy**.
- **SM-2 scheduling** — each rating updates the problem's interval, ease factor,
  and repetition count, then sets the next due date.
- **Pattern mastery map** — a Duolingo-style skill grid: each of the 8 core
  patterns levels up 0→5 based on aggregate performance.
- **Streaks & XP** — a daily flame-streak counter and XP per review. Honest
  "Again" ratings award the _most_ XP, so there's no incentive to game the
  system by clicking "Good".
- **Dashboard** — Recharts visualizations: reviews due over the next 14 days,
  retention/accuracy trend, and your weakest patterns.
- **Add-your-own** — grow the deck with problems you're practicing.
- **Playful, mobile-responsive UI** — rounded cards, bright accents, confetti
  when you clear the day's queue, and encouraging empty states.

---

## Tech stack

| Layer     | Choice                                            |
| --------- | ------------------------------------------------- |
| Frontend  | React + TypeScript, Vite, React Router, Recharts  |
| Backend   | Node + Express (TypeScript, ESM)                  |
| Database  | SQLite via Prisma ORM (local file; Turso/libSQL in prod) |
| Testing   | Vitest (scheduling logic + aggregations)          |

No authentication: LoopCode is single-user by design, which keeps the focus on
the scheduling engine. See [Future work](#future-work).

---

## Quick start

```bash
npm install      # installs client + server, generates Prisma client, creates & seeds the SQLite DB
npm run dev      # starts the API (:4000) and the web app (:5173) together
```

Then open **http://localhost:5173**.

> `npm install` generates the Prisma client; the first `npm run dev` creates the
> local SQLite database and **seeds it with 40 problems and a simulated 3-week
> study history** (only if it's empty), so the dashboard, streak, and mastery map
> have real data on first launch. Restarting the dev server never wipes your
> data — use `npm run db:reset` to force a fresh seed.

Other useful scripts:

```bash
npm test           # run the unit test suite (scheduling logic, mastery, streak, seed sim)
npm run typecheck  # typecheck client + server
npm run build      # production build of both
npm run db:reset   # wipe and re-seed the database
```

---

## How the SM-2 algorithm works (and how it's implemented)

The scheduler lives in **[`server/src/lib/spacedRepetition.ts`](server/src/lib/spacedRepetition.ts)**
— a dependency-free module of pure functions with full unit tests in
[`spacedRepetition.test.ts`](server/src/lib/spacedRepetition.test.ts). This is
the technical heart of the project.

Each problem carries three pieces of state:

- **`repetitions`** — consecutive successful recalls (resets to 0 on a lapse).
- **`easeFactor`** — a per-item multiplier (starts at 2.5, floored at 1.3).
  Higher ease → intervals grow faster.
- **`intervalDays`** — the current gap in days until the next review.

On each review the learner rates recall quality. LoopCode maps its four buttons
to SM-2's 0–5 quality scale:

| Button | Quality | Meaning                         |
| ------ | ------- | ------------------------------- |
| Again  | 1       | Failed to recall the pattern    |
| Hard   | 3       | Recalled with serious effort    |
| Good   | 4       | Recalled correctly              |
| Easy   | 5       | Recalled effortlessly           |

**Scheduling rules** (`scheduleReview`):

1. If `quality < 3` (a lapse), reset `repetitions` to 0 and re-show tomorrow.
2. Otherwise grow the interval:
   - 1st success → **1 day**
   - 2nd success → **6 days**
   - 3rd+ → `round(previousInterval × easeFactor)`
3. Update the ease factor with the canonical SM-2 formula and clamp to ≥ 1.3:
   ```
   EF' = EF + (0.1 − (5 − q) × (0.08 + (5 − q) × 0.02))
   ```

**One deliberate deviation from textbook SM-2:** a _Hard_ success grows the
interval by a gentler `1.2×` instead of the full ease multiplier — matching
Anki's behaviour and learner expectations. It's isolated in `nextInterval` and
easy to remove.

`scheduleReview` takes `now` as an argument, which makes it deterministic and
trivially testable. Due dates are stored at **day granularity** (local midnight)
so a card due "today" stays due all day rather than only after the exact minute
it was last reviewed.

### Mastery & streaks

- **[`mastery.ts`](server/src/lib/mastery.ts)** derives a 0–5 mastery level per
  pattern by blending average repetitions (60%) and average ease factor (40%)
  across that pattern's problems. It's derived, not stored, so it always
  reflects the latest reviews.
- **[`streak.ts`](server/src/lib/streak.ts)** computes the current and longest
  daily streak from review timestamps; the current streak survives if the last
  review was today _or_ yesterday.
- **[`aggregations.ts`](server/src/lib/aggregations.ts)** shapes the dashboard
  data (due forecast, retention trend, weakest patterns) as pure, tested
  functions — the route handlers just fetch rows and delegate.

---

## Architecture

```
loopcode/
├── package.json            # npm workspaces + one-command dev (concurrently)
├── vercel.json             # Vercel-native deploy (static client + /api function)
├── api/
│   └── [...path].ts         # Vercel serverless entry → serves the Express app
├── server/                 # Express + Prisma API
│   ├── prisma/
│   │   ├── schema.prisma    # Problem, ReviewLog, UserProgress
│   │   ├── seed.ts          # 40 curated problems + simulated history
│   │   └── bootstrap.ts     # seeds the local DB on first run if empty
│   └── src/
│       ├── app.ts           # builds the Express app (routes + error handler)
│       ├── index.ts         # local dev entry (app.listen)
│       ├── db.ts            # shared Prisma client (libSQL adapter: file or Turso)
│       ├── lib/             # ← pure, unit-tested domain logic
│       │   ├── spacedRepetition.ts   # SM-2 (the heart)
│       │   ├── mastery.ts            # pattern mastery levels
│       │   ├── streak.ts             # daily streak
│       │   ├── aggregations.ts       # dashboard shaping
│       │   ├── studyHistory.ts       # reproducible seed simulation
│       │   └── patterns.ts           # the 8 patterns + validation
│       └── routes/          # problems, reviews, stats, dashboard
└── client/                 # React + Vite + Recharts SPA
    └── src/
        ├── pages/           # Review, Mastery, Dashboard, Problems, Add
        ├── components/      # Confetti, ...
        ├── api.ts           # typed fetch wrapper
        └── StatsContext.tsx # shared streak/XP/due state
```

### Data model

- **`Problem`** — `title`, `url`, `pattern`, `difficulty`.
- **`ReviewLog`** — one immutable row per review: `rating`, `quality`,
  resulting `intervalDays` / `easeFactor`, `xp`, `reviewedAt`. Powers the
  retention trend.
- **`UserProgress`** — current scheduling state per problem: `intervalDays`,
  `easeFactor`, `repetitions`, `nextReviewDate`, `lastReviewedAt`.

### API

| Method   | Route                  | Purpose                                  |
| -------- | ---------------------- | ---------------------------------------- |
| `GET`    | `/api/reviews/queue`   | Problems due now, most overdue first     |
| `POST`   | `/api/reviews`         | Submit a rating → run SM-2 → reschedule  |
| `GET`    | `/api/problems`        | All problems with progress               |
| `POST`   | `/api/problems`        | Add a problem                            |
| `DELETE` | `/api/problems/:id`    | Remove a problem                         |
| `GET`    | `/api/stats`           | Streak, XP, due count, pattern mastery   |
| `GET`    | `/api/dashboard`       | Chart data                               |

---

## Screenshots

_Placeholders — capture these once running locally:_

| Review queue                     | Mastery map                      |
| -------------------------------- | -------------------------------- |
| ![Review](docs/review.png)       | ![Mastery](docs/mastery.png)     |

| Dashboard                        | Daily complete 🎉                |
| -------------------------------- | -------------------------------- |
| ![Dashboard](docs/dashboard.png) | ![Complete](docs/complete.png)   |

> Suggested GIF: clearing the last due review and triggering the confetti burst
> (`docs/loopcode-demo.gif`).

---

## Testing

The scheduling logic — the part worth defending in an interview — is covered by
Vitest:

```bash
npm test
```

- `spacedRepetition.test.ts` — the SM-2 ramp (1→6→15 days), lapse handling,
  ease-factor math and floor, XP incentives, determinism.
- `mastery.test.ts` — score/level derivation and clamping.
- `streak.test.ts` — consecutive-day counting, yesterday grace, longest run.
- `aggregations.test.ts` — due forecast bucketing, retention accuracy, mastery
  grouping.
- `studyHistory.test.ts` — the seed simulation (deterministic, keeps the streak
  alive, leaves a healthy due-today queue).

---

## Deployment (Vercel-native)

LoopCode deploys as a **single Vercel project**: the React app is served
statically, the Express API runs as a serverless function
(`api/[...path].ts`), and the database is **Turso** (libSQL) — SQLite over
HTTPS, which works from serverless functions where a local SQLite file can't
persist. Because Turso is SQLite-compatible, the Prisma schema and every query
are unchanged; only the connection differs (`server/src/db.ts` selects Turso via
`TURSO_*` env vars in production, and a local file otherwise).

The frontend calls the API at `/api/*` on the same domain, so there's no CORS or
API-URL wiring.

**Full step-by-step instructions are in [`DEPLOY_VERCEL.md`](DEPLOY_VERCEL.md)** —
create a Turso DB, push the schema, seed it, set three env vars in Vercel, and
deploy.

> Local development is unaffected: `npm install && npm run dev` uses a local
> SQLite file and seeds itself on first run — no Turso account needed.

---

## Future work

- **Per-pattern scheduling.** Tune SM-2 parameters per pattern rather than per
  problem, since some patterns (DP) genuinely decay faster than others (Two
  Pointers).
- **LLM-based hint grading.** Let the user write a one-line approach before
  revealing the solution and have an LLM grade the recall quality, replacing
  pure self-assessment.
- **Accounts & sync.** Add authentication and move from SQLite to Postgres for a
  shared, always-on hosted demo.
- **FSRS.** Offer the modern [FSRS](https://github.com/open-spaced-repetition)
  scheduler as an alternative to SM-2 and A/B the retention curves.
- **Companies & lists.** Tag problems by company and import NeetCode 150 /
  Blind 75 as ready-made decks.

---

## License

MIT — do whatever you like.
