# Incident report — "Download PNG" returned HTTP 400

**Date:** 2026-07-25 · **Severity:** SEV-3 (feature broken, no data loss, workaround available)
**Surfaces:** Media Hub asset detail, Product Catalog item detail · **Client:** Monti Trentini
**Status:** Resolved — fix committed `8e04b43`, pending push/deploy
**Related:** [2026-07-24 — Deploy Preview published to production](#prior-incident)

## Summary

Clicking **Download PNG** in Media Hub or Product Catalog produced a blank browser error page —
`This page isn't working — HTTP ERROR 400` — on 31 of 386 assets. Every other download path kept
working. Cause was a missing size guard on the PNG download URL colliding with Cloudinary's
Free-plan 10MB cap on derived images. Fixed by capping the re-encode at 2400px. No data was lost
and nothing was deleted.

## Impact

| | |
|---|---|
| Assets affected | 31 of 386 (8%) |
| Surfaces affected | "Download PNG" button only |
| Unaffected | "Download original" and "View original" (386/386 passing), thumbnails, cards, previews, all page loads |
| Data at risk | None |
| Workaround during incident | "Download original" — works on every asset, returns the untouched master |

The failing set was not random: it was almost the entire flagship product line — every Asiago,
Grana, Stagionati and Family shot — plus four library photos. Practically, the assets most likely
to be downloaded were the ones that failed.

## Timeline

| Time | Event |
|---|---|
| 2026-05-25 / 06-15 | 31 masters bulk-loaded to Cloudinary at up to 6732×6732, bypassing the browser uploader's downscale |
| — | Latent. Nothing visibly wrong: the assets display, thumbnail and share correctly |
| 2026-07-25 | Rick reports downloads erroring in both Media Hub and Product Catalog |
| +5 min | 07-24 env-var recurrence ruled out — production deploy live, functions 200, credentials valid, plan at 10.28% |
| +15 min | Failure reproduced against the live Cloudinary endpoint; `x-cld-error` header identifies the size cap |
| +25 min | All 386 assets swept across all three download paths; blast radius established at 31 |
| +35 min | Rick identifies the upload size window as the real variable; confirmed against the shipped bundle |
| +50 min | Fix verified on all 32 failing URLs, committed `8e04b43` |

## Root cause

Both download buttons build a Cloudinary URL that force-converts to PNG with no size guard:

```
/image/upload/fl_attachment:{name},f_png/{publicId}.png
```

Cloudinary's Free plan rejects any **derived** image over 10,485,760 bytes. The browser upload path
has always pre-downscaled — `maxEdge: 2560, triggerBytes: 8_000_000, quality: 0.85` — so assets
that arrived that way re-encode to PNG well under the cap. The 31 failing assets arrived by bulk
load instead, at up to 6732×6732, and re-encode to 12–38MB.

Two things kept this hidden. The stored files look innocent — 1.7–2.7MB JPGs — because the blowup
only happens at PNG re-encode time, not at rest. And Cloudinary's 400 carries **an empty body**, so
the browser renders its own generic error page and the application never receives anything it can
log or surface.

**Contributing factor:** the size window existed only in the upload path. Nothing enforced it at
delivery, and nothing enforced it on the bulk-load path at all.

## Resolution

`c_limit,w_2400` added to both download URLs — `src/components/catalog/buyer-catalog.jsx:356` and
`src/components/media/media-hub.jsx:569` — each with an inline comment recording why, so the guard
isn't stripped by a later refactor.

Verified: 32/32 formerly-failing URLs return 200, largest output 7.4MB against the 10MB cap.
`c_limit` is a no-op below 2400px, so the 211 in-window assets are byte-for-byte unchanged.

**Rejected alternative — re-uploading the 31 masters through the 2560 downscaler.** It fixes only
those 31 and leaves the hole open for the next bulk load. More importantly those are
print-resolution product shots; the 2560 rule is a web-upload convenience, not an archival policy,
and applying it retroactively destroys resolution recoverable only by re-shooting. Guard at
delivery, keep masters at full size.

**Accepted trade-off:** "Download PNG" now returns 2400px rather than full resolution. That suits
its purpose — decks and social. Full-resolution needs are served by "Download original," which
returns the untouched master on all 386 assets.

## Latent risk closed

52 further assets exceed 2560px and were passing only by luck, sitting just under the cap. A
re-crop, a re-upload, or a slightly busier image would have pushed any of them over. The delivery
guard covers them; an upload-side-only fix would not have.

## Prevention

1. **Done —** delivery-side cap on both PNG download paths.
2. **Recommended —** apply the same `maxEdge` rule inside `sync-images.mjs` so bulk loads and
   browser uploads share one policy, rather than the browser path being the only place it exists.
3. **Recommended —** surface Cloudinary's `x-cld-error` header in the UI. An empty-bodied 400 that
   renders as a browser error page is invisible to both the user and the logs; reading that header
   and toasting it would have made this self-diagnosing.
4. **Consider —** the 10MB ceiling is a Free-plan limit. If full-resolution PNG delivery becomes a
   real requirement, that's a plan decision, not a code one.

## Prior incident

The day before, 2026-07-24, Media Hub images went blank because a **Deploy Preview** build was
manually published to production, where `CLOUDINARY_API_KEY` had no value. Different cause, same
surface. Closed by republishing the production deploy, setting the key to "same value in all deploy
contexts," and closing GitHub PR #1 so `phase-2-6-build` stops producing preview builds — which
removes the mis-click hazard structurally. Full detail in `docs/BUILD_LOG.md`.

Worth noting for pattern-spotting: two consecutive incidents on the same surface, both invisible to
application logging, both first reported by a human noticing something looked wrong. That is the
gap worth closing.
