/**
 * Auth Guard Component
 * 
 * Protects routes by requiring authentication.
 * Shows login/signup UI when user is not authenticated.
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Login } from './Login';
import { SignUp } from './SignUp';
import { DocumentItemSkeleton } from './Skeleton';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);

  // Show loading skeleton while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-luxury-cream-50 dark:bg-luxury-black flex items-center justify-center">
        <div className="w-full max-w-md mx-auto">
          <div className="h-8 w-32 bg-luxury-platinum-200 dark:bg-luxury-platinum-800 rounded-lg mb-8 mx-auto relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent" />
          </div>
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <DocumentItemSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show auth UI if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-luxury-cream-50 dark:bg-luxury-black flex items-center justify-center p-4">
        {isSignUp ? (
          <SignUp
            key="signup"
            onSwitchToLogin={() => setIsSignUp(false)}
            onSuccess={() => setIsSignUp(false)}
          />
        ) : (
          <Login
            key="login"
            onSwitchToSignUp={() => setIsSignUp(true)}
            onSuccess={() => {}}
          />
        )}
      </div>
    );
  }

  // User is authenticated, render protected content
  return <>{children}</>;
}

