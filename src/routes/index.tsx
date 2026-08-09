import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAllProgress } from "@/hooks/useProgress";
import { ThemeToggle } from "@/components/reader/theme-toggle";
import { NotifyDialog } from "@/components/notify-dialog";
import { listPublished } from "@/lib/pb";
import { readingMinutes } from "@/components/reader/blocks";

export const Route = createFileRoute("/")({
  loader: async () => ({ chapters: await listPublished() }),
  head: () => ({
    meta: [
      { title: "The Salt Road — a web novel in chapters" },
      {
        name: "description",
        content:
          "An empty-world tale of swordsmen and dust, published chapter by chapter. Read by scrolling or by turning pages.",
      },
      { property: "og:title", content: "The Salt Road — a web novel in chapters" },
      {
        property: "og:description",
        content:
          "An empty-world tale of swordsmen and dust, published chapter by chapter.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { chapters } = Route.useLoaderData();
  const { map, ready } = useAllProgress();
  const [notifyOpen, setNotifyOpen] = useState(false);

  const overall = Math.round(
    chapters.reduce((sum, c) => sum + (map[c.id] ?? 0), 0) / Math.max(1, chapters.length),
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-8 py-24">
      <ThemeToggle className="fixed top-4 right-6" />
      <p className="label">a tale in chapters</p>
      <h1 className="mt-10 text-5xl font-light tracking-tight text-ink sm:text-7xl">
        The Salt Road
      </h1>
      <p className="mt-6 text-xl font-light italic text-ink-soft sm:text-2xl">
        the world ended quietly, and no one thought to mention it
      </p>

      <hr className="my-16 border-0 border-t border-rule" />

      {ready && overall > 0 && (
        <div className="mb-10 flex items-center gap-4">
          <span className="label">your progress</span>
          <div className="h-px flex-1 bg-rule">
            <div className="h-px bg-ink transition-all duration-500" style={{ width: `${overall}%` }} />
          </div>
          <span className="label tabular-nums">{overall}%</span>
        </div>
      )}

      <ul>
        {chapters.map((c) => {
          const p = map[c.id] ?? 0;
          return (
            <li key={c.id}>
              <Link
                to="/chapter/$id"
                params={{ id: c.slug }}
                className="group block border-b border-rule py-6 transition-opacity hover:opacity-60"
              >
                <div className="flex items-baseline gap-6">
                  <span className="label w-6">{c.numeral}</span>
                  <span className="flex-1 text-2xl font-light italic text-ink">{c.title}</span>
                  <span className="label tabular-nums">
                    {!ready || p === 0
                      ? `${readingMinutes(c.content)} min`
                      : p >= 100
                        ? "finished"
                        : `${p}%`}
                  </span>
                </div>
                {ready && p > 0 && (
                  <div className="mt-3 ml-12 h-px bg-rule">
                    <div className="h-px bg-ink transition-all duration-500" style={{ width: `${p}%` }} />
                  </div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-16 flex items-center gap-6">
        <p className="label">more to come</p>
        <button onClick={() => setNotifyOpen(true)} className="label hover:opacity-60">
          notify me →
        </button>
      </div>

      <NotifyDialog open={notifyOpen} onClose={() => setNotifyOpen(false)} />
    </main>
  );
}
