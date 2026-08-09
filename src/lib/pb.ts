import PocketBase, { ClientResponseError, type RecordModel } from "pocketbase";

/**
 * The browser talks to PocketBase over its public URL, which is baked into the
 * bundle at build time (see the VITE_POCKETBASE_URL build arg in the Dockerfile).
 *
 * SSR runs inside the compose network, so it uses POCKETBASE_URL instead and
 * never leaves the private network to read a chapter. Falling back to the
 * compose service name keeps that working with no configuration at all.
 */
const baseUrl =
  typeof window === "undefined"
    ? process.env["POCKETBASE_URL"] || "http://pocketbase:8090"
    : import.meta.env["VITE_POCKETBASE_URL"] || "http://127.0.0.1:8090";

export const pb = new PocketBase(baseUrl);
// The reader's loaders fire on every navigation; auto-cancellation would abort
// an in-flight request that a second render still needs.
pb.autoCancellation(false);

/* ---------------------------------- types --------------------------------- */

export type Chapter = {
  id: string;
  slug: string;
  numeral: string;
  title: string;
  epigraph: string;
  opening: string;
  /** The whole chapter. A blank line starts a new paragraph. */
  content: string;
  order: number;
  published: boolean;
  publishedAt: string;
  notifiedAt: string;
};

export type Subscriber = { id: string; email: string; created: string };

const toChapter = (r: RecordModel): Chapter => ({
  id: r["id"],
  slug: r["slug"] ?? "",
  numeral: r["numeral"] ?? "",
  title: r["title"] ?? "",
  epigraph: r["epigraph"] ?? "",
  opening: r["opening"] ?? "",
  content: r["content"] ?? "",
  order: r["order"] ?? 0,
  published: !!r["published"],
  publishedAt: r["publishedAt"] ?? "",
  notifiedAt: r["notifiedAt"] ?? "",
});

/* --------------------------------- reading -------------------------------- */

/**
 * Published chapters, in reading order. Drafts are filtered out by the
 * collection's list rule, not here — the server is what enforces it.
 */
export async function listPublished(): Promise<Chapter[]> {
  const recs = await pb.collection("chapters").getFullList({ sort: "order", filter: "published = true" });
  return recs.map(toChapter);
}

export async function getBySlug(slug: string): Promise<Chapter | null> {
  try {
    const rec = await pb.collection("chapters").getFirstListItem(`slug = "${slug.replace(/"/g, "")}"`);
    return toChapter(rec);
  } catch {
    return null;
  }
}

/* --------------------------------- waitlist ------------------------------- */

export async function waitlistCount(): Promise<number> {
  try {
    const res = await pb.send<{ count: number }>("/api/waitlist/count", { method: "GET" });
    return res.count ?? 0;
  } catch {
    return 0;
  }
}

export type JoinResult = "joined" | "already" | "invalid" | "error";

/**
 * Add an address to the waitlist. An address that's already on the list reports
 * the same success as a new one — whether a given email is subscribed isn't
 * something a stranger should be able to probe.
 */
export async function joinWaitlist(email: string): Promise<JoinResult> {
  try {
    await pb.collection("waitlist").create({ email });
    return "joined";
  } catch (err) {
    if (err instanceof ClientResponseError) {
      const data = err.response?.["data"] as Record<string, { code?: string }> | undefined;
      if (data?.["email"]?.code === "validation_not_unique") return "already";
      if (err.status === 400) return "invalid";
    }
    return "error";
  }
}

/* ----------------------------------- auth --------------------------------- */

export async function staffLogin(email: string, password: string) {
  return pb.collection("staff").authWithPassword(email, password);
}

export function staffLogout() {
  pb.authStore.clear();
}

export function isStaff(): boolean {
  return pb.authStore.isValid && pb.authStore.record?.["collectionName"] === "staff";
}

/* ---------------------------------- admin --------------------------------- */

export async function listAllChapters(): Promise<Chapter[]> {
  const recs = await pb.collection("chapters").getFullList({ sort: "order" });
  return recs.map(toChapter);
}

export type ChapterDraft = Pick<
  Chapter,
  "slug" | "numeral" | "title" | "epigraph" | "opening" | "content" | "order"
>;

export async function createChapter(draft: ChapterDraft): Promise<Chapter> {
  const rec = await pb.collection("chapters").create({ ...draft, published: false });
  return toChapter(rec);
}

export async function updateChapter(id: string, draft: Partial<ChapterDraft>): Promise<Chapter> {
  const rec = await pb.collection("chapters").update(id, draft);
  return toChapter(rec);
}

export async function deleteChapter(id: string): Promise<void> {
  await pb.collection("chapters").delete(id);
}

/** Publishing is deliberately separate from saving. */
export async function setPublished(id: string, published: boolean): Promise<Chapter> {
  const patch: Record<string, unknown> = { published };
  if (published) patch["publishedAt"] = new Date().toISOString();
  const rec = await pb.collection("chapters").update(id, patch);
  return toChapter(rec);
}

export type NotifyResult = {
  sent: number;
  failed: number;
  recipients: number;
  skipped: string | null;
};

/** Email the waitlist. The server refuses drafts and repeat sends. */
export async function notifyChapter(id: string): Promise<NotifyResult> {
  return pb.send<NotifyResult>(`/api/notify/${id}`, { method: "POST" });
}

export async function listWaitlist(): Promise<Subscriber[]> {
  const recs = await pb.collection("waitlist").getFullList({ sort: "-created" });
  return recs.map((r) => ({ id: r["id"], email: r["email"] ?? "", created: r["created"] ?? "" }));
}
