// ============================================================
// THEME CONTEXT — Senior Enterprise Dark / Light / System Mode
// ============================================================
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const THEME_STORAGE_KEY = 'kbt_theme';

export const THEME_OPTIONS = [
  { id: 'light', label: 'Yorug‘', icon: 'sun', desc: 'Klassik yorug‘ rejim' },
  { id: 'dark', label: 'Qorong‘i', icon: 'moon', desc: 'Ko‘zga qulay tungi rejim' },
  { id: 'system', label: 'Tizim', icon: 'themeAuto', desc: 'Qurilma sozlamasiga moslashadi' },
];

const ThemeContext = createContext(null);

function getSystemPreference() {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialTheme() {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
      return saved;
    }
  } catch (err) {
    console.warn('[ThemeContext] localStorage unavailable:', err);
  }
  return 'system';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);
  const [systemTheme, setSystemTheme] = useState(getSystemPreference);

  // Resolved theme: actual light or dark applied to DOM
  const resolvedTheme = useMemo(() => {
    return theme === 'system' ? systemTheme : theme;
  }, [theme, systemTheme]);

  const isDark = resolvedTheme === 'dark';

  // Apply to DOM (html class, colorScheme style, meta theme-color)
  const applyThemeToDom = useCallback((dark) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    if (dark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    // Update mobile browser status bar color
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.setAttribute('name', 'theme-color');
      document.head.appendChild(metaTheme);
    }
    metaTheme.setAttribute('content', dark ? '#0b1120' : '#ffffff');
  }, []);

  // Update theme preference
  const setTheme = useCallback((newTheme) => {
    if (!['light', 'dark', 'system'].includes(newTheme)) return;
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (err) {
      console.warn('[ThemeContext] Failed to save theme:', err);
    }
  }, []);

  // Quick toggle between light and dark (if on system, flips to opposite of current)
  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  // Synchronize DOM on resolvedTheme change
  useEffect(() => {
    applyThemeToDom(isDark);
  }, [isDark, applyThemeToDom]);

  // Live listener for OS system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemChange = (e) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    // Modern API with backward compatibility
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleSystemChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleSystemChange);
      }
    };
  }, []);

  // Cross-tab synchronization
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorageChange = (e) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue) {
        if (['light', 'dark', 'system'].includes(e.newValue)) {
          setThemeState(e.newValue);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const value = useMemo(() => ({
    theme,
    resolvedTheme,
    isDark,
    setTheme,
    toggleTheme,
    themes: THEME_OPTIONS,
  }), [theme, resolvedTheme, isDark, setTheme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
