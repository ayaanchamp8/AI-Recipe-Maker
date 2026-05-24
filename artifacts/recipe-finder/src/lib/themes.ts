import type { CSSProperties } from "react";

export interface BackgroundTheme {
  name: string;
  emoji: string;
  heroStyle: CSSProperties;
  bodyStyle: CSSProperties;
  swatchGradient: string;
  cssVars: Record<string, string>;
}

const darkOverlay = "linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.40))";
const overlay = "linear-gradient(rgba(255,255,255,0.58), rgba(255,255,255,0.52))";

const photo = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;

function photoTheme(
  name: string,
  emoji: string,
  photoId: string,
  bodyBg: string,
  primaryHsl: string,
  foregroundHsl: string
): BackgroundTheme {
  return {
    name,
    emoji,
    heroStyle: {
      backgroundImage: `${overlay}, url('${photo(photoId)}')`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    },
    bodyStyle: { background: bodyBg },
    swatchGradient: `url('${photo(photoId)}')`,
    cssVars: {
      "--primary": primaryHsl,
      "--foreground": foregroundHsl,
      "--ring": primaryHsl,
    },
  };
}

function colorTheme(
  name: string,
  emoji: string,
  heroGradient: string,
  bodyGradient: string,
  swatchColor: string,
  primaryHsl: string,
  foregroundHsl: string
): BackgroundTheme {
  return {
    name,
    emoji,
    heroStyle: { background: heroGradient },
    bodyStyle: { background: bodyGradient, backgroundAttachment: "fixed" },
    swatchGradient: swatchColor,
    cssVars: {
      "--primary": primaryHsl,
      "--foreground": foregroundHsl,
      "--ring": primaryHsl,
    },
  };
}

export const BACKGROUND_THEMES: BackgroundTheme[] = [
  {
    ...photoTheme("Food Spread", "🍽️", "1504674900247-0877df9cc836", "hsl(30, 40%, 96%)", "24 95% 53%", "20 20% 15%"),
    heroStyle: {
      backgroundImage: `${darkOverlay}, url('${photo("1504674900247-0877df9cc836")}')`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    },
  },
  {
    ...photoTheme("Fresh Salad", "🥗", "1546069901-ba9599a7e63c", "hsl(110, 30%, 96%)", "142 55% 38%", "130 20% 15%"),
    heroStyle: {
      backgroundImage: `${darkOverlay}, url('${photo("1546069901-ba9599a7e63c")}')`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    },
  },
  {
    ...photoTheme("Spice Market", "🌶️", "1506368249639-73a05d6f6488", "hsl(10, 35%, 96%)", "12 80% 45%", "10 25% 15%"),
    heroStyle: {
      backgroundImage: `${darkOverlay}, url('${photo("1506368249639-73a05d6f6488")}')`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    },
  },
  {
    ...photoTheme("Pizza Night", "🍕", "1565299624946-b28f40a0ae38", "hsl(25, 40%, 96%)", "25 90% 48%", "20 20% 15%"),
    heroStyle: {
      backgroundImage: `${darkOverlay}, url('${photo("1565299624946-b28f40a0ae38")}')`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    },
  },
  {
    ...photoTheme("Sushi Bar", "🍣", "1553361371-9b22f78e8b1d", "hsl(200, 30%, 96%)", "198 65% 40%", "200 20% 15%"),
    heroStyle: {
      backgroundImage: `${darkOverlay}, url('${photo("1553361371-9b22f78e8b1d")}')`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    },
  },
  {
    ...photoTheme("Pasta & Herbs", "🍝", "1473093295043-cdd812d0e601", "hsl(35, 35%, 96%)", "32 90% 44%", "25 20% 15%"),
    heroStyle: {
      backgroundImage: `${darkOverlay}, url('${photo("1473093295043-cdd812d0e601")}')`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    },
  },
  colorTheme(
    "Warm Peach", "🍑",
    "linear-gradient(135deg, hsl(34,90%,92%) 0%, hsl(25,95%,88%) 30%, hsl(15,85%,85%) 60%, hsl(30,80%,90%) 100%)",
    "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(251,146,60,0.18) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 90%, rgba(234,88,12,0.10) 0%, transparent 50%), hsl(34,60%,96%)",
    "linear-gradient(135deg, hsl(34,90%,82%), hsl(15,85%,75%))",
    "24 95% 53%", "20 20% 15%"
  ),
  colorTheme(
    "Fresh Mint", "🌱",
    "linear-gradient(135deg, hsl(150,50%,90%) 0%, hsl(120,45%,86%) 30%, hsl(90,55%,84%) 60%, hsl(140,45%,89%) 100%)",
    "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(134,239,172,0.20) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 90%, rgba(74,222,128,0.12) 0%, transparent 50%), hsl(140,45%,96%)",
    "linear-gradient(135deg, hsl(150,50%,80%), hsl(90,55%,74%))",
    "142 55% 38%", "130 20% 15%"
  ),
  colorTheme(
    "Sky Blue", "💙",
    "linear-gradient(135deg, hsl(205,65%,92%) 0%, hsl(215,70%,88%) 30%, hsl(195,60%,86%) 60%, hsl(210,55%,91%) 100%)",
    "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(56,189,248,0.16) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 90%, rgba(14,165,233,0.10) 0%, transparent 50%), hsl(210,55%,97%)",
    "linear-gradient(135deg, hsl(205,65%,82%), hsl(215,70%,76%))",
    "199 89% 40%", "210 20% 15%"
  ),
];
