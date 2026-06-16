# Asiago Launch — 3-Touch Outreach Sequence

**List:** National Cheese Shop Campaign (HubSpot active list, Companies → associated contacts)
**Stage 1 goal:** Open a real conversation and reach the **decision-maker** (owner / cheese buyer). This is relationship-building, **not** order-closing.
**Voice:** Warm, rooted, proud — never corporate or overhyped. No spec-stacked subject lines.

### How pricing is handled
**By inquiry.** Freight is FedEx/UPS quoted to the shop's location, so price + shipping come *after* the conversation starts — never lead with a number. The ask is a **taste and a talk**, not an order.

### Before you send — fill these
- `[[SIGNATURE]]` → use this block (fill phone):

  > Rick Posada
  > Monti Trentini — USA
  > Sales@montitrentini-usa.com
  > @montitrentini

- **Send from / reply-to:** Sales@montitrentini-usa.com
- Attach **`Asiago_Sell_Sheet`** (PDF) to Touch 1.

### Personalization tokens (HubSpot)
- `{{ contact.firstname | default: "there" }}` — greeting.
- `{{ company.name }}` — the shop.
- `{{ company.city }}` — for the metro line (or use the **Metro** variants below).

> Cadence: **Touch 1 → Day 0**, **Touch 2 → Day 4**, **Touch 3 → Day 9**. Stop on any reply.

---

## Touch 1 — Introduction + find the right person (Day 0)

**Subject A:** A hello from a family cheesemaker in the Alps
**Subject B:** Authentic Alpine Asiago — and the right person at {{ company.name }}

Hi {{ contact.firstname | default: "there" }},

I work with **Monti Trentini**, a family creamery that's made Asiago DOP in the Trentino mountains since 1925 — milk from within 90 km of the dairy, made and aged in their own plants at 800 metres.

I'd love to introduce them to {{ company.name }}. Two quick things:

1. **Am I reaching the right person** for cheese buying — or could you point me to them?
2. I'd be glad to **send a taste**. Their three Asiago tell one story across a case: *Fresco* (mild, 30–40 days), *Stagionato* (nutty, 5 months), and *Vecchio* (deep and crystalline, 9 months) — whole wheels or vacuum-packed quarters, already in stock stateside.

No pitch on this first note — I'd just like to open a conversation. One-pager attached if you're curious. Open to a quick call?

Warmly,
[[SIGNATURE]]

---

## Touch 2 — Story & why it matters (Day 4)

**Subject:** Why the mountain is the difference

Hi {{ contact.firstname | default: "there" }},

Following up with the part I think you'll appreciate as a cheese person.

Monti Trentini does **everything at home** — milk processing, cheesemaking, aging, packaging — all in their own plants in Grigno. Every wheel handled start to finish by the people who make it, from milk grazed in the Dolomites' shades. Nothing outsourced, nothing anonymous.

It's also a real **sustainable operation**: an in-house solar plant (~650,000 kWh/yr), ~80% electricity self-sufficiency, ~1,000 tons of CO₂ avoided a year — and the alpine farms and pastures protected behind it.

That's a story your customers respond to at the counter, and the Asiago earns its place in the case. Could I send {{ company.name }} a sample of the Vecchio to taste — or find 15 minutes to talk?

Warmly,
[[SIGNATURE]]

---

## Touch 3 — Gentle nudge to connect (Day 9)

**Subject:** Still glad to send a taste

Hi {{ contact.firstname | default: "there" }},

I'll keep this short. I'd genuinely like to start a relationship with {{ company.name }} — no pressure to buy anything.

If it's helpful, I can **drop a sample in the mail** so you can judge the cheese on its own terms, and we can talk whenever the timing's right. If there's a better person to speak with, just send me their way.

Whatever's easiest — and thank you for the time.

Warmly,
[[SIGNATURE]]

---

## Metro line variants (optional flavor for Touch 1)

Drop one in if you want a local touch:

- **NYC:** *"The city's best counters are leaning into authentic Alpine cheese right now —"*
- **LA:** *"LA's specialty shops are all about provenance lately, and this fits —"*
- **SF / Bay Area:** *"Bay Area buyers care about craft and sustainability both — Monti Trentini lands on both —"*
- **Chicago:** *"Chicago's Italian-grocery and cheesemonger scene is exactly where this belongs —"*

## Reply-handling quick notes
- **"Send a sample"** → log the sample-sent date in HubSpot (sample tracking is sacred — never guess follow-up status), ship the cut they name, follow up in ~7 days.
- **"What's the price?"** → *now* the conversation's open: send the sell sheet and quote price + FedEx/UPS freight to their location.
- **"Talk to [name]"** → create/associate the decision-maker contact in HubSpot, restart Touch 1 with them.
- **"Not now"** → set a HubSpot task to re-touch in 60–90 days; leave them on the active list.
