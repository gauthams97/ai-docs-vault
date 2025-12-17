/**
 * Login Component
 * 
 * Premium login form with email/password authentication.
 * Matches the luxury UI aesthetic of the application.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthError } from '@supabase/supabase-js';

interface LoginProps {
  onSwitchToSignUp: () => void;
  onSuccess?: () => void;
}

export function Login({ onSwitchToSignUp, onSuccess }: LoginProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear all fields when component mounts
  useEffect(() => {
    setEmail('');
    setPassword('');
    setError(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        setError(getErrorMessage(error));
      } else {
        onSuccess?.();
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (error: AuthError): string => {
    if (error.message.includes('Invalid login credentials')) {
      return 'Invalid email or password. Please try again.';
    }
    if (error.message.includes('Email not confirmed')) {
      return 'Please check your email to confirm your account.';
    }
    return error.message || 'Failed to sign in. Please try again.';
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      <div className="glass border border-luxury-platinum-200/60 dark:border-luxury-platinum-700/60 rounded-2xl p-8 shadow-luxury-lg">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-luxury-charcoal dark:text-luxury-platinum-50 mb-2 gradient-text">
            Welcome Back
          </h2>
          <p className="text-sm text-luxury-platinum-600 dark:text-luxury-platinum-400 font-light">
            Sign in to access your documents
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 bg-red-50/80 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/60 rounded-xl text-red-900 dark:text-red-200 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-luxury-platinum-700 dark:text-luxury-platinum-300 mb-2 uppercase tracking-wider">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full px-4 py-3 border border-luxury-platinum-300 dark:border-luxury-platinum-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-luxury-gold-400 dark:focus:ring-luxury-gold-500 focus:border-luxury-gold-400 dark:focus:border-luxury-gold-600 transition-all duration-500 bg-white/80 dark:bg-luxury-charcoal/80 text-luxury-charcoal dark:text-luxury-platinum-50 placeholder:text-luxury-platinum-400 dark:placeholder:text-luxury-platinum-500 disabled:opacity-50"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-luxury-platinum-700 dark:text-luxury-platinum-300 mb-2 uppercase tracking-wider">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full px-4 py-3 border border-luxury-platinum-300 dark:border-luxury-platinum-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-luxury-gold-400 dark:focus:ring-luxury-gold-500 focus:border-luxury-gold-400 dark:focus:border-luxury-gold-600 transition-all duration-500 bg-white/80 dark:bg-luxury-charcoal/80 text-luxury-charcoal dark:text-luxury-platinum-50 placeholder:text-luxury-platinum-400 dark:placeholder:text-luxury-platinum-500 disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-amber-600 to-amber-500 dark:from-amber-500 dark:to-amber-400 rounded-xl hover:from-amber-700 hover:to-amber-600 dark:hover:from-amber-600 dark:hover:to-amber-500 transition-all duration-300 shadow-luxury hover:shadow-luxury-lg hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="text-sm text-luxury-platinum-600 dark:text-luxury-platinum-400 hover:text-luxury-gold-600 dark:hover:text-luxury-gold-400 transition-colors duration-300"
          >
            Don't have an account? <span className="font-semibold">Sign up</span>
          </button>
        </div>
      </div>
    </div>
  );
}

