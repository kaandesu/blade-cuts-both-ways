import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useReaderMode } from "@/hooks/useReaderMode";
import { PageBody, toBlocks } from "@/components/reader/blocks";
import { usePagination } from "@/hooks/usePagination";
import { useChapterProgress } from "@/hooks/useProgress";
import { ThemeToggle } from "@/components/reader/theme-toggle";
import { getBySlug, listPublished, recordView, type Chapter } from "@/lib/pb";

export const Route = createFileRoute("/chapter/$id")({
  loader: async ({ params }) => {
    // A draft is filtered out by the collection's view rule, so this is also
    // what makes an unpublished chapter unreachable at its slug.
    const chapter = await getBySlug(params.id);
    if (!chapter || !chapter.published) throw notFound();

    // prev/next come from the published list, so a draft never appears in the
    // navigation of the chapters either side of it.
    const all = await listPublished();
    const i = all.findIndex((c) => c.id === chapter.id);
    return { chapter, prev: all[i - 1], next: all[i + 1] };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Unavailable" }, { name: "robots", content: "noindex" }],
      };
    }
    const { chapter } = loaderData;
    const title = `${chapter.numeral}. ${chapter.title} — The Blade Cuts Both Ways`;
    const description = chapter.opening;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ChapterPage,
});

function ModeBar({
  mode,
  setMode,
}: {
  mode: "scroll" | "flip";
  setMode: (m: "scroll" | "flip") => void;
}) {
  return (
    <div className="fixed inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-4 backdrop-blur-[2px]">
      <Link to="/" className="label transition-opacity hover:opacity-60">
        index
      </Link>
      <div className="flex items-center gap-6">
        <div className="flex gap-4">
          {(["scroll", "flip"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="label transition-opacity"
              style={{
                opacity: mode === m ? 1 : 0.35,
                color: mode === m ? "var(--ink)" : undefined,
              }}
            >
              {m}
            </button>
          ))}
        </div>
        <span className="h-3 w-px bg-rule" />
        <ThemeToggle />
      </div>
    </div>
  );
}

function ChapterPage() {
  const { chapter, prev, next } = Route.useLoaderData();
  const { mode, setMode } = useReaderMode();
  const { percent, report } = useChapterProgress(chapter.id);

  // One ping per chapter per mount. The ref keeps StrictMode's double-mount in
  // development from counting the same open twice; the server is what decides
  // whether this reader is new or returning.
  const counted = useRef("");
  useEffect(() => {
    if (counted.current === chapter.slug) return;
    counted.current = chapter.slug;
    void recordView(chapter.slug);
  }, [chapter.slug]);

  return (
    <div className={mode === "flip" ? "h-screen overflow-hidden" : "min-h-screen"}>
      <ModeBar mode={mode} setMode={setMode} />
      {mode === "scroll" ? (
        <ScrollReader chapter={chapter} prev={prev} next={next} percent={percent} report={report} />
      ) : (
        <FlipReader chapter={chapter} next={next} percent={percent} report={report} />
      )}
      <PageFade />
    </div>
  );
}

/**
 * The blade, drawn across the whole chapter rather than in one set piece.
 * Same data as the old progress bar, moved into the margin where it stays out
 * of the reading. Hidden on narrow screens, which have no margin to spare.
 */
function MarginBlade({ percent, marks }: { percent: number; marks: number[] }) {
  return (
    <div className="pointer-events-none fixed top-[20vh] bottom-[20vh] left-6 hidden w-px bg-rule sm:block">
      {marks.map((m) => (
        <span
          key={m}
          className="absolute -left-1 h-px w-2 transition-colors duration-500"
          style={{
            top: `${m}%`,
            backgroundColor: percent >= m ? "var(--ink)" : "var(--rule)",
          }}
        />
      ))}
      <div
        className="relative w-px bg-ink transition-all duration-300"
        style={{ height: `${percent}%` }}
      >
        <span
          className="absolute bottom-0 -left-[3.5px] h-2 w-2 translate-y-1/2 rotate-45 border-r border-b border-ink"
          style={{ opacity: percent > 1 ? 1 : 0 }}
        />
      </div>
    </div>
  );
}

/** The page's bottom edge: text meets background instead of being cut off. */
function PageFade() {
  return <div className="page-fade pointer-events-none fixed inset-x-0 bottom-0 z-[5] h-32" />;
}

function ProgressLine({ percent }: { percent: number }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex items-center gap-3 px-6 py-4">
      <div className="h-px flex-1 bg-rule">
        <div className="h-px bg-ink transition-all duration-300" style={{ width: `${percent}%` }} />
      </div>
      <span className="label tabular-nums">{percent}%</span>
    </div>
  );
}

type C = Chapter;

/** Vertical space a flip leaf gives up to the top bar and bottom nav (pt-24 + pb-24). */
const CHROME = 192;

function Heading({ chapter }: { chapter: C }) {
  return (
    <header className="text-center">
      <p className="label">chapter {chapter.numeral}</p>
      <h1 className="mt-6 text-4xl font-light italic text-ink sm:text-5xl">{chapter.title}</h1>
      <hr className="mx-auto mt-10 w-16 border-0 border-t border-ink-soft" />
    </header>
  );
}

