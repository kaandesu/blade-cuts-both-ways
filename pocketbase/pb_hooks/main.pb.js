/// <reference path="../pb_data/types.d.ts" />
//
// Server-side logic:
//   1. onRecordCreateRequest("waitlist") — normalise + validate the address so
//      the unique index actually catches duplicates.
//   2. GET  /api/waitlist/count — public count, so the notify modal can say how
//      many people are waiting without exposing the list.
//   3. POST /api/notify/{id} — staff-only. Emails the waitlist that a chapter is
//      out, then stamps notifiedAt so it can't fire twice.
//
// NOTE: PocketBase runs each handler below in an isolated JS VM. Shared helpers
// MUST be require()'d *inside* each handler — a function defined at the top
// level of this file is not visible within the callbacks.

// ---- 1. waitlist create guard ---------------------------------------------

onRecordCreateRequest((e) => {
  const { normalizeEmail, isEmail } = require(`${__hooks}/lib.js`);

  const email = normalizeEmail(e.record.get("email"));
  if (!isEmail(email)) {
    throw new BadRequestError("Please enter a valid email address.");
  }
  // Store the normalised form so the unique index can't be sidestepped by case
  // or stray whitespace.
  e.record.set("email", email);

  e.next();
}, "waitlist");

// ---- 2. public waitlist count ---------------------------------------------

routerAdd("GET", "/api/waitlist/count", (e) => {
  let count = 0;
  try {
    count = e.app.countRecords("waitlist");
  } catch (_) {
    /* leave at 0 */
  }
  return e.json(200, { count: count });
});

// ---- 3. notify the waitlist about a chapter -------------------------------

routerAdd("POST", "/api/notify/{id}", (e) => {
  const { notifyWaitlist } = require(`${__hooks}/lib.js`);

  const isStaff = e.auth && e.auth.collection() && e.auth.collection().name === "staff";
  if (!isStaff) {
    return e.json(403, { error: "forbidden" });
  }

  let rec;
  try {
    rec = e.app.findRecordById("chapters", e.request.pathValue("id"));
  } catch (_) {
    return e.json(404, { error: "not_found" });
  }

  // Never announce something a reader can't open.
  if (!rec.getBool("published")) {
    return e.json(409, { error: "not_published" });
  }
  // notifiedAt is the idempotency guard — one announcement per chapter.
  if (rec.getString("notifiedAt")) {
    return e.json(409, { error: "already_notified" });
  }

  const result = notifyWaitlist(e.app, rec);

  // Only stamp if something actually went out, so a misconfigured Resend key
  // doesn't silently burn the one announcement this chapter gets.
  if (result.sent > 0) {
    rec.set("notifiedAt", new DateTime());
    try {
      e.app.save(rec);
    } catch (err) {
      console.log("[notify] could not stamp notifiedAt: " + err);
    }
  }

  return e.json(200, result);
});
