import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useStats } from "../StatsContext.js";
import type { Problem } from "../types.js";

function dueLabel(nextReviewDate: string | undefined): { text: string; overdue: boolean } {
  if (!nextReviewDate) return { text: "new", overdue: true };
  const now = new Date();
  const next = new Date(nextReviewDate);
  const msPerDay = 86400000;
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const diffDays = Math.round((next.getTime() - startToday.getTime()) / msPerDay);
  if (diffDays <= 0) return { text: "due now", overdue: true };
  if (diffDays === 1) return { text: "due tomorrow", overdue: false };
  return { text: `due in ${diffDays}d`, overdue: false };
}

export function ProblemsPage() {
  const { refresh } = useStats();
  const [problems, setProblems] = useState<Problem[] | null>(null);
  const [filter, setFilter] = useState<string>("all");

  async function load() {
    setProblems(await api.getProblems());
  }
  useEffect(() => {
    void load();
  }, []);

  async function remove(id: string) {
    await api.deleteProblem(id);
    await load();
    void refresh();
  }

  if (problems === null) return <div className="spinner">Loading problems…</div>;

  const patterns = ["all", ...Array.from(new Set(problems.map((p) => p.pattern)))];
  const shown =
    filter === "all" ? problems : problems.filter((p) => p.pattern === filter);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ marginBottom: 0 }}>All Problems</h1>
        <Link className="btn green" to="/add" style={{ marginLeft: "auto" }}>
          + Add problem
        </Link>
      </div>

      <div className="nav-tabs" style={{ marginTop: 16 }}>
        {patterns.map((p) => (
          <button
            key={p}
            className={`nav-tab${filter === p ? " active" : ""}`}
            onClick={() => setFilter(p)}
          >
            {p === "all" ? "All" : p}
          </button>
        ))}
      </div>

      <div className="card">
        {shown.length === 0 && <p className="muted center">No problems in this pattern yet.</p>}
        {shown.map((p) => {
          const due = dueLabel(p.progress?.nextReviewDate);
          return (
            <div className="problem-row" key={p.id}>
              <div className="grow">
                <div className="title">
                  <a href={p.url} target="_blank" rel="noreferrer">
                    {p.title}
                  </a>
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                  <span className={`difficulty ${p.difficulty}`}>{p.difficulty}</span>{" "}
                  · {p.progress?.repetitions ?? 0} reps · ease{" "}
                  {(p.progress?.easeFactor ?? 2.5).toFixed(2)}
                </div>
              </div>
              <span className="tag">{p.pattern}</span>
              <span className={`due-tag${due.overdue ? " overdue" : ""}`}>{due.text}</span>
              <button
                className="btn ghost"
                style={{ padding: "6px 10px", boxShadow: "none" }}
                title="Delete problem"
                onClick={() => remove(p.id)}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
