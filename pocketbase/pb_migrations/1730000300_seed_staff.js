/// <reference path="../pb_data/types.d.ts" />

// Seed the author account from env (PB_STAFF_EMAIL + PB_STAFF_PASSWORD) so
// /admin is usable immediately after deploy. Migrations are tracked, so this
// runs once. If the vars aren't set at first boot it's a no-op and you create
// the account from the /_/ dashboard instead.
migrate(
  (app) => {
    const email = $os.getenv("PB_STAFF_EMAIL");
    const password = $os.getenv("PB_STAFF_PASSWORD");
    if (!email || !password) return;

    try {
      app.findFirstRecordByData("staff", "email", email);
      return; // already there
    } catch (_) {
      /* not found — create below */
    }

    const staff = app.findCollectionByNameOrId("staff");
    const rec = new Record(staff);
    rec.set("email", email);
    rec.set("password", password);
    rec.set("name", "Author");
    rec.set("verified", true);
    app.save(rec);
  },
  (app) => {
    const email = $os.getenv("PB_STAFF_EMAIL");
    if (!email) return;
    try {
      app.delete(app.findFirstRecordByData("staff", "email", email));
    } catch (_) {
      /* nothing to roll back */
    }
  },
);
