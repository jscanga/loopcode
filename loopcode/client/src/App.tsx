import { NavLink, Route, Routes } from "react-router-dom";
import { StatsProvider, useStats } from "./StatsContext.js";
import { ReviewPage } from "./pages/ReviewPage.js";
import { MasteryPage } from "./pages/MasteryPage.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { ProblemsPage } from "./pages/ProblemsPage.js";
import { AddProblemPage } from "./pages/AddProblemPage.js";

function TopBar() {
  const { stats } = useStats();
  return (
    <header className="topbar">
      <div className="brand">
        <span className="logo" aria-hidden="true">
          🔁
        </span>
        LoopCode
      </div>
      <div className="topbar-stats">
        <span className="stat-pill" title="Daily streak">
          <span className="icon" aria-hidden="true">
            🔥
          </span>
          {stats?.streak.current ?? 0}
        </span>
        <span className="stat-pill xp" title="Total XP">
          <span className="icon" aria-hidden="true">
            ⚡
          </span>
          {stats?.totalXp ?? 0}
        </span>
        <span className="stat-pill due" title="Reviews due today">
          <span className="icon" aria-hidden="true">
            📅
          </span>
          {stats?.dueToday ?? 0}
        </span>
      </div>
    </header>
  );
}

const TABS = [
  { to: "/", label: "Review", end: true },
  { to: "/mastery", label: "Mastery Map" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/problems", label: "Problems" },
  { to: "/add", label: "+ Add" },
];

function NavTabs() {
  return (
    <nav className="nav-tabs">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) => `nav-tab${isActive ? " active" : ""}`}
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function App() {
  return (
    <StatsProvider>
      <div className="app-shell">
        <TopBar />
        <main className="content">
          <NavTabs />
          <Routes>
            <Route path="/" element={<ReviewPage />} />
            <Route path="/mastery" element={<MasteryPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/problems" element={<ProblemsPage />} />
            <Route path="/add" element={<AddProblemPage />} />
          </Routes>
        </main>
      </div>
    </StatsProvider>
  );
}
