/// <reference path="../pb_data/types.d.ts" />
//
// Shared helpers for the chapter/waitlist hooks. NOTE: PocketBase runs each hook
// and route handler in an isolated JS VM, so functions defined at the top level
// of main.pb.js are NOT visible inside the handlers. Anything shared must live
// here and be pulled in with require(`${__hooks}/lib.js`) *inside* the handler.

// Resend caps recipients per request; keep well under it.
var BCC_BATCH = 50;

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeEmail(v) {
  return String(v == null ? "" : v)
    .trim()
    .toLowerCase();
}

// Deliberately loose — the goal is to reject obvious junk before it reaches the
// unique index, not to litigate RFC 5322.
function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

// Every waitlist address, oldest first. Returns [] on any failure.
function waitlistEmails(app) {
  try {
    var recs = app.findRecordsByFilter("waitlist", "id != ''", "created", 10000, 0);
    return recs.map(function (r) {
      return r.getString("email");
    }).filter(Boolean);
  } catch (_) {
    return [];
  }
}

function chapterEmailHtml(chapter, link) {
  var numeral = chapter.getString("numeral");
  var title = chapter.getString("title");
  var epigraph = chapter.getString("epigraph");
  var opening = chapter.getString("opening");

  return (
    '<div style="font-family:Georgia,serif;max-width:34rem;margin:auto;padding:40px 24px;color:#252525">' +
    (numeral
      ? '<p style="font-family:system-ui,sans-serif;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#5c5c5c;margin:0">chapter ' +
        esc(numeral) +
        "</p>"
      : "") +
    '<h1 style="font-size:32px;font-weight:300;font-style:italic;margin:16px 0 0">' +
    esc(title) +
    "</h1>" +
    '<hr style="width:64px;margin:28px 0;border:0;border-top:1px solid #d8d4cc">' +
    (opening
      ? '<p style="font-size:18px;line-height:1.7;font-weight:300;font-style:italic;margin:0 0 28px">' +
        esc(opening) +
        "</p>"
      : "") +
    (link
      ? '<p style="margin:0"><a href="' +
        esc(link) +
        '" style="font-family:system-ui,sans-serif;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#252525">read it &rarr;</a></p>'
      : "") +
    (epigraph
      ? '<p style="margin:40px 0 0;font-size:14px;font-style:italic;color:#5c5c5c">' +
        esc(epigraph) +
        "</p>"
      : "") +
    "</div>"
  );
}

/**
 * Email the waitlist that a chapter is out. Returns a small result object; never
 * throws, so a Resend outage can never block publishing.
 *
 * Subscribers go in `bcc` — putting them in `to` would show every reader's
 * address to every other reader.
 */
function notifyWaitlist(app, chapter) {
  var result = { sent: 0, failed: 0, recipients: 0, skipped: null };
  try {
    var apiKey = $os.getenv("RESEND_API_KEY");
    var from = $os.getenv("RESEND_FROM");
    var appUrl = ($os.getenv("APP_URL") || "").replace(/\/+$/, "");
    if (!apiKey || !from) {
      result.skipped = "resend_not_configured";
      return result;
    }

    var to = waitlistEmails(app);
    result.recipients = to.length;
    if (!to.length) {
      result.skipped = "empty_waitlist";
      return result;
    }

    var link = appUrl ? appUrl + "/chapter/" + chapter.getString("slug") : "";
    var subject = chapter.getString("title") + " — a new chapter";
    var html = chapterEmailHtml(chapter, link);
    var url = $os.getenv("RESEND_URL") || "https://api.resend.com/emails";

    for (var i = 0; i < to.length; i += BCC_BATCH) {
      var batch = to.slice(i, i + BCC_BATCH);
      var idx = Math.floor(i / BCC_BATCH);
      try {
        var res = $http.send({
          url: url,
          method: "POST",
          headers: {
            Authorization: "Bearer " + apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: from,
            to: [from], // the visible recipient is us; readers are bcc'd
            bcc: batch,
            subject: subject,
            html: html,
          }),
          timeout: 30,
        });
        if (res.statusCode >= 300) {
          result.failed += batch.length;
          console.log("[notify] batch " + idx + " failed " + res.statusCode + ": " + res.raw);
        } else {
          result.sent += batch.length;
        }
      } catch (err) {
        result.failed += batch.length;
        console.log("[notify] batch " + idx + " threw: " + err);
      }
    }
  } catch (err) {
    console.log("[notify] send failed: " + err);
  }
  return result;
}

