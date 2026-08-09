/// <reference path="../pb_data/types.d.ts" />

// Chapters — one record per chapter.
//
// `content` holds the whole chapter as a single blob; a blank line starts a new
// paragraph. There is no authored page structure: the reader splits the text to
// fit the screen at read time (src/hooks/usePagination.ts).
//
// Drafts are readable only by staff, so an unpublished chapter is invisible on
// the public site AND unreachable at its slug.
migrate(
  (app) => {
    const c = new Collection({
      type: "base",
      name: "chapters",

      listRule: "published = true || @request.auth.collectionName = 'staff'",
      viewRule: "published = true || @request.auth.collectionName = 'staff'",
      createRule: "@request.auth.collectionName = 'staff'",
      updateRule: "@request.auth.collectionName = 'staff'",
      deleteRule: "@request.auth.collectionName = 'staff'",

      fields: [
        // URL segment, e.g. /chapter/0
        { type: "text", name: "slug", required: true, max: 80 },
        // Display-only, e.g. "0", "I", "II"
        { type: "text", name: "numeral", max: 12 },
        { type: "text", name: "title", required: true, max: 200 },
        { type: "text", name: "epigraph", max: 300 },
        { type: "text", name: "opening", max: 1000 },
        // The chapter itself. Blank line = paragraph break.
        { type: "text", name: "content", max: 500000 },

        // Index ordering and prev/next.
        { type: "number", name: "order", onlyInt: true },

        // Publishing is a separate act from saving.
        { type: "bool", name: "published" },
        { type: "date", name: "publishedAt" },
        // Stamped once a notification goes out, so a chapter can't double-notify.
        { type: "date", name: "notifiedAt" },

        { type: "autodate", name: "created", onCreate: true },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],

      indexes: [
        "CREATE UNIQUE INDEX idx_chapters_slug ON chapters (slug)",
        "CREATE INDEX idx_chapters_order ON chapters (`order`)",
      ],
    });

    app.save(c);
  },
  (app) => {
    const c = app.findCollectionByNameOrId("chapters");
    app.delete(c);
  },
);
