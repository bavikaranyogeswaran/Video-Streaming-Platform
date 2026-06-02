import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Loader2, LogIn } from 'lucide-react';
import { AuthShell } from '../components/AuthShell.tsx';
import { authService } from '../services/authService.ts';
import { useAuthStore } from '../store/authStore.ts';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If LoginPage was reached because a guard kicked the user off a private
  // page, send them back there on success rather than to "/".
  const redirectTo =
    (location.state as { from?: string } | null)?.from || '/';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      const { access_token, username: u } = await authService.login(
        username.trim(),
        password,
      );
      setAuth({ username: u }, access_token);
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Invalid username or password. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <header className="mb-8">
        <span className="label-eyebrow">Welcome back</span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-display font-bold tracking-tight">
          Sign in to StreamFlix
        </h1>
        <p className="mt-2 text-muted">
          Pick up where you left off across every edge node.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Field
          label="Username"
          id="username"
          autoComplete="username"
          value={username}
          disabled={loading}
          onChange={setUsername}
          placeholder="your-handle"
        />

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
            autoComplete="current-password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={loading}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !username.trim() || !password}
          className="btn-primary w-full py-3 text-sm font-semibold"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              Sign in
            </>
          )}
        </button>
      </form>

      <p className="mt-8 text-sm text-muted text-center">
        New to StreamFlix?{' '}
        <Link
          to="/register"
          className="font-semibold text-white hover:text-primary transition-colors"
        >
          Create an account →
        </Link>
      </p>
    </AuthShell>
  );
};

const Field: React.FC<{
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
}> = ({ label, id, value, onChange, placeholder, autoComplete, disabled }) => (
  <div className="space-y-2">
    <label htmlFor={id} className="label-eyebrow text-white/55">
      {label}
    </label>
    <input
      id={id}
      className="input-field"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      disabled={disabled}
      required
    />
  </div>
);

export default LoginPage;