/* --------------------------------- views ---------------------------------- */

// Anything that reads a page without a human behind it. Not exhaustive — it
// doesn't need to be, it just keeps the obvious noise out of the numbers.
var BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|curl|wget|headless|monitor|python-requests|axios|okhttp|go-http|scrapy|lighthouse/i;

function isBotUA(ua) {
  return !ua || BOT_UA.test(ua);
}

/**
 * A stable, non-reversible id for one reader on one machine.
 *
 * IP + user-agent is the best signal available without setting a cookie, and
 * hashing it means the database never holds an address. VIEW_SALT keeps the
 * hash from being brute-forceable back to an IP (the space is small enough to
 * enumerate otherwise); losing or changing it just resets the dedup window.
 */
function visitorId(ip, ua) {
  var salt = $os.getenv("VIEW_SALT") || "swordbook-view-salt";
  return $security.hs256(String(ip || "") + "|" + String(ua || ""), salt);
}

/**
 * Count one view. Returns "new" if this visitor hadn't read the chapter before,
 * "repeat" if they had. Never throws — a counter must not be able to break the
 * page it's counting.
 */
function recordView(app, chapterId, visitor) {
  var existing = null;
  try {
    existing = app.findFirstRecordByFilter(
      "chapter_views",
      "chapter = {:c} && visitor = {:v}",
      { c: chapterId, v: visitor },
    );
  } catch (_) {
    /* not found — first visit */
  }

  if (existing) {
    try {
      existing.set("hits", existing.getInt("hits") + 1);
      app.save(existing);
    } catch (err) {
      console.log("[views] bump failed: " + err);
    }
    return "repeat";
  }

  try {
    var col = app.findCollectionByNameOrId("chapter_views");
    var rec = new Record(col);
    rec.set("chapter", chapterId);
    rec.set("visitor", visitor);
    rec.set("hits", 1);
    app.save(rec);
    return "new";
  } catch (err) {
    // Almost certainly the unique index: two requests from the same reader
    // raced past the lookup above. The row exists now, so this is a repeat.
    console.log("[views] insert failed (likely duplicate): " + err);
    return "repeat";
  }
}

/**
 * Per-chapter totals, keyed by chapter id: { unique, total }.
 *
 * Aggregated in SQL rather than by listing rows — the row count is the whole
 * point of the table and there's no reason to pull thousands of them into JS.
 */
function viewStats(app) {
  var out = {};
  try {
    var rows = arrayOf(new DynamicModel({ chapter: "", uniques: 0, total: 0 }));
    app
      .db()
      .newQuery(
        "SELECT chapter, COUNT(*) AS uniques, COALESCE(SUM(hits), 0) AS total" +
          " FROM chapter_views GROUP BY chapter",
      )
      .all(rows);

    for (var i = 0; i < rows.length; i++) {
      out[rows[i].chapter] = { unique: rows[i].uniques, total: rows[i].total };
    }
  } catch (err) {
    console.log("[views] stats query failed: " + err);
  }
  return out;
}

module.exports = {
  esc: esc,
  normalizeEmail: normalizeEmail,
  isEmail: isEmail,
  waitlistEmails: waitlistEmails,
  notifyWaitlist: notifyWaitlist,
  isBotUA: isBotUA,
  visitorId: visitorId,
  recordView: recordView,
  viewStats: viewStats,
};
