// EXAMFORGE — application shell: sidebar, top navigation, routes.

import { useMemo, useState } from 'react';
import { HashRouter, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useStore } from './state/store';
import { ALL_TOPICS, SUBJECTS, TOPIC_MAP } from './data/syllabus';
import { STUDY_LABEL } from './data/labels';
import { studyStreak } from './engine/analytics';
import { dueRevisions } from './engine/revision';
import { prettyDate, todayKey } from './engine/dates';
import { weakestTopics } from './engine/progress';
import { Dashboard } from './pages/Dashboard';
import { Subjects } from './pages/Subjects';
import { Tracker } from './pages/Tracker';
import { Planner } from './pages/Planner';
import { Learn } from './pages/Learn';
import { Bank } from './pages/Bank';
import { Lab } from './pages/Lab';
import { Practice } from './pages/Practice';
import { Mocks } from './pages/Mocks';
import { Revision } from './pages/Revision';
import { Analytics } from './pages/Analytics';
import { SettingsPage } from './pages/Settings';

const NAV = [
  { to: '/', label: 'Dashboard', ico: '◈' },
  { to: '/subjects', label: 'My Subjects', ico: '▤' },
  { to: '/tracker', label: 'Syllabus Tracker', ico: '✓' },
  { to: '/planner', label: 'Study Planner', ico: '▦' },
  { to: '/learn', label: 'Learn', ico: '◐' },
  { to: '/bank', label: 'Question Bank', ico: '?' },
  { to: '/lab', label: 'Numerical Lab', ico: '∑' },
  { to: '/practice', label: 'Practice Tests', ico: '◍' },
  { to: '/mocks', label: 'Mock Examinations', ico: '⏱' },
  { to: '/revision', label: 'Revision Centre', ico: '↻' },
  { to: '/analytics', label: 'Performance Analytics', ico: '▥' },
  { to: '/settings', label: 'Settings', ico: '⚙' },
];

function TopBar({ onMenu }: { onMenu: () => void }) {
  const { state } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const today = todayKey();
  const todayMinutes = state.studyLog.find((l) => l.date === today)?.minutes ?? 0;
  const streak = studyStreak(state);
  const due = dueRevisions(state).length;
  const weak = weakestTopics(state, 50).filter((w) => w.reason !== 'mastered').length;

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return ALL_TOPICS.filter(
      (t) => t.name.toLowerCase().includes(q) || t.subtopics.some((s) => s.toLowerCase().includes(q)),
    ).slice(0, 8);
  }, [query]);

  return (
    <header className="topbar">
      <button className="btn ghost sm menu-btn" onClick={onMenu} aria-label="Toggle navigation">
        ☰
      </button>
      <div className="col" style={{ gap: 0 }}>
        <span className="topbar-title">{prettyDate(today)}</span>
        <span className="topbar-date">
          {STUDY_LABEL[state.timetable?.mode ?? 'sprint']} · target {Math.round(state.settings.dailyTargetMin / 60)} h/day
        </span>
      </div>
      <div className="topbar-spacer" />
      <span className="chip" title="Study time logged today against your daily target">
        Today <b>{Math.floor(todayMinutes / 60)}h {todayMinutes % 60}m</b>
      </span>
      <span className="chip" title="Consecutive days with 30+ minutes studied">
        Streak <b>{streak}d</b>
      </span>
      <div className="search" style={{ position: 'relative' }}>
        <span aria-hidden className="muted">⌕</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search topics, subtopics…"
          aria-label="Search syllabus topics"
        />
        {hits.length > 0 && (
          <div className="search-results" style={{ position: 'absolute', top: 40, right: 'auto', left: 0, width: 380 }}>
            {hits.map((t) => (
              <button
                key={t.id}
                className="search-hit"
                style={{ background: 'none', border: 0, textAlign: 'left', width: '100%', color: '#f4f0e8' }}
                onClick={() => {
                  setQuery('');
                  navigate(`/learn?topic=${t.id}`);
                }}
              >
                <span>{t.name}</span>
                <small>
                  {SUBJECTS.find((s) => s.id === t.subjectId)?.code} · {TOPIC_MAP[t.id]?.unitId.toUpperCase()}
                </small>
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        className="chip"
        onClick={() => setShowNotes((v) => !v)}
        aria-label="Notifications"
        style={{ cursor: 'pointer', position: 'relative' }}
      >
        ◔ <b>{due + weak > 0 ? due + weak : ''}</b>
      </button>
      <div className="avatar" title="Local profile — all data stored in this browser">EX</div>
      {showNotes && (
        <div className="search-results" style={{ top: 54 }}>
          <div className="item" onClick={() => { setShowNotes(false); navigate('/revision'); }}>
            <span className="dot warn" />
            <div className="col">
              <b>{due} revision{due === 1 ? '' : 's'} due today</b>
              <small>Spaced-recall queue</small>
            </div>
          </div>
          <div className="item" onClick={() => { setShowNotes(false); navigate('/analytics'); }}>
            <span className="dot" />
            <div className="col">
              <b>{weak} topics flagged for revision</b>
              <small>Weak-topic list</small>
            </div>
          </div>
          <div className="item" onClick={() => { setShowNotes(false); navigate('/planner'); }}>
            <span className="dot em" />
            <div className="col">
              <b>{state.timetable?.sessions.filter((s) => !s.done && s.date >= today).length ?? 0} sessions ahead</b>
              <small>Study planner</small>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function Shell() {
  const [navOpen, setNavOpen] = useState(false);
  const { state } = useStore();
  const due = dueRevisions(state).length;

  return (
    <div className="app">
      <aside className={`sidebar ${navOpen ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">EF</span>
          <div className="col" style={{ gap: 0 }}>
            <span className="brand-name">EXAMFORGE</span>
            <span className="brand-tag">Understand. Apply. Master.</span>
          </div>
        </div>
        <nav>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setNavOpen(false)}
            >
              <span className="nav-ico" aria-hidden>{n.ico}</span>
              <span>{n.label}</span>
              {n.to === '/revision' && due > 0 && <span className="nav-count">{due}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          4 subjects · 20 units · 172 official topics
          <br />
          Stored locally in this browser.
        </div>
      </aside>
      <div className="main">
        <TopBar onMenu={() => setNavOpen((v) => !v)} />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/subjects" element={<Subjects />} />
          <Route path="/subjects/:subjectId" element={<Subjects />} />
          <Route path="/tracker" element={<Tracker />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/bank" element={<Bank />} />
          <Route path="/lab" element={<Lab />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/mocks" element={<Mocks />} />
          <Route path="/revision" element={<Revision />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
