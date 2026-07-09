# Trust-by-Design Review — CST vs. Superhuman's "AI Trust by Design" framework

**Written:** 2026-07-07 · Source article: Giles Douglas (CISO, Superhuman), *"Why Enterprise AI Fails
Without Trust by Design,"* superhuman.com/learn/ai/ai-trust-by-design (paid/content-marketing piece
for their enterprise platform, but the three-problem framework is sound and worth measuring CST
against).

## The article's claim

Enterprise AI stalls not on model capability but on trust — earned confidence that systems are
secure, guardrails are clear, and adoption won't create unintended risk. Three failure modes:

1. **Disconnected systems** — tool sprawl, unclear data flows, inconsistent policy across point
   solutions.
2. **Weak or undefined controls** — natural-language/agent interfaces are harder to constrain than
   APIs; blanket restrictive policy is the instinctive (bad) fix.
3. **Lack of security & governance that scales with usage** — policy lags adoption → shadow tools,
   loose credentials → incident → clampdown → trust drains, adoption stalls.

Prescription: design trust in from day one (system-level view, secure defaults, data/access
minimization, clear agent boundaries, visibility into data flows, governance that scales with usage).

## How CST measures up

| Problem | CST evidence | Verdict |
|---|---|---|
| **1. Disconnected systems** | `INTEGRATIONS_PLAN.md` — an explicit, dated system-of-record map (Salesforce=CRM, HubSpot=content only, Cloudinary=images, Sheet=inventory), written specifically to correct an earlier wrong assumption (HubSpot mistaken for the CRM). `DATA_OWNERSHIP_MAP.md` — "one authoring home per fact" rule, SKU as the single join key across Product/Brand/Asset domains. One Netlify site serves all tenants (not a sprawl of point tools). | **Strong.** This is the article's prescription already in practice — CST caught and wrote down its own "wait, what's actually the source of truth" moment instead of letting the ambiguity fester. |
| **2. Weak or undefined controls** | `AUTH_AND_ROLES.md` — defined role model (owner/admin/client/pr/influencer/creator) + tenant scoping (`canAccessTenant`, least-privilege by design). But: pilot auth is a **shared passcode**, not per-user — `.env.example` and the doc itself flag this as a known, temporary tradeoff ("not for public/consumer data," deferred to Clerk at client #2). The `_write-guard.js` fix (2026-07-06) is a textbook example of the article's "accidents and near-misses": three write endpoints called Cloudinary's Admin API with the secret safely server-side but had **no check on the caller** — role gates only hid buttons in the UI, so a direct curl could rewrite/delete assets. Found and closed, but it shipped before it was caught. | **Mixed.** Good instincts, fast remediation, honest documentation of the gap — but the current control (shared passcode + localStorage unlock + a discoverable `?app=1` house-view trick) is exactly the "brittle control" pattern the article warns about. It's a conscious, documented stopgap, not an oversight — that's the redeeming part. |
| **3. Governance that scales with usage** | `OPERATIONS_MANUAL.md` §10 — secrets in Netlify env vars only, never committed, `.gitignore` excludes `.env`; least-privilege access; quarterly user-list review; password manager for credentials. §12 (client exit/buyout) shows governance thinking extends to IP boundaries and data ownership at contract end, not just day-to-day ops. Written *before* client #2, i.e., designed alongside adoption rather than retrofitted after an incident. | **Strong for current scale.** The policy exists and predates the pressure that would normally force it into existence reactively. |

## The one real gap: visibility

The article's fourth "what great looks like" bullet — **visibility into data flows, prompts, and
outputs across systems** — has no CST equivalent yet. There's no audit log or access log anywhere in
`netlify/functions/` or `docs/` (checked directly, not from memory). Right now, if someone hits a
write endpoint with a valid passcode, there's no record of who did what, when. At one client this is
low-stakes; it stops being low-stakes the moment a second tenant's admin, or a second CST staffer, is
in the system.

## Bottom line

For a solo-operator build, CST's paper trail is unusually mature — it's already doing the
system-of-record mapping, data-ownership discipline, and role modeling that the article says most
enterprises bolt on *after* a trust failure. The one place the article's language applies almost
literally is auth: it's a deliberate, well-documented stopgap, but it's still the stopgap. Two
concrete follow-ups worth queuing:

1. **Time the Clerk migration to land *before* client #2's onboarding starts**, not after — the
   article's core point is that retrofitting governance after adoption spreads is the expensive path,
   and per-user auth is exactly the kind of thing CST already knows it'll need.
2. **Add a minimal write-action log** (who, what, when — even a flat file or a Cloudinary context
   field) to the `_write-guard.js` path before client #2, closing the visibility gap while the
   surface area is still small enough that it's a cheap add.

Neither is urgent at one tenant. Both get expensive to add later if they're not planned now — which
is the article's whole argument.
