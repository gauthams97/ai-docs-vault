import { useAuth } from '@/contexts/AuthContext';
import { useState, useRef, useEffect } from 'react';

export function UserMenu() {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsSigningOut(false);
      setIsOpen(false);
    }
  };

  if (!user) return null;

  const userInitial = user.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSigningOut}
        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-luxury-platinum-100 dark:hover:bg-luxury-platinum-800 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-luxury-gold-400 dark:focus-visible:ring-luxury-gold-500 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="User menu"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-600 to-amber-500 dark:from-amber-500 dark:to-amber-400 flex items-center justify-center text-white text-sm font-semibold shadow-sm">
          {userInitial}
        </div>
        <span className="text-sm text-luxury-platinum-700 dark:text-luxury-platinum-300 font-medium hidden sm:block max-w-[150px] truncate">
          {user.email}
        </span>
        <svg
          className={`w-4 h-4 text-luxury-platinum-500 dark:text-luxury-platinum-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 glass border border-luxury-platinum-200/60 dark:border-luxury-platinum-700/60 rounded-xl shadow-luxury-lg py-2 animate-fade-in-down z-50 backdrop-blur-xl bg-white/95 dark:bg-neutral-900/95">
          <div className="px-4 py-3 border-b border-luxury-platinum-200/60 dark:border-luxury-platinum-700/60">
            <p className="text-xs font-semibold text-luxury-platinum-500 dark:text-luxury-platinum-400 uppercase tracking-wider mb-1">
              Signed in as
            </p>
            <p className="text-sm text-luxury-charcoal dark:text-luxury-platinum-50 truncate font-medium">
              {user.email}
            </p>
          </div>
          <div className="px-2 py-1">
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all duration-200 flex items-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              {isSigningOut ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Signing out...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  <span>Sign Out</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

