import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  createChapter,
  deleteChapter,
  listAllChapters,
  listWaitlist,
  notifyChapter,
  setPublished,
  staffLogout,
  updateChapter,
  type Chapter,
  type ChapterDraft,
  type Subscriber,
} from "@/lib/pb";
import { readingMinutes, wordCount } from "@/components/reader/blocks";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: Admin,
});

const blank = (order: number): ChapterDraft => ({
  slug: "",
  numeral: "",
  title: "",
  epigraph: "",
  opening: "",
  content: "",
  order,
});

function Admin() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"chapters" | "waitlist">("chapters");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<ChapterDraft>(blank(0));
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState<Chapter | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [cs, ws] = await Promise.all([listAllChapters(), listWaitlist()]);
      setChapters(cs);
      setSubs(ws);
    } catch {
      setNote("Couldn't reach the server.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const startNew = () => {
    setDraft(blank(chapters.length));
    setEditing("new");
  };

  const startEdit = (c: Chapter) => {
    setDraft({
      slug: c.slug,
      numeral: c.numeral,
      title: c.title,
      epigraph: c.epigraph,
      opening: c.opening,
      content: c.content,
      order: c.order,
    });
    setEditing(c.id);
  };

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setNote("");
    try {
      if (editing === "new") await createChapter(draft);
      else if (editing) await updateChapter(editing, draft);
      setEditing(null);
      await refresh();
      setNote("Saved.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Save failed.");
    }
    setBusy(false);
  };

  const remove = async (c: Chapter) => {
    if (!window.confirm(`Delete "${c.title}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteChapter(c.id);
      await refresh();
      setNote("Deleted.");
    } catch {
      setNote("Delete failed.");
    }
    setBusy(false);
  };

  const unpublish = async (c: Chapter) => {
    setBusy(true);
    try {
      await setPublished(c.id, false);
      await refresh();
    } catch {
      setNote("Couldn't unpublish.");
    }
    setBusy(false);
  };

  // Publishing and announcing are separate acts; this runs one or both.
  const doPublish = async (c: Chapter, notify: boolean) => {
    setBusy(true);
    setConfirming(null);
    setNote("");
    try {
      await setPublished(c.id, true);
      if (notify) {
        const r = await notifyChapter(c.id);
        if (r.skipped === "resend_not_configured") {
          setNote("Published. Email is not configured, so nobody was notified.");
        } else if (r.skipped === "empty_waitlist") {
          setNote("Published. Nobody is on the waitlist yet.");
        } else {
          setNote(
            `Published and notified ${r.sent} of ${r.recipients}.` +
              (r.failed ? ` ${r.failed} failed — check the server log.` : ""),
          );
        }
      } else {
        setNote("Published.");
      }
      await refresh();
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Publish failed.");
    }
    setBusy(false);
  };

  const signOut = () => {
    staffLogout();
    navigate({ to: "/admin/login", replace: true });
  };

  return (
    <main className="mx-auto max-w-3xl px-8 py-16">
      <header className="flex items-baseline justify-between">
        <div className="flex gap-6">
          {(["chapters", "waitlist"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="label transition-opacity"
              style={{ opacity: tab === t ? 1 : 0.35, color: tab === t ? "var(--ink)" : undefined }}
            >
              {t}
              {t === "waitlist" && subs.length > 0 ? ` (${subs.length})` : ""}
            </button>
          ))}
        </div>
        <div className="flex gap-6">
          <Link to="/" className="label hover:opacity-60">
            site
          </Link>
          <button onClick={signOut} className="label opacity-40 hover:opacity-100">
            sign out
          </button>
        </div>
      </header>

      {note && <p className="mt-10 text-sm font-light italic text-ink-soft">{note}</p>}

      {tab === "chapters" ? (
        editing ? (
          <Editor
            draft={draft}
            setDraft={setDraft}
            busy={busy}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <ChapterList
            chapters={chapters}
            busy={busy}
            onNew={startNew}
            onEdit={startEdit}
            onDelete={remove}
            onUnpublish={unpublish}
            onPublish={(c) => setConfirming(c)}
          />
        )
      ) : (
        <Waitlist subs={subs} />
      )}

      {confirming && (
        <PublishConfirm
          chapter={confirming}
          waiting={subs.length}
          onCancel={() => setConfirming(null)}
          onPublish={(notify) => void doPublish(confirming, notify)}
        />
      )}
    </main>
  );
}

/* ------------------------------- chapter list ------------------------------ */

function ChapterList({
  chapters,
  busy,
  onNew,
  onEdit,
  onDelete,
  onUnpublish,
  onPublish,
}: {
  chapters: Chapter[];
  busy: boolean;
  onNew: () => void;
  onEdit: (c: Chapter) => void;
  onDelete: (c: Chapter) => void;
  onUnpublish: (c: Chapter) => void;
  onPublish: (c: Chapter) => void;
}) {
  return (
    <>
      <ul className="mt-12">
        {chapters.map((c) => (
          <li key={c.id} className="border-b border-rule py-6">
            <div className="flex items-baseline gap-6">
              <span className="label w-6">{c.numeral || "—"}</span>
              <button onClick={() => onEdit(c)} className="flex-1 text-left">
                <span className="text-2xl font-light italic text-ink hover:opacity-60">
                  {c.title || "untitled"}
                </span>
              </button>
              <span className="label tabular-nums opacity-50">
                {readingMinutes(c.content)} min
              </span>
              <span className="label" style={{ opacity: c.published ? 1 : 0.4 }}>
                {c.published ? "published" : "draft"}
              </span>
            </div>
            <div className="mt-4 ml-12 flex gap-6">
              {c.published ? (
                <button
                  onClick={() => onUnpublish(c)}
                  disabled={busy}
                  className="label opacity-40 hover:opacity-100"
                >
                  unpublish
                </button>
              ) : (
                <button onClick={() => onPublish(c)} disabled={busy} className="label hover:opacity-60">
                  publish →
                </button>
              )}
              {c.published && c.notifiedAt && (
                <span className="label opacity-30">announced</span>
              )}
              <button
                onClick={() => onDelete(c)}
                disabled={busy}
                className="label opacity-40 hover:opacity-100"
              >
                delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      <button onClick={onNew} className="label mt-10 hover:opacity-60">
        + new chapter
      </button>
    </>
  );
}

/* --------------------------------- editor --------------------------------- */

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label block">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? ""}
        className="mt-2 w-full border-0 border-b border-rule bg-transparent pb-2 text-lg font-light text-ink outline-none focus:border-ink"
      />
    </div>
  );
}

function Editor({
  draft,
  setDraft,
  busy,
  onSave,
  onCancel,
}: {
  draft: ChapterDraft;
  setDraft: (d: ChapterDraft) => void;
  busy: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const set = <K extends keyof ChapterDraft>(k: K, v: ChapterDraft[K]) =>
    setDraft({ ...draft, [k]: v });

  return (
    <div className="mt-12">
      <div className="grid gap-8 sm:grid-cols-2">
        <Field label="title" value={draft.title} onChange={(v) => set("title", v)} />
        <Field
          label="slug"
          value={draft.slug}
          onChange={(v) => set("slug", v)}
          placeholder="the bit after /chapter/"
        />
        <Field
          label="numeral"
          value={draft.numeral}
          onChange={(v) => set("numeral", v)}
          placeholder="0, I, II"
        />
        <Field
          label="order"
          value={String(draft.order)}
          onChange={(v) => set("order", Number(v) || 0)}
        />
      </div>

      <div className="mt-8">
        <Field label="epigraph" value={draft.epigraph} onChange={(v) => set("epigraph", v)} />
      </div>
      <div className="mt-8">
        <Field
          label="opening"
          value={draft.opening}
          onChange={(v) => set("opening", v)}
          placeholder="the italic line under the title"
        />
      </div>

      <div className="mt-10">
        <div className="flex items-baseline justify-between">
          <label className="label block">chapter</label>
          <span className="label tabular-nums opacity-40">
            {wordCount(draft.content)} words · {readingMinutes(draft.content)} min
          </span>
        </div>
        <p className="mt-2 text-sm font-light italic text-ink-soft">
          Paste the whole thing. A blank line starts a new paragraph — pages are
          worked out from the reader's screen, so there's nothing to split here.
        </p>
        <textarea
          value={draft.content}
          onChange={(e) => set("content", e.target.value)}
          rows={22}
          className="mt-4 w-full resize-y border border-rule bg-transparent p-5 text-base leading-[1.8] font-light text-ink outline-none focus:border-ink"
        />
      </div>

      <div className="mt-10 flex gap-6">
        <button onClick={onSave} disabled={busy} className="label hover:opacity-60">
          {busy ? "saving…" : "save"}
        </button>
        <button onClick={onCancel} className="label opacity-40 hover:opacity-100">
          cancel
        </button>
      </div>
      <p className="mt-6 text-sm font-light italic text-ink-soft">
        Saving never emails anyone. Publishing is a separate step.
      </p>
    </div>
  );
}

/* ----------------------------- publish confirm ---------------------------- */

function PublishConfirm({
  chapter,
  waiting,
  onCancel,
  onPublish,
}: {
  chapter: Chapter;
  waiting: number;
  onCancel: () => void;
  onPublish: (notify: boolean) => void;
}) {
  // notifiedAt is the server's idempotency guard; mirror it so the button that
  // can't work isn't offered.
  const announced = !!chapter.notifiedAt;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      role="dialog"
      aria-modal="true"
    >
      <button
        aria-hidden="true"
        tabIndex={-1}
        onClick={onCancel}
        className="absolute inset-0 cursor-default bg-background/85 backdrop-blur-[2px]"
      />
      <div className="relative w-full max-w-sm border border-rule bg-background px-8 py-10">
        <p className="label">publish</p>
        <p className="mt-4 text-lg leading-[1.7] font-light italic text-ink">
          “{chapter.title || "untitled"}” goes live for everyone.
        </p>
        <p className="mt-4 text-sm font-light italic text-ink-soft">
          {announced
            ? "This chapter has already been announced once — it won't email again."
            : waiting === 0
              ? "Nobody is on the waitlist yet."
              : `${waiting} ${waiting === 1 ? "person is" : "people are"} waiting to hear about it.`}
        </p>
        <div className="mt-8 flex flex-col gap-4">
          {!announced && waiting > 0 && (
            <button onClick={() => onPublish(true)} className="label text-left hover:opacity-60">
              publish + notify →
            </button>
          )}
          <button onClick={() => onPublish(false)} className="label text-left hover:opacity-60">
            publish quietly →
          </button>
          <button onClick={onCancel} className="label text-left opacity-40 hover:opacity-100">
            cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- waitlist -------------------------------- */

function Waitlist({ subs }: { subs: Subscriber[] }) {
  if (!subs.length) {
    return <p className="mt-12 text-lg font-light italic text-ink-soft">Nobody yet.</p>;
  }
  return (
    <ul className="mt-12">
      {subs.map((s) => (
        <li key={s.id} className="flex items-baseline justify-between border-b border-rule py-4">
          <span className="text-base font-light text-ink">{s.email}</span>
          <span className="label tabular-nums opacity-40">{s.created.slice(0, 10)}</span>
        </li>
      ))}
    </ul>
  );
}
