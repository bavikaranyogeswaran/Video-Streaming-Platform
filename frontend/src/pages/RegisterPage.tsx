import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  UserPlus,
  Check,
  X,
} from 'lucide-react';
import { AuthShell } from '../components/AuthShell.tsx';
import { authService } from '../services/authService.ts';
import { cn } from '../lib/utils.ts';

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,24}$/;

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Live, client-side validation rules — mirror backend constraints.
  const rules = useMemo(
    () => ({
      usernameOk: USERNAME_RE.test(username),
      emailOk: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      passwordLong: password.length >= 8,
      passwordMix: /[A-Z]/.test(password) && /[a-z0-9]/.test(password),
      matches: password.length > 0 && password === confirm,
    }),
    [username, email, password, confirm],
  );
  const allValid = Object.values(rules).every(Boolean);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid) return;
    setLoading(true);
    setError(null);
    try {
      const { message } = await authService.register(
        username.trim(),
        email.trim(),
        password,
      );
      setSuccessMsg(message);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(
        Array.isArray(msg)
          ? msg.join(', ')
          : msg || 'Could not create the account. Try a different username.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <header className="mb-8">
        <span className="label-eyebrow">Create your account</span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-display font-bold tracking-tight">
          Join StreamFlix
        </h1>
        <p className="mt-2 text-muted">
          Free forever. Upload as much as you want — replicas are on us.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {successMsg ? (
          <div className="rounded-xl border border-ok/30 bg-ok/10 p-4 text-center">
            <h3 className="text-lg font-medium text-ok mb-2">Registration Successful</h3>
            <p className="text-sm text-ok/80">{successMsg}</p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="mt-4 btn-primary w-full py-2"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label
                htmlFor="username"
                className="label-eyebrow text-white/55"
              >
                Username
              </label>
              <input
                id="username"
                className="input-field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your-handle"
                autoComplete="username"
                disabled={loading}
                required
                aria-invalid={username.length > 0 && !rules.usernameOk}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="label-eyebrow text-white/55"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
                required
                aria-invalid={email.length > 0 && !rules.emailOk}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="label-eyebrow text-white/55"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="text-xs font-medium text-muted hover:text-white inline-flex items-center gap-1"
                  tabIndex={-1}
                >
                  {showPw ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" /> Hide
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" /> Show
                    </>
                  )}
                </button>
              </div>
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirm"
                className="label-eyebrow text-white/55"
              >
                Confirm password
              </label>
              <input
                id="confirm"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                className="input-field"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-type to confirm"
                required
                disabled={loading}
              />
            </div>

            {/* Live requirements — gives feedback before submit */}
            <ul className="space-y-1.5">
              <Rule
                ok={rules.usernameOk}
                text="Username: 3–24 letters, numbers, dash or underscore"
              />
              <Rule ok={rules.emailOk} text="Valid email address" />
              <Rule ok={rules.passwordLong} text="Password ≥ 8 characters" />
              <Rule
                ok={rules.passwordMix}
                text="Mix at least one uppercase letter and a number or lowercase"
              />
              <Rule ok={rules.matches} text="Confirmation matches" />
            </ul>

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !allValid}
              className="btn-primary w-full py-3 text-sm font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create account
                </>
              )}
            </button>
          </>
        )}
      </form>

      <p className="mt-8 text-sm text-muted text-center">
        Already on StreamFlix?{' '}
        <Link
          to="/login"
          className="font-semibold text-white hover:text-primary transition-colors"
        >
          Sign in →
        </Link>
      </p>
    </AuthShell>
  );
};

const Rule: React.FC<{ ok: boolean; text: string }> = ({ ok, text }) => (
  <li
    className={cn(
      'flex items-center gap-2 text-xs transition-colors',
      ok ? 'text-ok' : 'text-muted',
    )}
  >
    <span
      className={cn(
        'inline-flex h-4 w-4 items-center justify-center rounded-full transition-colors',
        ok ? 'bg-ok/15' : 'bg-white/5',
      )}
    >
      {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
    </span>
    {text}
  </li>
);

export default RegisterPage;
