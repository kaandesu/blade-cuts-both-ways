/// <reference path="../pb_data/types.d.ts" />

// Seed chapter 0 — the prose previously hardcoded in src/content/chapters.ts.
// The old three authored "pages" are simply concatenated: page structure is now
// decided at read time by the viewport, so the only thing that survives is the
// paragraph order, joined with blank lines.
//
// The two lorem-ipsum placeholder chapters from the static file are not seeded.
migrate(
  (app) => {
    const paragraphs = [
      "I've been traveling for untold centuries. Passed through countless ruined what once was cities, dragged my feet across the empty fields where the people were its last harvest and death was its last produce.",
      "Lost myself numerous times, survived through many winters. Living is what I am but not what I do. I found myself in one of the sanctuaries on a coast of northern Europe, few years must've already passed since my last encounter. After the — more or less — first hundred years of travel and clash: destinations became people more than places.",
      "Now under the light of the dawn, standing in front of a forest of stones, on a soil where it had forgotten the presence of a living.",
      "each one unmarked by the sun's cold rays, a memory of a fallen wanderer",
      "Feelings. Feelings rushing in. Feelings that I convinced that were long gone, coming back to surface, blooming like a tumbleweed quenching its long awaited thirst.",
      "I don't remember when my eyes became deprived of dropping a tear. But I digress — my apologies, fellow wanderers, for what I am feeling that is not sadness nor grief. It is the relief of the reminder that I am still human. A trait that I would've traded all my techniques to acquire, if I wasn't.",
      "I stood up and regained my composure. Started to concentrate; it feels as natural as breathing. I let my feelings go numb — that's where they tend to go. The same wind surrounding my body started to feel stronger, reminded me, whispering the lyrics of the song that I had long forgotten.",
      "Felt the soil pulsating with vibrations from deep under, rippling under my feet and across the field as it synchronised with my own heartbeat. I gently placed my right hand to the hilt of my blade that is on my left side. The ripples on the ground started to emerge faster and faster, as their amplitude decreased. The hilt was attracting the wind like a vortex; a gentle cold breeze started to heat up, spiralling around the sheath.",
      "sharp enough to cut the sky itself, and mirrored — almost invisible to a normal eye",
      "I grabbed the hilt. As I felt the blade forming inside the hilt with each pulse, a faint metallic sound started to match its frequency. Blade followed a straight line to its freedom. Now soaring in the sky.",
      "slashes following stabs, from parry to thrust — wind gathering at the tip",
      "Ripples traveling from the ground to my hand. I tightened my grip as the runes on the hilt started to appear.",
      "Then the wind stopped. There was no sound.",
      "The sound of the waves hitting the cliff were no more. I could only hear my own breath leaving my lungs. Along the blade, a wave of energy started to spread wave by wave, like an incense filling the environment — each wave carrying the compressed voice of the winds.",
      "the sword song — the pinnacle of the blade mastery",
      "Each wave reflecting the stories of the fallen onto their own grave, reminding them who they once were, telling the fables about their travels and sacrifices. Respecting their eternal rest. I loosened my grip. The sword song slowly dispersed around. I stop the chanting.",
      "Sounds. Sounds of the waves hitting the shore. The wind that is now free. The rays of the sun entering my eyes, bringing me back. I sheath my blade. I started walking away.",
    ];

    try {
      app.findFirstRecordByData("chapters", "slug", "0");
      return; // already seeded
    } catch (_) {
      /* not found — create below */
    }

    const chapters = app.findCollectionByNameOrId("chapters");
    const rec = new Record(chapters);
    rec.set("slug", "0");
    rec.set("numeral", "0");
    rec.set("title", "The Sword Song");
    rec.set("epigraph", "the wind kept the only record");
    rec.set(
      "opening",
      "I've been traveling for untold centuries, and the road has forgotten me as surely as I have forgotten it.",
    );
    rec.set("content", paragraphs.join("\n\n"));
    rec.set("order", 0);
    rec.set("published", true);
    rec.set("publishedAt", new DateTime());
    // Deliberately left unset: this chapter predates the waitlist, so publishing
    // it must not be treated as a fresh release to notify anyone about.
    rec.set("notifiedAt", new DateTime());
    app.save(rec);
  },
  (app) => {
    try {
      app.delete(app.findFirstRecordByData("chapters", "slug", "0"));
    } catch (_) {
      /* nothing to roll back */
    }
  },
);
