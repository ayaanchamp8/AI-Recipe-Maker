import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { BACKGROUND_THEMES } from "@/lib/themes";

interface BackgroundContextValue {
  bgIndex: number;
  setBgIndex: (i: number) => void;
}

const BackgroundContext = createContext<BackgroundContextValue>({
  bgIndex: 0,
  setBgIndex: () => {},
});

// Internal — consumed by the useBackground hook in src/hooks/use-background.ts
export { BackgroundContext };

const ALL_BG_PROPS = [
  "background", "backgroundImage", "backgroundSize",
  "backgroundPosition", "backgroundAttachment", "backgroundColor",
];

const DEFAULT_CSS_VARS: Record<string, string> = {
  "--primary": "24 95% 53%",
  "--foreground": "20 20% 15%",
  "--ring": "24 95% 53%",
};

function applyTheme(index: number) {
  const theme = BACKGROUND_THEMES[index];
  ALL_BG_PROPS.forEach((k) => {
    (document.body.style as unknown as Record<string, string>)[k] = "";
  });
  Object.entries(theme.bodyStyle).forEach(([k, v]) => {
    (document.body.style as unknown as Record<string, string>)[k] = v as string;
  });
  const root = document.documentElement;
  Object.entries(theme.cssVars).forEach(([prop, val]) => {
    root.style.setProperty(prop, val);
  });
}

function resetTheme() {
  ALL_BG_PROPS.forEach((k) => {
    (document.body.style as unknown as Record<string, string>)[k] = "";
  });
  const root = document.documentElement;
  Object.entries(DEFAULT_CSS_VARS).forEach(([prop, val]) => {
    root.style.setProperty(prop, val);
  });
}

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [bgIndex, setBgIndexState] = useState(() => {
    const saved = localStorage.getItem("bg-theme-index");
    return saved ? Math.min(parseInt(saved, 10), BACKGROUND_THEMES.length - 1) : 0;
  });

  const setBgIndex = (i: number) => {
    setBgIndexState(i);
    localStorage.setItem("bg-theme-index", String(i));
  };

  useEffect(() => {
    applyTheme(bgIndex);
    return () => { resetTheme(); };
  }, [bgIndex]);

  return (
    <BackgroundContext.Provider value={{ bgIndex, setBgIndex }}>
      {children}
    </BackgroundContext.Provider>
  );
}
