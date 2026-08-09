import { useTheme } from "@/hooks/useTheme";

/**
 * Two words in the same visual language as the reader-mode switch.
 * Until the stored preference is read, both sit at rest so the toggle
 * doesn't flicker a wrong "active" state through hydration.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolved, setTheme, ready } = useTheme();

  return (
    <div className={`flex gap-4 ${className}`}>
      {(["light", "dark"] as const).map((t) => (
        <button
          key={t}
          onClick={() => setTheme(t)}
          className="label transition-opacity"
          style={{
            opacity: !ready ? 0.35 : resolved === t ? 1 : 0.35,
            color: ready && resolved === t ? "var(--ink)" : undefined,
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
