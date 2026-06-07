import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Theme = "dark" | "light" | "emerald";

export const THEME_CONFIG: Record<Theme, { label: string; icon: string; description: string }> = {
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
    label: "Ocean Deep",
    icon: "🌊",
    description: "Mode prestige : bleu profond + aqua, bento scientifique",
  },
};

export const THEME_ORDER: Theme[] = ["dark", "light", "emerald"];

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  themeConfig: typeof THEME_CONFIG;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme") as Theme;
      if (stored && THEME_ORDER.includes(stored)) return stored;
    }
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    THEME_ORDER.forEach((t) => root.classList.remove(t));
    root.classList.add(theme);
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
