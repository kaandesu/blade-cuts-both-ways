import { useCallback, useEffect, useState } from "react";

const KEY = "reader-progress";

export type ProgressMap = Record<string, number>; // chapter id -> 0..100

function read(): ProgressMap {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as ProgressMap) : {};
  } catch {
    return {};
  }
}

const listeners = new Set<(m: ProgressMap) => void>();

function write(map: ProgressMap) {
  window.localStorage.setItem(KEY, JSON.stringify(map));
  listeners.forEach((l) => l(map));
}

/** Read-only view of all chapter progress (hydration-safe). */
export function useAllProgress() {
  const [map, setMap] = useState<ProgressMap>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setMap(read());
    setReady(true);
    const l = (m: ProgressMap) => setMap(m);
    listeners.add(l);
    const onStorage = () => setMap(read());
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return { map, ready };
}

/** Progress for one chapter, with a monotonic setter (furthest point read). */
export function useChapterProgress(id: string) {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    setPercent(read()[id] ?? 0);
  }, [id]);

  const report = useCallback(
    (value: number) => {
      const clamped = Math.max(0, Math.min(100, Math.round(value)));
      setPercent((prev) => {
        if (clamped <= prev) return prev;
        const map = read();
        map[id] = clamped;
        write(map);
        return clamped;
      });
    },
    [id],
  );

  return { percent, report };
}

export function resetProgress() {
  write({});
}
