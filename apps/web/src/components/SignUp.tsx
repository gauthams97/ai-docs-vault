/**
 * Sign Up Component
 * 
 * Premium sign up form with email/password registration.
 * Matches the luxury UI aesthetic of the application.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthError } from '@supabase/supabase-js';

interface SignUpProps {
  onSwitchToLogin: () => void;
  onSuccess?: () => void;
}

export function SignUp({ onSwitchToLogin, onSuccess }: SignUpProps) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Clear all fields when component mounts
  useEffect(() => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(email, password);
      
      if (error) {
        setError(getErrorMessage(error));
      } else {
        setSuccess(true);
        // Auto-switch to login after 2 seconds
        setTimeout(() => {
          onSuccess?.();
        }, 2000);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (error: AuthError): string => {
    if (error.message.includes('User already registered')) {
      return 'An account with this email already exists. Please sign in instead.';
    }
    if (error.message.includes('Password')) {
      return 'Password does not meet requirements. Please use a stronger password.';
    }
    return error.message || 'Failed to create account. Please try again.';
  };

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto animate-fade-in">
        <div className="glass border border-luxury-platinum-200/60 dark:border-luxury-platinum-700/60 rounded-2xl p-8 shadow-luxury-lg text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 text-emerald-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-luxury-charcoal dark:text-luxury-platinum-50 mb-2">
            Account Created!
          </h2>
          <p className="text-sm text-luxury-platinum-600 dark:text-luxury-platinum-400 mb-4">
            Please check your email to confirm your account.
          </p>
          <p className="text-xs text-luxury-platinum-500 dark:text-luxury-platinum-500">
            Redirecting to sign in...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      <div className="glass border border-luxury-platinum-200/60 dark:border-luxury-platinum-700/60 rounded-2xl p-8 shadow-luxury-lg">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-luxury-charcoal dark:text-luxury-platinum-50 mb-2 gradient-text">
            Create Account
          </h2>
          <p className="text-sm text-luxury-platinum-600 dark:text-luxury-platinum-400 font-light">
            Start organizing your documents
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 bg-red-50/80 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/60 rounded-xl text-red-900 dark:text-red-200 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="signup-email" className="block text-xs font-semibold text-luxury-platinum-700 dark:text-luxury-platinum-300 mb-2 uppercase tracking-wider">
              Email
            </label>
            <input
              id="signup-email"
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
            <label htmlFor="signup-password" className="block text-xs font-semibold text-luxury-platinum-700 dark:text-luxury-platinum-300 mb-2 uppercase tracking-wider">
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
              className="w-full px-4 py-3 border border-luxury-platinum-300 dark:border-luxury-platinum-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-luxury-gold-400 dark:focus:ring-luxury-gold-500 focus:border-luxury-gold-400 dark:focus:border-luxury-gold-600 transition-all duration-500 bg-white/80 dark:bg-luxury-charcoal/80 text-luxury-charcoal dark:text-luxury-platinum-50 placeholder:text-luxury-platinum-400 dark:placeholder:text-luxury-platinum-500 disabled:opacity-50"
              placeholder="••••••••"
            />
            <p className="mt-1 text-xs text-luxury-platinum-500 dark:text-luxury-platinum-500">
              Minimum 6 characters
            </p>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-xs font-semibold text-luxury-platinum-700 dark:text-luxury-platinum-300 mb-2 uppercase tracking-wider">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
              className="w-full px-4 py-3 border border-luxury-platinum-300 dark:border-luxury-platinum-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-luxury-gold-400 dark:focus:ring-luxury-gold-500 focus:border-luxury-gold-400 dark:focus:border-luxury-gold-600 transition-all duration-500 bg-white/80 dark:bg-luxury-charcoal/80 text-luxury-charcoal dark:text-luxury-platinum-50 placeholder:text-luxury-platinum-400 dark:placeholder:text-luxury-platinum-500 disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-amber-600 to-amber-500 dark:from-amber-500 dark:to-amber-400 rounded-xl hover:from-amber-700 hover:to-amber-600 dark:hover:from-amber-600 dark:hover:to-amber-500 transition-all duration-300 shadow-luxury hover:shadow-luxury-lg hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-sm text-luxury-platinum-600 dark:text-luxury-platinum-400 hover:text-luxury-gold-600 dark:hover:text-luxury-gold-400 transition-colors duration-300"
          >
            Already have an account? <span className="font-semibold">Sign in</span>
          </button>
        </div>
      </div>
    </div>
  );
}

