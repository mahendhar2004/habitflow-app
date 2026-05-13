import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, Eye, EyeOff, LogIn, UserPlus, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';

export function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const result = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password);

    if (result.error) {
      setError(result.error);
    } else if (mode === 'signup') {
      setSuccess('Check your email to confirm your account.');
    } else {
      navigate('/');
      return;
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setError(null);
    const result = await signInWithGoogle();
    if (result.error) setError(result.error);
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red/10 glow-red mb-4">
            <Activity size={32} className="text-red" />
          </div>
          <h1 className="text-2xl font-bold text-text">HabitFlow</h1>
          <p className="text-sm text-text-2 mt-1">Track everything. Sync everywhere.</p>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-6">
          <div className="flex bg-surface-2 rounded-xl p-1 mb-6">
            <button
              onClick={() => { setMode('signin'); setError(null); setSuccess(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === 'signin' ? 'bg-red text-white' : 'text-text-2'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === 'signup' ? 'bg-red text-white' : 'text-text-2'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-surface-2 border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-red/50"
              />
            </div>

            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-surface-2 border border-border rounded-xl pl-10 pr-10 py-3 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-red/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <p className="text-xs text-red bg-red/10 rounded-lg px-3 py-2">{error}</p>
            )}
            {success && (
              <p className="text-xs text-green bg-green/10 rounded-lg px-3 py-2">{success}</p>
            )}

            <Button fullWidth disabled={loading} className="gap-2">
              {loading ? (
                <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              ) : mode === 'signin' ? (
                <><LogIn size={16} /> Sign In</>
              ) : (
                <><UserPlus size={16} /> Create Account</>
              )}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-text-3">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-2 bg-surface-2 border border-border rounded-xl py-3 text-sm text-text hover:bg-surface-3 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <button
          onClick={() => window.location.href = '/'}
          className="w-full mt-4 text-sm text-text-3 hover:text-text-2 flex items-center justify-center gap-1 transition-colors"
        >
          Skip for now — use offline only <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
