# Market News — auto-update wiring

**Status:** app side live-ready 2026-08-21 · **Read with:** `MARKET_INTELLIGENCE_SPEC.md` §2a
**Pattern:** identical to the inventory live-sync (routine → publish function → Netlify Blobs → app).

The Market News card is Tier 1 of the market nerve ending — the ambient morning read. It updates
**without an app rebuild**: an overnight routine publishes a brief into Netlify Blobs, and the app
reads it on the next page load.

The routine is **`daily-news-watch`**, a Cowork scheduled task at
`~/Documents/Claude/Scheduled/daily-news-watch/SKILL.md` (note: Cowork stores its tasks there, NOT
in `~/.claude/scheduled-tasks/`). It already ran daily as a four-topic chat digest for Rick;
2026-08-21 added Part 2, which publishes the buyer-facing slice to this card.

**Topic → category mapping** (in the routine): Cheese Business → `trade` · Supermarket/grocery →
`trade` · Marketing → `consumer` (consumer-demand items only) · **AI Strategy → not published** —
it stays in Rick's chat digest, since it would be noise on a client-facing card.

The routine **merges** rather than replaces: dedupes by URL, keeps 30 days / 40 items max, and
skips publishing entirely on a day that finds nothing rather than writing an empty file.

```
daily-news-watch (Cowork, daily)
   │  researches 4 topics → chat digest for Rick (unchanged)
   │  then merges the trade/consumer slice into market-news.json
   ▼
scripts/publish-market-news.mjs   (or publish_market_news.py — no Node in the Cowork runner)
   │  POST + x-publish-secret
   ▼
/.netlify/functions/market-news-publish   → validates → Netlify Blobs ("market-news"/<tenant>)
   ▼
/.netlify/functions/market-news           → app reads → MarketNewsCard shows "Updated today"
```

## The contract the routine must satisfy

Write a JSON **array** (not an object) to `src/data/<tenant>/market-news.json`, then run the
publish step. Every item:

```jsonc
{
  "id": "news-2026-08-21-01",   // required, unique across the array
  "category": "trade",          // required — exactly "trade" or "consumer"
  "headline": "…",              // required
  "summary": "…",               // optional, 1–2 lines (card clamps to 2)
  "url": "https://…",           // http(s) only — anything else is stripped on publish
  "source": "Cheese Market News",
  "date": "2026-08-21",         // required — YYYY-MM-DD exactly
  "tags": ["provenance", "fall-reset"]
}
```

Publish step (from the repo root):

```bash
python3 scripts/publish_market_news.py --tenant montitrentini
# or, where Node exists:
node scripts/publish-market-news.mjs --tenant montitrentini
```

Exit codes: `0` published · `1` bad input/credentials · `2` publish rejected.

## Guardrails (deliberate — do not "fix" by loosening)

- **An empty array is rejected (422).** A failed research run must never blank a good live brief.
  The card keeps showing yesterday's news, which is correct behaviour for a morning read.
- **Malformed items are rejected wholesale (422)** — bad category, bad date, duplicate ids. The
  routine should treat 422 as "halt and notify", exactly like the inventory routine treats its
  validation failure, rather than retrying.
- **Non-http(s) URLs are stripped, unknown keys dropped.** These rows are written by an automated
  researcher and rendered as `target="_blank"` links; the URL is the one field not taken on trust.
- **Max 200 items.**

## One-time setup (Rick — needs the Netlify dashboard)

1. **Netlify env:** `MARKETNEWS_PUBLISH_SECRET` = a long random string.
2. **Netlify env:** `VITE_MARKETNEWS_BACKEND` = `function` (this one is build-time — it needs a
   redeploy to take effect, unlike the news content itself).
3. **Local creds for the routine:** create `scripts/.market-news-publish.json` (gitignored):
   ```json
   { "url": "https://cheeseshoptech-platform.netlify.app/.netlify/functions/market-news-publish",
     "secret": "<same value as step 1>" }
   ```
   Mirrors `scripts/.inventory-publish.json`, so the unattended run authenticates without the
   secret living in the scheduled-task prompt.

Until all three are done the card correctly shows **Sample** — that chip is computed per fetch, so
it tells the truth about whether a brief has actually published rather than about a build flag.

## Verifying it ran

- **In the app:** the card's chip reads `Updated today` instead of `Sample`.
- **House Command Center → Integration Health → Market news:** `live` with an item count and date.
  **`reachable, empty` is the alarm state** — the seam is up but no brief has published, i.e. the
  routine has silently stopped.
- **From a terminal:**
  ```bash
  curl -s "https://cheeseshoptech-platform.netlify.app/.netlify/functions/market-news?tenant=montitrentini&cb=$RANDOM" | head -c 400
  ```
  (needs a portal auth header, same as the inventory read).
