// ============================================================
// THEME CONTEXT — Light Mode (Doimiy kunduzgi rejim)
// ============================================================
import { createContext, useContext, useEffect, useMemo, useCallback } from 'react';

const THEME_STORAGE_KEY = 'kbt_theme';

export const THEME_OPTIONS = [
  { id: 'light', label: 'Yorug‘', icon: 'sun', desc: 'Klassik kunduzgi yorug‘ rejim' },
];

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Loyiha doimiy ravishda faqat kunduzgi (light) rejimda ishlaydi
  const theme = 'light';
  const resolvedTheme = 'light';
  const isDark = false;

  const applyLightMode = useCallback(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove('dark');
    root.style.colorScheme = 'light';

    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.setAttribute('name', 'theme-color');
      document.head.appendChild(metaTheme);
    }
    metaTheme.setAttribute('content', '#ffffff');

    try {
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    applyLightMode();
  }, [applyLightMode]);

  const setTheme = useCallback(() => {
    applyLightMode();
  }, [applyLightMode]);

  const toggleTheme = useCallback(() => {
    applyLightMode();
  }, [applyLightMode]);

  const value = useMemo(() => ({
    theme: 'light',
    resolvedTheme: 'light',
    isDark: false,
    setTheme,
    toggleTheme,
    themes: THEME_OPTIONS,
  }), [setTheme, toggleTheme]);

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
