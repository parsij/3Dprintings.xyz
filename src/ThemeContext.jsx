/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const THEME_STORAGE_KEY = "theme-preference";
const DARK_THEME_QUERY = "(prefers-color-scheme: dark)";
const THEMES = new Set(["light", "dark"]);

const ThemeContext = createContext(undefined);

function getSystemTheme() {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "light";
  }

  return window.matchMedia(DARK_THEME_QUERY).matches ? "dark" : "light";
}

function getStoredTheme() {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return THEMES.has(storedTheme) ? storedTheme : null;
  } catch {
    return null;
  }
}

function getInitialTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  return getStoredTheme() || getSystemTheme();
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

function storeTheme(theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The setting still works for this session when localStorage is unavailable.
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (getStoredTheme() || !window.matchMedia) {
      return undefined;
    }

    const mediaQuery = window.matchMedia(DARK_THEME_QUERY);
    const handleSystemThemeChange = (event) => {
      setTheme(event.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  const value = useMemo(() => {
    const setStoredTheme = (nextTheme) => {
      if (!THEMES.has(nextTheme)) {
        return;
      }

      storeTheme(nextTheme);
      setTheme(nextTheme);
    };

    const toggleTheme = () => {
      setTheme((currentTheme) => {
        const nextTheme = currentTheme === "dark" ? "light" : "dark";
        storeTheme(nextTheme);
        return nextTheme;
      });
    };

    return {
      isDarkMode: theme === "dark",
      setTheme: setStoredTheme,
      theme,
      toggleTheme,
    };
  }, [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
