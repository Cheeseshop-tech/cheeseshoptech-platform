# Per-campaign discovered fields

**Date:** 2026-09-26 · **Contract:** `docs/PEOPLE_DATA_OWNERSHIP.md`

> Rick, 2026-09-26: *"let's create the system and leave room for the development and discovery of
> details per campaign, we can improve as we go."*

---

## The problem

The enrichment form asks the same five things of every prospect in every campaign — buyer, title,
email, phone, address. But a campaign discovers its own questions **while it runs**. A DOP push
wants to know whether an account already carries a PDO line. A shelf-tag program wants to know who
prints the tags. You find that out on call nine, not on day one.

There was nowhere to put it. `campaign-enrichment.js` has a hard allow-list, so an unrecognised
field was not rejected — it was **silently dropped**. The practical result is that the detail got
typed into the free-text call note, where nothing can count it, filter on it, or act on it.

## The three-way split

This adds the third row. The first two already existed; the doc just never named the third.

| Kind of fact | Example | Home | Vocabulary |
|---|---|---|---|
| **Durable fact about a person or account** | `contact_role`, `territory`, `relationship` | **HubSpot**, promoted by `crm-push` | Fixed, shared, `src/lib/people-fields.js` |
| **Campaign process state** | call outcome, notes, called-at | Blobs, campaign-scoped | Fixed |
| **Discovered per-campaign detail** | "Carries a PDO line?" | Blobs, campaign-scoped, declared on the campaign | **Grows per campaign** |

## Where things live

**Definitions** — `campaign-state.js`, per campaign:

```js
fields: [{ id, label, type, options?, hint?, addedAt }]
```

`type` is `text` · `select` · `check`. Capped at 12 fields, 12 options each.

Deliberately in campaign **state**, not in `src/lib/campaigns.js`. The split set on 2026-08-03 is
that campaign *definitions* are seeded in code and versioned with it, while campaign *state* is
per-campaign and editable at runtime. A question invented on call nine is state by that
definition — the same shape of thing as `custom` checklist items, stored the same way.

**Answers** — on the enrichment row, in a `custom` bag:

```js
custom: { [fieldId]: "string value" }
```

Capped at 12 keys, 400 chars each. Always stored as **strings**, whatever the declared type — a
checkbox is `"1"`/absent, a select is its option text. One storage type means changing a field's
type mid-campaign does not orphan the answers already collected, and that *will* happen, because
the field is being invented while the campaign runs.

This works because enrichment rows became campaign-scoped in `ef0414c`. Without that, two
campaigns' answers would land in the same slot — which is the bug that commit fixed.

## The rule that keeps this from becoming a shadow CRM

> **Campaign-declared fields are NEVER promoted to HubSpot automatically.**

`crm-push` does not read `custom` and must not start. If a discovered detail turns out to be
durable and universal, it **graduates** — someone decides to make it a real HubSpot property, it
joins `src/lib/people-fields.js`, and the campaign field is retired.

That gate is the whole design. Without it this is the sixth overlay store that
`PEOPLE_DATA_OWNERSHIP.md` guardrail 1 exists to prevent. With it, it is a nursery: a cheap place
for a question to prove itself before it earns a permanent home.

## Deliberate choices

1. **The editor sits beside the call list, not in campaign settings.** The moment you need a new
   question is the moment you are on a call discovering you need it. Two screens away means the
   answer goes in the free-text note instead.
2. **Removing a question keeps the answers.** The control disappears; the captured values stay on
   their rows. Deleting a question should not delete what people said.
3. **Field ids carry a counter suffix** (`f-carries-pdo-3`). Re-adding a deleted label cannot
   collide with an id that still has answers stored against it.
4. **A `select` with no options is refused** at both ends — the UI disables Add, the server drops
   it. A control nobody can answer is worse than no control.
5. **Rendered below the HubSpot pickers, visually separated, labelled "stays in CST".** The
   promotion boundary has to be legible at a glance or it will not be respected.
6. **Capped at 12.** A campaign needing more than a dozen extra questions per prospect is not
   discovering details, it is building a survey — and the answer there is a real schema, not more
   bolt-ons.

## Not done

- **Nothing reads the answers back out yet** beyond the form that captured them. No per-campaign
  report, no filter, no export column. That is the obvious next step and was left out
  deliberately: guardrail 4 says do not build the screen before the field it reads is populated.
- **No graduation path in code.** Promoting a proven field to a HubSpot property is a manual job
  today: create the property in the UI, add it to `people-fields.js`, wire `crm-push`, retire the
  campaign field. Worth automating only once it has happened twice.
- **`enrichmentCsv()` does not include custom fields.** The CSV is HubSpot-import shaped, and
  these deliberately do not go to HubSpot.
