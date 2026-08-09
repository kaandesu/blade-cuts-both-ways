/// <reference path="../pb_data/types.d.ts" />

// Chapter views — one record per (chapter, visitor), so the row count *is* the
// unique-view count. Repeat visits bump `hits` on the existing row instead of
// adding another, which is what separates "unique" from "total".
//
// `visitor` is an HMAC of the reader's IP + user-agent, never the raw values:
// the point is to recognise a returning reader, not to be able to identify one.
//
// Every rule is null — nobody reaches this collection through the REST API, not
// even staff. Writes go through POST /api/view/{slug} and the admin page reads
// aggregates from GET /api/views (both in pb_hooks/main.pb.js). That's what
// keeps the numbers off the public chapter payload.
migrate(
  (app) => {
    const chapters = app.findCollectionByNameOrId("chapters");

    const c = new Collection({
      type: "base",
      name: "chapter_views",

      fields: [
        {
          type: "relation",
          name: "chapter",
          required: true,
          collectionId: chapters.id,
          // A deleted chapter takes its view rows with it.
          cascadeDelete: true,
          maxSelect: 1,
        },
        // hex HMAC-SHA256 of ip + user-agent, salted with VIEW_SALT.
        { type: "text", name: "visitor", required: true, max: 64 },
        // Total visits from this visitor; 1 on first sight.
        { type: "number", name: "hits", onlyInt: true },

        { type: "autodate", name: "created", onCreate: true },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],

      // The uniqueness guarantee, enforced by the database rather than by the
      // read-then-write in the hook (which can race with itself).
      indexes: [
        "CREATE UNIQUE INDEX idx_chapter_views_unique ON chapter_views (chapter, visitor)",
        "CREATE INDEX idx_chapter_views_chapter ON chapter_views (chapter)",
      ],
    });

    app.save(c);
  },
  (app) => {
    const c = app.findCollectionByNameOrId("chapter_views");
    app.delete(c);
  },
);
