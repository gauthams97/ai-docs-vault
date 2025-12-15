import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'theme';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  
  const root = document.documentElement;
  const hasDarkClass = root.classList.contains('dark');
  
  if (hasDarkClass) {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored !== 'dark') {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    }
    return 'dark';
  }
  
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }
  
  return 'light';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      applyTheme(newTheme);
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      return newTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): [Theme, () => void] {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return [context.theme, context.toggleTheme];
}
