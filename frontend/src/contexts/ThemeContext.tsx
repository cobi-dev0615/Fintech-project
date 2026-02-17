import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Theme = "dark" | "light";
export type ColorTheme = "blue" | "green" | "purple" | "amber";

export const COLOR_THEMES = [
  { value: "blue" as const, label: "Blue", swatch: "#3b82f6" },
  { value: "green" as const, label: "Green", swatch: "#22c55e" },
  { value: "purple" as const, label: "Purple", swatch: "#a855f7" },
  { value: "amber" as const, label: "Amber", swatch: "#eab308" },
];

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colorTheme: ColorTheme;
  setColorTheme: (color: ColorTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme");
    return (stored === "light" || stored === "dark") ? stored : "dark";
  });

  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    const stored = localStorage.getItem("colorTheme");
    if (stored === "blue" || stored === "green" || stored === "purple" || stored === "amber") {
      return stored;
    }
    return "blue";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
      root.style.colorScheme = "light";
    } else {
      root.classList.remove("light");
      root.style.colorScheme = "dark";
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (colorTheme === "blue") {
      root.removeAttribute("data-color");
    } else {
      root.setAttribute("data-color", colorTheme);
    }
    localStorage.setItem("colorTheme", colorTheme);
  }, [colorTheme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colorTheme, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
