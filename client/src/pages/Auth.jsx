import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorNote } from '../components/ui.jsx';

// Public demo accounts seeded by the server, so recruiters can try the app without signing up.
const DEMO_ACCOUNTS = [
  { label: 'Demo customer', email: 'demo@gymfuel.dev', password: 'demo12345' },
  { label: 'Demo admin (read-only)', email: 'demo.admin@gymfuel.dev', password: 'demoadmin123' },
];

function useAfterAuth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Only allow same-site relative redirects.
  const next = params.get('next');
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
  return (user) => navigate(safeNext || (user.role === 'admin' ? '/admin' : '/'), { replace: true });
}

export function Login() {
  const { login } = useAuth();
  const afterAuth = useAfterAuth();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(email, password) {
    setError(null);
    setSubmitting(true);
    try {
      afterAuth(await login(email, password));
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h1>Welcome back</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(form.email, form.password);
          }}
        >
          <label className="field">
            <span className="label">Email</span>
            <input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="field">
            <span className="label">Password</span>
            <input type="password" required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          <ErrorNote error={error} />
          <button className="btn btn-primary btn-block" disabled={submitting}>{submitting ? 'Logging in…' : 'Log in'}</button>
        </form>

        <div className="demo-box">
          <span className="label">Just looking around? Try a demo account</span>
          <div className="demo-buttons">
            {DEMO_ACCOUNTS.map((a) => (
              <button key={a.email} className="btn btn-ghost btn-sm" disabled={submitting} onClick={() => submit(a.email, a.password)}>
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <p className="muted small">
          New here? <Link to={`/register${params.toString() ? `?${params}` : ''}`} className="accent">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

export function Register() {
  const { register } = useAuth();
  const afterAuth = useAfterAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      afterAuth(await register(form.name, form.email, form.password));
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={onSubmit}>
        <h1>Create your account</h1>
        <label className="field">
          <span className="label">Name</span>
          <input required minLength={2} autoComplete="name" value={form.name} onChange={set('name')} />
        </label>
        <label className="field">
          <span className="label">Email</span>
          <input type="email" required autoComplete="email" value={form.email} onChange={set('email')} />
        </label>
        <label className="field">
          <span className="label">Password</span>
          <input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set('password')} />
          <span className="muted small">At least 8 characters</span>
        </label>
        <ErrorNote error={error} />
        <button className="btn btn-primary btn-block" disabled={submitting}>{submitting ? 'Creating account…' : 'Sign up'}</button>
        <p className="muted small">
          Already have an account? <Link to="/login" className="accent">Log in</Link>
        </p>
      </form>
    </div>
  );
}
