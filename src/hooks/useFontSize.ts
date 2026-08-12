import { useCallback, useEffect, useState } from "react";

export type FontSize = "small" | "normal" | "big";
const KEY = "reader-font";

const isSize = (v: unknown): v is FontSize => v === "small" || v === "normal" || v === "big";

/**
 * Reading size, stamped on <html> as data-font so the prose scale is one CSS
 * variable (see styles.css) rather than a prop threaded through every block.
 * The offscreen pagination probe lives under the same root, so a change here
 * repaginates flip mode by itself.
 *
 * Must stay in sync with the inline guard in src/routes/__root.tsx.
 */
export function useFontSize() {
  const [size, setSize] = useState<FontSize>("normal");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY);
    if (isSize(stored)) setSize(stored);
    setReady(true);
  }, []);

  // Only after the stored value is in hand: the inline guard in __root.tsx has
  // already stamped the right size, and re-stamping the default first would
  // flash the prose back to normal on every load.
  useEffect(() => {
    if (ready) document.documentElement.setAttribute("data-font", size);
  }, [size, ready]);

  const update = useCallback((next: FontSize) => {
    setSize(next);
    window.localStorage.setItem(KEY, next);
  }, []);

  return { size, setSize: update, ready };
}
