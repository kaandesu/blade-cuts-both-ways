/// <reference path="../pb_data/types.d.ts" />

// Staff auth collection — the author account that logs into /admin.
// Email + password. No public signup; seeded from PB_STAFF_* (see 1730000300).
migrate(
  (app) => {
    const staff = new Collection({
      type: "auth",
      name: "staff",
      listRule: "@request.auth.collectionName = 'staff'",
      viewRule: "@request.auth.collectionName = 'staff'",
      createRule: null, // no public signup
      updateRule: "@request.auth.collectionName = 'staff'",
      deleteRule: null,
      fields: [{ type: "text", name: "name", max: 120 }],
      passwordAuth: { enabled: true, identityFields: ["email"] },
    });

    app.save(staff);
  },
  (app) => {
    const staff = app.findCollectionByNameOrId("staff");
    app.delete(staff);
  },
);
