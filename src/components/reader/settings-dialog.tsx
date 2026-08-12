import { useEffect } from "react";
import { useFontSize, type FontSize } from "@/hooks/useFontSize";

const SIZES: { value: FontSize; label: string; preview: string }[] = [
  { value: "small", label: "small", preview: "1rem" },
  { value: "normal", label: "normal", preview: "1.25rem" },
  { value: "big", label: "big", preview: "1.6rem" },
];

/**
 * A small popup for reading size. Deliberately not the shadcn dialog — this
 * lives inside the reader's own typographic language, and the reader has
 * exactly one setting to offer.
 */
export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { size, setSize, ready } = useFontSize();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      role="dialog"
      aria-modal="true"
      aria-label="Reading settings"
    >
      <button
        aria-label="Close settings"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-background/70 backdrop-blur-[2px]"
      />
      <div className="relative w-full max-w-xs border border-rule bg-background px-8 py-7 shadow-sm">
        <p className="label">text size</p>
        <div className="mt-6 flex items-end justify-between gap-3">
          {SIZES.map((s) => {
            const active = ready && size === s.value;
            return (
              <button
                key={s.value}
                onClick={() => setSize(s.value)}
                aria-pressed={active}
                className="flex flex-1 flex-col items-center gap-3 py-2 transition-opacity hover:opacity-100"
                style={{ opacity: active ? 1 : 0.4 }}
              >
                <span
                  aria-hidden="true"
                  className="font-light text-ink"
                  style={{ fontSize: s.preview, lineHeight: 1 }}
                >
                  Aa
                </span>
                <span className="label" style={{ color: active ? "var(--ink)" : undefined }}>
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
        <hr className="mt-6 border-0 border-t border-rule" />
        <button onClick={onClose} className="label mt-5 w-full transition-opacity hover:opacity-60">
          done
        </button>
      </div>
    </div>
  );
}
