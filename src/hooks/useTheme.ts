import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";
const KEY = "reader-theme";

const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

const resolve = (theme: Theme): "light" | "dark" =>
  theme === "system" ? (prefersDark() ? "dark" : "light") : theme;

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("system");
  // Server renders light; the inline guard in __root.tsx paints the real value
  // before hydration, and the effect below syncs this state to match.
  const [resolved, setResolved] = useState<"light" | "dark">("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      setTheme(stored);
    }
    setReady(true);
  }, []);

  // Stamp <html> and follow the OS while on "system".
  useEffect(() => {
    const sync = () => {
      const next = resolve(theme);
      setResolved(next);
      document.documentElement.classList.toggle("dark", next === "dark");
    };
    sync();
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [theme]);

  const update = useCallback((next: Theme) => {
    setTheme(next);
    window.localStorage.setItem(KEY, next);
  }, []);

  const toggle = useCallback(
    () => update(resolved === "dark" ? "light" : "dark"),
    [resolved, update],
  );

  return { theme, resolved, setTheme: update, toggle, ready };
}
