import { useEffect, useRef, useState } from "react";
import { joinWaitlist } from "@/lib/pb";

/**
 * The waitlist signup. Hand-rolled rather than pulled from ui/dialog.tsx: the
 * reader has its own paper-and-ink palette and the shadcn components are on a
 * slate one, so a stock dialog reads as a different site.
 */
export function NotifyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "invalid" | "error">("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab") return;
      // Keep focus inside the dialog while it's up.
      const items = panelRef.current?.querySelectorAll<HTMLElement>("input,button");
      if (!items?.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Start clean each time it opens.
  useEffect(() => {
    if (open) {
      setEmail("");
      setState("idle");
    }
  }, [open]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    const result = await joinWaitlist(email);
    // "already on the list" is reported as success — whether a given address is
    // subscribed isn't something a stranger should be able to probe.
    if (result === "joined" || result === "already") setState("done");
    else if (result === "invalid") setState("invalid");
    else setState("error");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      role="dialog"
      aria-modal="true"
      aria-label="Be notified of new chapters"
    >
      <button
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-background/85 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        className="relative w-full max-w-sm border border-rule bg-background px-8 py-10"
      >
        {state === "done" ? (
          <>
            <p className="text-lg font-light italic text-ink">
              You're on the list. I'll write when there's something to read.
            </p>
            <button onClick={onClose} className="label mt-8 hover:opacity-60">
              close
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <p className="label">be notified</p>
            <p className="mt-4 text-lg leading-[1.7] font-light italic text-ink">
              One email when a new chapter goes up. Nothing else.
            </p>
            <input
              ref={inputRef}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@somewhere"
              className="mt-8 w-full border-0 border-b border-rule bg-transparent pb-2 text-lg font-light text-ink outline-none focus:border-ink"
            />
            {state === "invalid" && (
              <p className="mt-3 text-sm font-light italic text-ink-soft">
                That doesn't look like an email address.
              </p>
            )}
            {state === "error" && (
              <p className="mt-3 text-sm font-light italic text-ink-soft">
                Couldn't reach the server. Try again in a moment.
              </p>
            )}
            <div className="mt-8 flex gap-6">
              <button type="submit" disabled={state === "sending"} className="label hover:opacity-60">
                {state === "sending" ? "sending…" : "notify me"}
              </button>
              <button type="button" onClick={onClose} className="label opacity-40 hover:opacity-100">
                cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
