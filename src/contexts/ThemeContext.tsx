import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Theme = "light" | "dark" | "modern" | "classic";

export const THEME_CONFIG: Record<Theme, { label: string; icon: string; description: string }> = {
  light: {
    label: "Clair",
    icon: "☀️",
    description: "Fond blanc, lecture optimale",
  },
  dark: {
    label: "Sombre",
    icon: "🌙",
    description: "Fond noir, reposant pour les yeux",
  },
  modern: {
    label: "Moderne",
    icon: "✨",
    description: "Violet néon, style premium",
  },
  classic: {
    label: "Classique",
    icon: "🏛️",
    description: "Bleu marine et or, professionnel",
  },
};

export const THEME_ORDER: Theme[] = ["light", "dark", "modern", "classic"];

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
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    // Remove all theme classes
    THEME_ORDER.forEach((t) => root.classList.remove(t));
    // Add current theme class
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => setThemeState(newTheme);
  
  const toggleTheme = () => {
    const currentIndex = THEME_ORDER.indexOf(theme);
    const nextIndex = (currentIndex + 1) % THEME_ORDER.length;
    setThemeState(THEME_ORDER[nextIndex]);
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
