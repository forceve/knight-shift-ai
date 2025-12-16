import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import PlayPage from "./pages/PlayPage";
import M2MPage from "./pages/M2MPage";
import ReplayPage from "./pages/ReplayPage";
import HistoryPage from "./pages/HistoryPage";

function Shell() {
  return (
    <div className="min-h-screen text-slate-100 bg-midnight">
      <header className="sticky top-0 z-20 bg-midnight/90 backdrop-blur border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.25em] text-slate-400">Knight Shift AI</div>
            <div className="text-lg font-semibold text-slate-50">Chess Lab</div>
          </div>
          <nav className="flex gap-3 text-sm font-semibold">
            <NavLink to="/" className={({ isActive }) => `px-3 py-2 rounded-lg ${isActive ? "bg-white/15" : "hover:bg-white/10"}`}>
              Home
            </NavLink>
            <NavLink to="/play" className={({ isActive }) => `px-3 py-2 rounded-lg ${isActive ? "bg-white/15" : "hover:bg-white/10"}`}>
              Play
            </NavLink>
            <NavLink to="/m2m" className={({ isActive }) => `px-3 py-2 rounded-lg ${isActive ? "bg-white/15" : "hover:bg-white/10"}`}>
              M2M & Tests
            </NavLink>
            <NavLink to="/history" className={({ isActive }) => `px-3 py-2 rounded-lg ${isActive ? "bg-white/15" : "hover:bg-white/10"}`}>
              History
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/play" element={<PlayPage />} />
          <Route path="/m2m" element={<M2MPage />} />
          <Route path="/replay/:matchId" element={<ReplayPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
