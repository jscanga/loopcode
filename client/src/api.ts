import type {
  Problem,
  Stats,
  ReviewResponse,
  DashboardData,
  Rating,
  Difficulty,
} from "./types.js";

// In dev, VITE_API_URL is empty and Vite proxies /api → :4000.
// In production, set VITE_API_URL to the deployed API origin.
const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  getStats: () => request<Stats>("/api/stats"),
  getQueue: () => request<Problem[]>("/api/reviews/queue"),
  getProblems: () => request<Problem[]>("/api/problems"),
  getDashboard: () => request<DashboardData>("/api/dashboard"),

  submitReview: (problemId: string, rating: Rating) =>
    request<ReviewResponse>("/api/reviews", {
      method: "POST",
      body: JSON.stringify({ problemId, rating }),
    }),

  addProblem: (input: {
    title: string;
    url: string;
    pattern: string;
    difficulty: Difficulty;
  }) =>
    request<Problem>("/api/problems", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  deleteProblem: (id: string) =>
    request<void>(`/api/problems/${id}`, { method: "DELETE" }),
};
