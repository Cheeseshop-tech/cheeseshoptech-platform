# Handoff — Apex sign-in page ("Cheese Merchant Business Tools")

Status: **built and verified, NOT committed.** Nothing has shipped for this thread yet.
Companion doc: `docs/HANDOFF_2026-08-13_quote-builder.md` (a separate, already-shipped thread).

---

## 1. What this is

`cheeseshoptech.com` (the bare apex — no `?client=`, no `?app=1`) currently serves `ComingSoon`,
a text-only "launching soon" marketing placeholder with a quiet "Sign in" link. Rick's call
(2026-08-21): make the apex **the sign-in page itself** — "CheeseShop TECH · Cheese Merchant
Business Tools", one simple door, no marketing copy. Two Media Hub photos he picked (alpine
pasture, aged wedge) as the visual.

**"Business Tools" not "Marketing Tools"** — Rick asked which; my call, his to overrule. Behind
that login sit pricing, quoting, inventory, orders, CRM and catalog alongside content/campaign
tools — "marketing" undersells about two-thirds of it.

## 2. Where the code is (all built, none of it pushed)

| File | State | What it does |
|---|---|---|
| `src/components/marketing/sign-in-page.jsx` | **new, untracked** | The page itself. |
| `src/components/auth/login-screen.jsx` | **modified, uncommitted** | Extracted the form into `LoginForm` so the new page reuses the live Identity form — one login in the app, not two. `LoginScreen` (used by every tenant portal) renders `LoginForm` in the exact same markup as before; behavior unchanged. |
| `src/App.jsx` | **modified, uncommitted** | Swapped `<ComingSoon />` → `<SignInPage brand={resolved.brand} />` at the apex branch. `ComingSoon` and the invite-only `LandingPage` (`marketing/landing-page.jsx`) are untouched and still on disk — the comment at the swap site says how to revert. |
| `docs/BUILD_LOG.md` | **modified, uncommitted** | Has the full write-up already drafted (search `## 2026-08-21 — The apex is now the sign-in page`). |
| `COMMIT SIGN IN PAGE.command` | **new, untracked, ready to run** | Stages exactly the four files above, nothing else. Pauses for a keypress first — it changes the public apex. |

**To ship it: double-click `COMMIT SIGN IN PAGE.command`.** That is the entire remaining step for
this thread. Everything below is context, not a to-do.

## 3. Why it looked broken twice this session — read before touching it again

Both times Rick said "images aren't loading," the page in question was not this one:

1. **First time**: he was on `npm run dev` with the dev-auth bypass on, which signs in
   automatically and redirects straight past any sign-in page — you never see it locally under
   normal `npm run dev`. To actually view it locally:
   ```
   VITE_DEV_BYPASS_AUTH=false VITE_CLOUDINARY_CLOUD=sofcvmwa npm run dev
   ```
   Both env vars matter: the first stops the auto-redirect, the second stops the images looking
   broken because local dev otherwise falls back to Cloudinary's public `demo` cloud (see §5).

2. **Second time**: he was looking at `?client=montitrentini` — a **tenant** portal login
   (green Monti-branded screen, "Powered by CheeseShop TECH"). That's `LoginScreen`, unrelated to
   this page, and it has never had photos by design — it only ever shows the tenant's own
   logo/name. This page **only renders at the bare apex.** Not `?client=…`, not `?app=1`,
   not `?page=…` — literally `cheeseshoptech.com` with nothing after it.

**Lesson for whoever continues this**: before diagnosing an "images not showing" report, first ask
which URL was actually open. Two different pages in this app can look similar and are easy to
confuse from a screenshot alone.

## 4. What was actually verified before any of this was reported working

Not just "it built" — the exact bytes Netlify will serve were checked:

```
VITE_CLOUDINARY_CLOUD=sofcvmwa npx vite build   # production build, real cloud baked in
npx vite preview --port 5182                    # serve that exact build
```
Then in-browser, both `<img>` elements were checked for `naturalWidth > 0`:
```
loaded: true   1597x1200   sofcvmwa/…/fhncmwwacwz2treydvbt   (pasture)
loaded: true    658x878    sofcvmwa/…/qbgjjdrlzpvfdyspzbjh   (wedge)
```
So the production path is proven. What is **not** yet proven is the live Netlify deploy itself —
that only happens once the commit script runs.

## 5. Known caveats — not bugs, just things to know

- **Image ids are pinned as a literal const in `sign-in-page.jsx`**, not resolved via
  `brandAssetUrl()` (the Media Hub resolver — see `lib/images.js` and the memory
  `media-hub-resolves-brand-assets`). That resolver reads a *tenant* manifest; the apex is house
  (no tenant), so there's nothing to resolve against yet. If a house-level manifest gets built
  later, move these two ids into it and swap the const for a resolver call.
- **The pasture photo has two carousel-slide dots baked into its bottom edge** (it was captured
  from a slideshow, not a clean export). Currently cropped out with a 6% CSS scale — cosmetic
  patch, not a real fix. The real fix is a clean re-crop of the source asset in Cloudinary/Media
  Hub. Public ID: `monti-trentini/library/fhncmwwacwz2treydvbt`.
- **`c_pad,b_white` (the `card` preset) will letterbox any photo in a white box** — this bit the
  wedge inset once already. Use `preview` (`c_limit`) + CSS `object-cover` for any crop where the
  photo should fill its frame, and reserve `card` for genuine white-background product shots.
- **Local dev only shows real images with `VITE_CLOUDINARY_CLOUD=sofcvmwa` set explicitly** —
  otherwise `cldImage()` falls back to Cloudinary's public `demo` cloud and every custom asset
  404s. A 404 in plain local dev proves nothing about whether an id is right; verify against
  `sofcvmwa` (curl, or the Cloudinary MCP tools, which are connected to the real account).

## 6. Untracked files that are NOT part of this thread — do not commit them here

Another session left work in progress in this same working tree:
```
?? "COMMIT LEARNING LOG SECURITY AUTH EXPLAINER.command"
?? docs/LEARNING_LOG.md
?? src/data/montitrentini/source/availability_2026-08-19.meta.json
```
`COMMIT SIGN IN PAGE.command` stages an explicit file list and will not touch these. Leave them
alone unless Rick asks about them specifically — they belong to a different thread.

## 7. First thing to do next session

1. Confirm with Rick whether to run `COMMIT SIGN IN PAGE.command` (if he hasn't already by the
   time this is read).
2. After it's live, load bare `cheeseshoptech.com` (not localhost, not `?client=`) and confirm
   both images render on the actual deploy — the verification in §4 was against a local preview
   server, not the real Netlify build/CDN path.
3. Ask Rick whether the wedge's visible Monti Trentini flag is a problem on an *agency* front
   door (flagged, not resolved, in the build log) — swap for a neutral production shot if so.
4. If a house-level Media Hub manifest gets built for other reasons, migrate the two pinned ids
   in `sign-in-page.jsx` onto it per §5.
