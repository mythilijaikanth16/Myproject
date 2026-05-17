import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

const API_BASE = 'http://localhost:8000';

/* ─── API helper ─────────────────────────────────────────────────────────── */
async function apiFetch(path, options = {}, token = null) {
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

/* ─── Toast system ──────────────────────────────────────────────────────── */
function useToast() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(ts => [...ts, { id, msg, type }]);
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 3600);
  }, []);
  return { toasts, push };
}

function ToastContainer({ toasts }) {
  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast--${t.type}`}>
          <span className="toast__icon">{t.type === 'success' ? '✓' : '✕'}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/* ─── Auth Screen ────────────────────────────────────────────────────────── */
function AuthScreen({ onLogin, toast }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'login') {
        const body = new URLSearchParams({ username, password });
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Login failed');
        onLogin(data.access_token, username);
        toast(`Welcome back, ${username}!`);
      } else {
        await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        });
        toast('Account created — please sign in.');
        setMode('login');
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">🎓</div>
        <h1 className="auth-card__title">Student Registry</h1>
        <p className="auth-card__sub">
          {mode === 'login' ? 'Sign in to continue' : 'Create an admin account'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label className="field__label">Username</label>
            <input
              className="field__input"
              type="text" required autoComplete="username"
              placeholder="admin"
              value={username} onChange={e => setUsername(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field__label">Password</label>
            <input
              className="field__input"
              type="password" required autoComplete="current-password"
              placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn--primary btn--full" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="auth-card__switch">
          {mode === 'login' ? "Don't have an account? " : 'Already have one? '}
          <button
            className="link-btn"
            onClick={() => setMode(m => m === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Register' : 'Sign in'}
          </button>
        </p>
        <p className="auth-card__hint">Default: admin / admin123</p>
      </div>
    </div>
  );
}

/* ─── Stats Bar ─────────────────────────────────────────────────────────── */
function StatsBar({ stats }) {
  if (!stats) return null;
  const topClass = Object.entries(stats.students_per_class || {})
    .sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <span className="stat-card__label">Total students</span>
        <span className="stat-card__value">{stats.total_students}</span>
      </div>
      <div className="stat-card">
        <span className="stat-card__label">Classes</span>
        <span className="stat-card__value">{stats.total_classes}</span>
      </div>
      <div className="stat-card">
        <span className="stat-card__label">With files</span>
        <span className="stat-card__value">{stats.with_files}</span>
      </div>
      <div className="stat-card">
        <span className="stat-card__label">Largest class</span>
        <span className="stat-card__value stat-card__value--sm">
          {topClass ? `${topClass[0]} (${topClass[1]})` : '—'}
        </span>
      </div>
    </div>
  );
}

/* ─── Register Form ─────────────────────────────────────────────────────── */
function RegisterForm({ token, onDone, toast }) {
  const [form, setForm] = useState({ name: '', student_class: '', roll_no: '' });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef();

  function set(key) {
    return e => setForm(f => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name.trim());
      fd.append('student_class', form.student_class.trim());
      fd.append('roll_no', form.roll_no.trim());
      if (file) fd.append('file', file);

      const data = await apiFetch('/register', { method: 'POST', body: fd }, token);
      toast(`${data.name} registered in ${data.student_class}!`);
      setForm({ name: '', student_class: '', roll_no: '' });
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      onDone();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <h2 className="panel__title">Register student</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field">
            <label className="field__label">Full name</label>
            <input className="field__input" type="text" required
              placeholder="e.g. Priya Sharma"
              value={form.name} onChange={set('name')} />
          </div>
          <div className="field">
            <label className="field__label">Roll number</label>
            <input className="field__input" type="text" required
              placeholder="e.g. 24CS101"
              value={form.roll_no} onChange={set('roll_no')} />
          </div>
          <div className="field">
            <label className="field__label">Class / section</label>
            <input className="field__input" type="text" required
              placeholder="e.g. 10-A or CS-3rd"
              value={form.student_class} onChange={set('student_class')} />
          </div>
          <div className="field">
            <label className="field__label">Upload file (optional)</label>
            <input className="field__input field__input--file"
              type="file" ref={fileRef}
              accept="image/*,.pdf,.doc,.docx"
              onChange={e => setFile(e.target.files[0] || null)} />
          </div>
        </div>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Registering…' : '+ Register student'}
        </button>
      </form>
    </div>
  );
}

/* ─── Edit Modal ─────────────────────────────────────────────────────────── */
function EditModal({ student, token, onClose, onSaved, toast }) {
  const [form, setForm] = useState({
    name: student.name,
    student_class: student.student_class,
    roll_no: student.roll_no,
  });
  const [busy, setBusy] = useState(false);

  function set(key) {
    return e => setForm(f => ({ ...f, [key]: e.target.value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await apiFetch(`/students/${student.id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      }, token);
      toast('Student updated!');
      onSaved();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal__title">Edit student #{student.id}</h3>
        <form onSubmit={handleSave}>
          <div className="field">
            <label className="field__label">Full name</label>
            <input className="field__input" required value={form.name} onChange={set('name')} />
          </div>
          <div className="field">
            <label className="field__label">Class</label>
            <input className="field__input" required value={form.student_class} onChange={set('student_class')} />
          </div>
          <div className="field">
            <label className="field__label">Roll number</label>
            <input className="field__input" required value={form.roll_no} onChange={set('roll_no')} />
          </div>
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Class Breakdown ────────────────────────────────────────────────────── */
function ClassBreakdown({ stats }) {
  if (!stats || !stats.students_per_class) return null;
  const entries = Object.entries(stats.students_per_class)
    .sort((a, b) => b[1] - a[1]);
  const max = entries[0]?.[1] || 1;

  return (
    <div className="panel">
      <h2 className="panel__title">Class breakdown</h2>
      <div className="breakdown-list">
        {entries.map(([cls, cnt]) => (
          <div key={cls} className="breakdown-row">
            <span className="breakdown-row__label">{cls}</span>
            <div className="breakdown-row__bar-wrap">
              <div
                className="breakdown-row__bar"
                style={{ width: `${Math.round((cnt / max) * 100)}%` }}
              />
            </div>
            <span className="breakdown-row__count">{cnt}</span>
            <span className="breakdown-row__pct">
              {Math.round((cnt / stats.total_students) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Students Table ─────────────────────────────────────────────────────── */
function StudentsTable({ token, toast }) {
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('registered_at');
  const [order, setOrder] = useState('desc');
  const [editing, setEditing] = useState(null);
  const [tab, setTab] = useState('list');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort_by: sortBy, order });
      if (search) params.set('search', search);
      const [s, st] = await Promise.all([
        apiFetch(`/students?${params}`, {}, token),
        apiFetch('/stats', {}, token),
      ]);
      setStudents(s);
      setStats(st);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [search, sortBy, order, token, toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function handleSort(field) {
    if (sortBy === field) setOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setOrder('asc'); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this student? This cannot be undone.')) return;
    try {
      await apiFetch(`/students/${id}`, { method: 'DELETE' }, token);
      toast('Student deleted.');
      fetchAll();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function SortTh({ field, label }) {
    const active = sortBy === field;
    return (
      <th className={`th--sortable${active ? ' th--active' : ''}`}
        onClick={() => handleSort(field)}>
        {label}
        <span className="sort-arrow">{active ? (order === 'asc' ? ' ↑' : ' ↓') : ' ⇅'}</span>
      </th>
    );
  }

  return (
    <div className="dashboard">
      <StatsBar stats={stats} />

      {/* Tabs */}
      <div className="tabs">
        {['list', 'register', 'breakdown'].map(t => (
          <button
            key={t}
            className={`tab${tab === t ? ' tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'list' ? 'Students' : t === 'register' ? '+ Register' : 'Class breakdown'}
          </button>
        ))}
        <div className="tabs__spacer" />
        <button className="btn btn--ghost btn--sm" onClick={fetchAll}>↻ Refresh</button>
      </div>

      {tab === 'register' && (
        <RegisterForm
          token={token}
          toast={toast}
          onDone={() => { fetchAll(); setTab('list'); }}
        />
      )}

      {tab === 'breakdown' && <ClassBreakdown stats={stats} />}

      {tab === 'list' && (
        <div className="panel">
          {/* Toolbar */}
          <div className="toolbar">
            <div className="search-box">
              <span className="search-box__icon" aria-hidden="true">🔍</span>
              <input
                className="field__input search-box__input"
                type="search"
                placeholder="Search name, class, roll no…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <span className="toolbar__count">
              {loading ? '…' : `${students.length} student${students.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          {/* Table */}
          {loading ? (
            <div className="empty-state">Loading…</div>
          ) : students.length === 0 ? (
            <div className="empty-state">No students found.</div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="th--id">#</th>
                    <SortTh field="name" label="Name" />
                    <SortTh field="roll_no" label="Roll no" />
                    <SortTh field="student_class" label="Class" />
                    <th>File</th>
                    <SortTh field="registered_at" label="Registered" />
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id} className="data-table__row">
                      <td className="td--id">{s.id}</td>
                      <td className="td--name">{s.name}</td>
                      <td>
                        <span className="badge badge--roll">{s.roll_no}</span>
                      </td>
                      <td>
                        <span className="badge badge--class">{s.student_class}</span>
                      </td>
                      <td>
                        {s.file_url
                          ? <a className="file-link"
                              href={`${API_BASE}${s.file_url}`}
                              target="_blank" rel="noreferrer">
                              📄 View
                            </a>
                          : <span className="td--empty">—</span>}
                      </td>
                      <td className="td--date">{fmtDate(s.registered_at)}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="btn btn--icon btn--ghost"
                            title="Edit"
                            onClick={() => setEditing(s)}
                            aria-label="Edit student"
                          >✏️</button>
                          <button
                            className="btn btn--icon btn--danger"
                            title="Delete"
                            onClick={() => handleDelete(s.id)}
                            aria-label="Delete student"
                          >🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {editing && (
        <EditModal
          student={editing}
          token={token}
          toast={toast}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); fetchAll(); }}
        />
      )}
    </div>
  );
}

/* ─── Root App ───────────────────────────────────────────────────────────── */
export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('sr_token') || null);
  const [username, setUsername] = useState(() => sessionStorage.getItem('sr_user') || null);
  const { toasts, push: toast } = useToast();

  function handleLogin(tok, user) {
    sessionStorage.setItem('sr_token', tok);
    sessionStorage.setItem('sr_user', user);
    setToken(tok);
    setUsername(user);
  }

  function handleLogout() {
    sessionStorage.removeItem('sr_token');
    sessionStorage.removeItem('sr_user');
    setToken(null);
    setUsername(null);
  }

  return (
    <>
      {!token ? (
        <AuthScreen onLogin={handleLogin} toast={toast} />
      ) : (
        <div className="app-shell">
          <header className="app-header">
            <div className="app-header__brand">
              <span className="app-header__logo">🎓</span>
              <span className="app-header__name">Student Registry</span>
            </div>
            <div className="app-header__user">
              <div className="avatar">{username?.[0]?.toUpperCase()}</div>
              <span className="app-header__username">{username}</span>
              <button className="btn btn--ghost btn--sm" onClick={handleLogout}>
                Sign out
              </button>
            </div>
          </header>

          <main className="app-main">
            <StudentsTable token={token} toast={toast} />
          </main>
        </div>
      )}
      <ToastContainer toasts={toasts} />
    </>
  );
}