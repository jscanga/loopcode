import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api.js";
import { useStats } from "../StatsContext.js";
import type { DashboardData } from "../types.js";

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

const COLORS = ["#58cc02", "#1cb0f6", "#ce82ff", "#ffc800", "#ff9600"];

export function DashboardPage() {
  const { stats } = useStats();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setData(await api.getDashboard());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      }
    })();
  }, []);

  if (error) return <div className="banner error">{error}</div>;
  if (!data || !stats) return <div className="spinner">Loading dashboard…</div>;

  const forecast = data.dueForecast.map((d) => ({ ...d, label: shortDate(d.date) }));
  const trend = data.retentionTrend
    .filter((d) => d.accuracy !== null)
    .map((d) => ({ ...d, label: shortDate(d.date) }));
  const weakest = data.weakestPatterns.map((p) => ({
    pattern: p.pattern,
    pct: Math.round(p.score * 100),
  }));

  return (
    <div>
      <h1>Dashboard</h1>

      <div className="stat-row">
        <div className="stat-box">
          <div className="value">🔥 {stats.streak.current}</div>
          <div className="label">Day streak</div>
        </div>
        <div className="stat-box">
          <div className="value">{stats.streak.longest}</div>
          <div className="label">Longest streak</div>
        </div>
        <div className="stat-box">
          <div className="value">{stats.totalXp}</div>
          <div className="label">Total XP</div>
        </div>
        <div className="stat-box">
          <div className="value">{stats.totalReviews}</div>
          <div className="label">Reviews done</div>
        </div>
      </div>

      <div className="chart-card">
        <h3 className="card-title">Reviews due — next 14 days</h3>
        <p className="muted" style={{ marginTop: -4 }}>
          Plan ahead: today's bar includes anything overdue.
        </p>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={forecast} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: "rgba(88,204,2,0.08)" }}
                labelFormatter={(l) => `Day ${l}`}
                formatter={(v: number) => [`${v} reviews`, "Due"]}
              />
              <Bar dataKey="count" fill="#58cc02" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <h3 className="card-title">Retention trend</h3>
        <p className="muted" style={{ marginTop: -4 }}>
          Percent of reviews you recalled (rated Hard/Good/Easy) each day.
        </p>
        <div className="chart-wrap">
          {trend.length === 0 ? (
            <div className="spinner">No reviews yet — start reviewing to see your trend.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                <Tooltip
                  labelFormatter={(l) => `Day ${l}`}
                  formatter={(v: number) => [`${v}%`, "Recall"]}
                />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#1cb0f6"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="chart-card">
        <h3 className="card-title">Weakest patterns</h3>
        <p className="muted" style={{ marginTop: -4 }}>
          Lowest mastery scores — your highest-leverage practice targets.
        </p>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={weakest}
              margin={{ top: 8, right: 16, left: 40, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
              <YAxis
                type="category"
                dataKey="pattern"
                width={120}
                tick={{ fontSize: 12 }}
              />
              <Tooltip formatter={(v: number) => [`${v}%`, "Mastery"]} />
              <Bar dataKey="pct" radius={[0, 6, 6, 0]}>
                {weakest.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