function ScrollReader({
  chapter,
  prev,
  next,
  percent,
  report,
}: {
  chapter: C;
  prev: C | undefined;
  next: C | undefined;
  percent: number;
  report: (v: number) => void;
}) {
  // The stored `percent` is monotonic — the furthest point ever read — which
  // is what the index wants. The blade is a position indicator, so it tracks
  // where the reader actually is right now.
  const [here, setHere] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const value = max <= 0 ? 100 : (window.scrollY / max) * 100;
      setHere(Math.max(0, Math.min(100, value)));
      report(value > 97 ? 100 : value);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [report]);

  return (
    <>
      <main className="mx-auto max-w-2xl px-8 pt-32 pb-32">
        <Heading chapter={chapter} />
        {chapter.opening && (
          <p className="mt-16 text-2xl leading-[1.7] font-light italic text-ink">
            {chapter.opening}
          </p>
        )}
        <div className="mt-10">
          <PageBody blocks={toBlocks(chapter.content)} />
        </div>
        <hr className="mt-24 border-0 border-t border-rule" />
        <nav className="mt-8 flex justify-between">
          {prev ? (
            <Link to="/chapter/$id" params={{ id: prev.id }} className="label hover:opacity-60">
              ← {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link to="/chapter/$id" params={{ id: next.id }} className="label hover:opacity-60">
              {next.title} →
            </Link>
          ) : (
            <Link to="/" className="label hover:opacity-60">
              index →
            </Link>
          )}
        </nav>
      </main>
      <MarginBlade percent={here} marks={[33, 66, 100]} />
      <div className="sm:hidden">
        <ProgressLine percent={percent} />
      </div>
    </>
  );
}

function FlipReader({
  chapter,
  next,
  percent,
  report,
}: {
  chapter: C;
  next: C | undefined;
  percent: number;
  report: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);

  // Chrome eats the top and bottom of a leaf; the rest is what we can fill.
  const [available, setAvailable] = useState(0);
  useEffect(() => {
    const measure = () => setAvailable(window.innerHeight - CHROME);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const { probeRef, probeBlocks, leaves } = usePagination(chapter.content, available);
  // The title leaf and the closing leaf bracket the paginated ones.
  const total = (leaves?.length ?? 0) + 2;

  useEffect(() => {
    if (!leaves) return;
    report(((page + 1) / total) * 100);
  }, [page, total, report, leaves]);

  const go = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(total - 1, i));
    // Jump rather than glide. Marking the leaf active re-renders the track,
    // and that re-render interrupts an in-flight smooth scroll inside a
    // snap-mandatory container — it stalls a few pixels in and never
    // arrives. A turned page should land anyway.
    el.scrollLeft = clamped * el.clientWidth;
    setPage(clamped);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(page + 1);
      if (e.key === "ArrowLeft") go(page - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Keep the reader on the same leaf when a resize repaginates under them.
  useEffect(() => {
    const el = trackRef.current;
    if (!el || !leaves) return;
    el.scrollTo({ left: Math.min(page, total - 1) * el.clientWidth });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaves]);

  return (
    <main className="h-screen overflow-hidden">
      {/*
        Offscreen probe: the same blocks at the same width, measured for real.
        Fixed rather than absolute — an absolutely positioned probe is still
        part of the document flow's scroll extent and would reintroduce the
        vertical scrollbar this mode exists to get rid of.
      */}
      <div
        ref={probeRef}
        aria-hidden="true"
        className="pointer-events-none invisible fixed top-0 left-0 w-full px-8"
      >
        <div className="mx-auto max-w-xl">
          <PageBody blocks={probeBlocks} />
        </div>
      </div>

      <div
        ref={trackRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          setPage(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="flex h-screen snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <section className="flex h-screen w-screen shrink-0 snap-center flex-col justify-center px-8">
          <div className="mx-auto w-full max-w-xl">
            <Heading chapter={chapter} />
            <p className="mt-12 text-center text-2xl leading-[1.7] font-light italic text-ink">
              {chapter.opening}
            </p>
          </div>
        </section>
        {(leaves ?? []).map((leaf, i) => (
          <section
            key={i}
            className="flex h-screen w-screen shrink-0 snap-center flex-col justify-center overflow-hidden px-8 pt-24 pb-24"
          >
            <div className="mx-auto w-full max-w-xl">
              <PageBody blocks={leaf} />
            </div>
          </section>
        ))}
        {/* The closing leaf. Kept separate so the nav never crowds the prose. */}
        {leaves && (
          <section className="flex h-screen w-screen shrink-0 snap-center flex-col items-center justify-center gap-8 px-8">
            <hr className="w-16 border-0 border-t border-rule" />
            {next ? (
              <Link to="/chapter/$id" params={{ id: next.id }} className="label hover:opacity-60">
                {next.title} →
              </Link>
            ) : (
              <Link to="/" className="label hover:opacity-60">
                index →
              </Link>
            )}
          </section>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 flex items-center gap-4 px-6 py-4">
        <button
          onClick={() => go(page - 1)}
          className="label hover:opacity-60"
          aria-label="Previous page"
        >
          ←
        </button>
        <div className="h-px flex-1 bg-rule">
          <div
            className="h-px bg-ink transition-all duration-300"
            style={{ width: `${((page + 1) / total) * 100}%` }}
          />
        </div>
        <span className="label">
          {page + 1} / {total}
        </span>
        <span className="label tabular-nums">{percent}%</span>
        <button
          onClick={() => go(page + 1)}
          className="label hover:opacity-60"
          aria-label="Next page"
        >
          →
        </button>
      </div>
    </main>
  );
}
