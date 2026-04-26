import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem('theme');
      return (stored === 'light' || stored === 'dark') ? stored : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    // Add smooth transition class for the color switch
    root.classList.add('theme-transitioning');

    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    const timer = setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 400);

    try {
      localStorage.setItem('theme', theme);
    } catch {
      // Ignore localStorage errors
    }

    return () => clearTimeout(timer);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);
  const value = useMemo<ThemeContextType>(
    () => ({ theme, toggleTheme, isDark: theme === 'dark' }),
    [theme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
