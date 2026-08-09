import { useEffect, useRef, useState } from "react";
import { toBlocks, type Block } from "@/components/reader/blocks";

/** Height including margins — the blocks lean on large my-* values. */
function outerHeight(el: HTMLElement) {
  const cs = getComputedStyle(el);
  return el.offsetHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom);
}

/**
 * Splits a chapter into leaves that each fit the viewport, so flip mode never
 * scrolls. There are no authored page breaks — this is where pages come from,
 * recomputed whenever the window changes size.
 *
 * It measures for real rather than guessing: the caller renders every paragraph
 * into a hidden probe, we read the heights back, then pack.
 */
export function usePagination(content: string, available: number) {
  const probeRef = useRef<HTMLDivElement>(null);
  const [leaves, setLeaves] = useState<Block[][] | null>(null);

  const blocks = toBlocks(content);

  useEffect(() => {
    if (available <= 0) return;
    let cancelled = false;

    const measure = (): boolean => {
      const body = probeRef.current?.querySelector("[data-reader-body]");
      if (!body || cancelled) return false;
      const nodes = Array.from(body.children) as HTMLElement[];
      if (nodes.length !== blocks.length) return false;

      const packed: Block[][] = [];
      let current: Block[] = [];
      let used = 0;

      const flush = () => {
        if (current.length) packed.push(current);
        current = [];
        used = 0;
      };

      blocks.forEach((block, i) => {
        const h = outerHeight(nodes[i]!);

        // A paragraph taller than a leaf gets one to itself — splitting inside a
        // paragraph isn't something this reader can do.
        if (h > available) {
          flush();
          packed.push([block]);
          return;
        }
        if (used + h > available) flush();
        current.push(block);
        used += h;
      });
      flush();

      if (!cancelled) setLeaves(packed.length ? packed : [[]]);
      return true;
    };

    /**
     * Keep trying until the probe has actually rendered. A single attempt races
     * React's commit, and a measurement that gives up quietly leaves the whole
     * chapter on one unusable leaf.
     */
    let frame = 0;
    const run = () => {
      let tries = 0;
      const attempt = () => {
        if (cancelled) return;
        if (measure() || ++tries > 60) return;
        frame = requestAnimationFrame(attempt);
      };
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(attempt);
    };
    run();
    // Cormorant loads from Google Fonts; every height shifts when it swaps in,
    // so a measurement taken before that breaks in the wrong places.
    document.fonts?.ready.then(run).catch(() => {});

    let t = 0;
    const onResize = () => {
      window.clearTimeout(t);
      t = window.setTimeout(run, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, content]);

  return { probeRef, probeBlocks: blocks, leaves };
}
