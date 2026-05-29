
import './App.css';
import { useState, useCallback } from 'react';
import { apiFetch } from './studentApi';
import StudentsTable from './components/StudentsTable';
import Chatbot from './components/Chatbot';

const API_BASE = 'http://127.0.0.1:8945';

function useToast() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3600);
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

function AuthScreen({ onLogin, toast }) {
  const [mode,     setMode]     = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy,     setBusy]     = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'login') {
        const res  = await fetch(`${API_BASE}/auth/login`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ username, password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.detail || 'Login failed');
        onLogin(data.access_token, username);
        toast(`Welcome back, ${username}!`);
      } else {
        await apiFetch('/auth/register', {
          method: 'POST',
          body:   JSON.stringify({ username, password }),
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
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label">Username</label>
            <input className="field__input" type="text" required autoComplete="username"
              placeholder="admin" value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label">Password</label>
            <input className="field__input" type="password" required autoComplete="current-password"
              placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn btn--primary btn--full" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <p className="auth-card__switch">
          {mode === 'login' ? "Don't have an account? " : 'Already have one? '}
          <button className="link-btn" onClick={() => setMode(m => m === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Register' : 'Sign in'}
          </button>
        </p>
        <p className="auth-card__hint">Default: admin / admin123</p>
      </div>
    </div>
  );
}

export default function App() {
  const [token,    setToken]    = useState(() => sessionStorage.getItem('sr_token') || null);
  const [username, setUsername] = useState(() => sessionStorage.getItem('sr_user')  || null);
  const { toasts, push: toast } = useToast();

  function handleLogin(tok, user) {
    sessionStorage.setItem('sr_token', tok);
    sessionStorage.setItem('sr_user', user);
    setToken(tok); setUsername(user);
  }

  function handleLogout() {
    sessionStorage.removeItem('sr_token');
    sessionStorage.removeItem('sr_user');
    setToken(null); setUsername(null);
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
              <button className="btn btn--ghost btn--sm" onClick={handleLogout}>Sign out</button>
            </div>
          </header>
          <main className="app-main">
            <StudentsTable token={token} toast={toast} />
          </main>
          <Chatbot token={token} />
        </div>
      )}
      <ToastContainer toasts={toasts} />
    </>
  );
}
