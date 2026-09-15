import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useStats } from "../StatsContext.js";
import { Confetti } from "../components/Confetti.js";
import type { Problem, Rating } from "../types.js";

const RATINGS: { key: Rating; label: string; hint: string }[] = [
  { key: "again", label: "Again", hint: "Forgot it" },
  { key: "hard", label: "Hard", hint: "A struggle" },
  { key: "good", label: "Good", hint: "Got it" },
  { key: "easy", label: "Easy", hint: "Too easy" },
];

function formatInterval(days: number): string {
  if (days <= 1) return "tomorrow";
  if (days < 30) return `in ${days} days`;
  const months = Math.round(days / 30);
  return months <= 1 ? "in ~1 month" : `in ~${months} months`;
}

export function ReviewPage() {
  const { refresh } = useStats();
  const [queue, setQueue] = useState<Problem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    void (async () => {
      const q = await api.getQueue();
      setQueue(q);
    })();
  }, []);

  const total = queue?.length ?? 0;
  const current = queue?.[index];
  const done = queue !== null && index >= total && total > 0;
  const progressPct = total === 0 ? 0 : Math.round((index / total) * 100);

  // Fire confetti once when the whole queue is cleared.
  useEffect(() => {
    if (done) setCelebrate(true);
  }, [done]);

  async function rate(rating: Rating) {
    if (!current || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.submitReview(current.id, rating);
      setSessionXp((x) => x + res.xpEarned);
      setSessionCount((c) => c + 1);
      setToast(`+${res.xpEarned} XP · next review ${formatInterval(res.intervalDays)}`);
      window.setTimeout(() => setToast(null), 1800);
      setIndex((i) => i + 1);
      void refresh();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (queue === null) {
    return <div className="spinner">Loading your review queue…</div>;
  }

  // Nothing was ever due today.
  if (total === 0) {
    return (
      <EmptyAllCaught
        heading="Nothing due right now! 🎉"
        sub="You're all caught up. Add a new problem or come back when reviews are due."
      />
    );
  }

  // Finished the whole queue this session.
  if (done) {
    return (
      <>
        {celebrate && <Confetti onDone={() => setCelebrate(false)} />}
        <div className="card review-card bounce">
          <div className="big-emoji" style={{ fontSize: 64 }}>
            🏆
          </div>
          <h2>Daily reviews complete!</h2>
          <p className="muted">
            You reviewed <strong>{sessionCount}</strong>{" "}
            {sessionCount === 1 ? "problem" : "problems"} and earned{" "}
            <strong>{sessionXp} XP</strong>. Your streak is safe — see you
            tomorrow!
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
            <Link className="btn green" to="/dashboard">
              View progress
            </Link>
            <Link className="btn ghost" to="/mastery">
              Mastery map
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <div>
      <div className="progress-track" aria-label="Session progress">
        <div className="progress-fill" style={{ width: `${progressPct}%` }} />
      </div>
      <p className="muted center" style={{ marginTop: -8 }}>
        {index + 1} of {total} · {sessionXp} XP earned this session
      </p>

      {toast && (
        <div className="banner success center xp-pop" key={toast}>
          {toast}
        </div>
      )}

      <div className="card review-card" key={current!.id}>
        <span className="pattern-chip">{current!.pattern}</span>
        <div className="problem-title">{current!.title}</div>
        <div className={`difficulty ${current!.difficulty}`}>
          {current!.difficulty}
        </div>

        <div>
          <a
            className="open-link"
            href={current!.url}
            target="_blank"
            rel="noreferrer"
          >
            ↗ Open on LeetCode
          </a>
        </div>
        <p className="muted" style={{ marginTop: 10 }}>
          Solve it, then rate how well you recalled the <em>pattern</em>.
        </p>

        <div className="rating-grid">
          {RATINGS.map((r) => (
            <button
              key={r.key}
              className={`rating-btn ${r.key}`}
              onClick={() => rate(r.key)}
              disabled={submitting}
            >
              {r.label}
              <small>{r.hint}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyAllCaught({ heading, sub }: { heading: string; sub: string }) {
  return (
    <div className="card empty-state bounce">
      <div className="big-emoji">🌱</div>
      <h2>{heading}</h2>
      <p className="muted">{sub}</p>
      <div style={{ marginTop: 16 }}>
        <Link className="btn green" to="/add">
          Add a problem
        </Link>
      </div>
    </div>
  );
}
