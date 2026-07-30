import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Theme = "dark" | "light" | "emerald" | "bevel";

export const THEME_CONFIG: Record<Theme, { label: string; icon: string; description: string }> = {
  bevel: {
    label: "Daylight",
    icon: "🌤️",
    description: "Blanc chaud, cartes flottantes, accents pastel (mint / ambre / périwinkle)",
  },
  dark: {
    label: "Sombre",
    icon: "🌙",
    description: "Fond noir, reposant pour les yeux",
  },
  light: {
    label: "Clair",
    icon: "☀️",
    description: "Fond clair, professionnel",
  },
  emerald: {
    label: "Athletic",
    icon: "⚡",
    description: "Style éditorial athlétique : noir profond, Volt & orange signature",
  },

};

export const THEME_ORDER: Theme[] = ["bevel", "dark", "light", "emerald"];

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  themeConfig: typeof THEME_CONFIG;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/** Bump this when a new default theme must be re-applied to existing users. */
const THEME_DEFAULT_VERSION = "bevel-v2";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      // One-time migration: force the new default theme once per version bump
      if (localStorage.getItem("theme_default_version") !== THEME_DEFAULT_VERSION) {
        localStorage.setItem("theme_default_version", THEME_DEFAULT_VERSION);
        localStorage.setItem("theme", "bevel");
        return "bevel";
      }
      const stored = localStorage.getItem("theme") as Theme;
      if (stored && THEME_ORDER.includes(stored)) return stored;
    }
    return "bevel";
  });



  useEffect(() => {
    const root = document.documentElement;
    THEME_ORDER.forEach((t) => root.classList.remove(t));
    if (theme === "emerald") {
      root.classList.add("dark", "emerald");
    } else {
      root.classList.add(theme);
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => setThemeState(newTheme);

  const toggleTheme = () => {
    const idx = THEME_ORDER.indexOf(theme);
    const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    setThemeState(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, themeConfig: THEME_CONFIG }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
