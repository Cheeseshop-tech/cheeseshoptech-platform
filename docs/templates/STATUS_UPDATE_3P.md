# Status update (3P) — template

Progress · Plans · Problems. For anyone outside the build — client, partner, stakeholder. They have
some context, not a lot. 30–60 seconds to read, and never longer. Strict format, no deviation.

---

[emoji] **CheeseShop TECH — <client or workstream>** (Mon DD–DD)
**Progress:** 1–3 sentences. Things shipped, with numbers.
**Plans:** 1–3 sentences. What's next and roughly when.
**Problems:** 1–3 sentences. What's slowing things down, or "None this week."

---

Worked example:

🧀 **CheeseShop TECH — Monti Trentini** (Jul 20–25)
**Progress:** Fixed PNG downloads failing on 31 of 386 catalog assets — the whole Asiago, Grana and
Stagionati line now downloads correctly. Closed out Thursday's Media Hub image outage; root cause
was a preview build published to production, and that path is now structurally removed.
**Plans:** Push the download fix to production. Verify this week's inventory sync — the generated
file carries a future date and swings availability sharply, so it's held back pending a check.
**Problems:** Two product titles have SKU text spliced into the name and will show in the catalog
until corrected.

Rules: metrics not adjectives — "31 of 386" not "several." Never bury a Problem to keep the update
clean; an update with no Problems section reads as unmonitored, not healthy. If nothing is wrong,
write "None this week" and mean it. Say what a reader should *do*, if anything.
