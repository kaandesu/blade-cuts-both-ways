/* ---------------------------------- types --------------------------------- */

export type Block = { t: "p"; text: string } | { t: "open"; text: string };

/**
 * Split a chapter into paragraphs. A blank line starts a new one; the first
 * paragraph carries the dropcap, so an author never has to mark it up.
 *
 * There is no page structure here on purpose — where a page ends is decided at
 * read time by the viewport (see usePagination).
 */
export function toBlocks(content: string): Block[] {
  return content
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((text, i) => ({ t: i === 0 ? "open" : "p", text }) as Block);
}

export const wordCount = (content: string) =>
  content.split(/\s+/).filter(Boolean).length;

/** Rounded up, at a middling prose pace. */
export const readingMinutes = (content: string) =>
  Math.max(1, Math.round(wordCount(content) / 240));

/* --------------------------------- pieces --------------------------------- */

function Para({ text }: { text: string }) {
  return (
    <p className="mt-6 text-lg leading-[1.9] font-light text-ink first:mt-0 sm:text-xl">
      {text}
    </p>
  );
}

function Opening({ text }: { text: string }) {
  return (
    <p className="dropcap text-2xl leading-[1.7] font-light italic text-ink">
      <span aria-hidden="true">{text.slice(0, 1)}</span>
      {text.slice(1)}
    </p>
  );
}

/* -------------------------------- renderer -------------------------------- */

export function PageBody({ blocks }: { blocks: Block[] }) {
  return (
    <div data-reader-body>
      {blocks.map((b, i) =>
        b.t === "open" ? <Opening key={i} text={b.text} /> : <Para key={i} text={b.text} />,
      )}
    </div>
  );
}
