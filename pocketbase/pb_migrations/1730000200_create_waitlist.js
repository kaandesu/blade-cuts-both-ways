/// <reference path="../pb_data/types.d.ts" />

// Waitlist — readers who asked to be told when a chapter lands.
//
// createRule is open because the notify modal on the front page posts here
// directly. Everything else is staff-only, so the list can never be enumerated
// by the public. The create hook in pb_hooks/main.pb.js normalises and validates
// the address before the unique index sees it.
migrate(
  (app) => {
    const c = new Collection({
      type: "base",
      name: "waitlist",

      createRule: "", // public — the notify modal
      listRule: "@request.auth.collectionName = 'staff'",
      viewRule: "@request.auth.collectionName = 'staff'",
      updateRule: "@request.auth.collectionName = 'staff'",
      deleteRule: "@request.auth.collectionName = 'staff'",

      fields: [
        { type: "text", name: "email", required: true, max: 254 },
        { type: "autodate", name: "created", onCreate: true },
      ],

      indexes: ["CREATE UNIQUE INDEX idx_waitlist_email ON waitlist (email)"],
    });

    app.save(c);
  },
  (app) => {
    const c = app.findCollectionByNameOrId("waitlist");
    app.delete(c);
  },
);
