import React, { createContext, useCallback, useContext, useLayoutEffect, useState } from 'react';

const ThemeContext = createContext(null);
const KEY = 'cerberus-arm-theme';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'; }
    catch { return 'light'; }
  });

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem(KEY, theme); } catch { /* storage may be disabled */ }
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme((current) => current === 'light' ? 'dark' : 'light'), []);
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used within ThemeProvider');
  return value;
}
