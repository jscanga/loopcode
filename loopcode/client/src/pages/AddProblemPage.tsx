import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useStats } from "../StatsContext.js";
import { DIFFICULTIES, PATTERNS, type Difficulty } from "../types.js";

export function AddProblemPage() {
  const navigate = useNavigate();
  const { refresh } = useStats();

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [pattern, setPattern] = useState<string>(PATTERNS[0]);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.addProblem({ title, url, pattern, difficulty });
      await refresh();
      navigate("/problems");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add problem");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1>Add a Problem</h1>
      <p className="muted" style={{ marginTop: -4, marginBottom: 20 }}>
        Grow your deck with problems you're practicing. New problems are due for
        review right away.
      </p>

      <form className="card" onSubmit={submit}>
        {error && <div className="banner error">{error}</div>}

        <div className="form-field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            className="input"
            placeholder="e.g. Merge Intervals"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="url">Problem link</label>
          <input
            id="url"
            className="input"
            type="url"
            placeholder="https://leetcode.com/problems/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="pattern">Pattern</label>
          <select
            id="pattern"
            className="select"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
          >
            {PATTERNS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="difficulty">Difficulty</label>
          <select
            id="difficulty"
            className="select"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d[0].toUpperCase() + d.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <button className="btn green block" type="submit" disabled={saving}>
          {saving ? "Adding…" : "Add problem"}
        </button>
      </form>
    </div>
  );
}
