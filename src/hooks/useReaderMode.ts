import { useCallback, useEffect, useState } from "react";

export type ReaderMode = "scroll" | "flip";
const KEY = "reader-mode";

export function useReaderMode() {
  const [mode, setMode] = useState<ReaderMode>("scroll");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY);
    if (stored === "scroll" || stored === "flip") setMode(stored);
    setReady(true);
  }, []);

  const update = useCallback((next: ReaderMode) => {
    setMode(next);
    window.localStorage.setItem(KEY, next);
  }, []);

  return { mode, setMode: update, ready };
}