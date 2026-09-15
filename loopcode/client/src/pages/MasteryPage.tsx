import { useStats } from "../StatsContext.js";
import type { PatternMastery } from "../types.js";

const LEVEL_LABELS = ["Locked", "Novice", "Learner", "Skilled", "Strong", "Mastered"];

function Tile({ m }: { m: PatternMastery }) {
  const locked = m.reviewedCount === 0;
  return (
    <div className={`mastery-tile${locked ? " locked" : ""}`}>
      <div className="mastery-badge">{locked ? "🔒" : m.level}</div>
      <div className="mastery-name">{m.pattern}</div>
      <div className="pips" aria-label={`Mastery level ${m.level} of 5`}>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={`pip${i < m.level ? " on" : ""}`} />
        ))}
      </div>
      <div className="muted" style={{ fontSize: 13, fontWeight: 700 }}>
        {LEVEL_LABELS[m.level]}
      </div>
      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
        {m.reviewedCount}/{m.totalCount} problems started
      </div>
    </div>
  );
}

export function MasteryPage() {
  const { stats, loading } = useStats();

  if (loading || !stats) {
    return <div className="spinner">Loading mastery map…</div>;
  }

  return (
    <div>
      <h1>Pattern Mastery</h1>
      <p className="muted" style={{ marginTop: -4, marginBottom: 20 }}>
        Each skill levels up from 0 to 5 as you reliably recall its problems over
        time. Weak patterns are where to focus next.
      </p>
      <div className="mastery-grid">
        {stats.mastery.map((m) => (
          <Tile key={m.pattern} m={m} />
        ))}
      </div>
    </div>
  );
}
