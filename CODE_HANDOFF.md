# Handoff → Claude Code

**For:** Claude Code, picking up the CheeseShop TECH platform from a Cowork session. **Date:** 2026-06-06.
**Read also:** `HANDOFF.md` (full state), `docs/BUILD_LOG.md` (decision log), `docs/TOOL_ROUTING.md` is in the Best-Practice Manual.

## Project facts
- Repo: `github.com/cheeseshop-tech/cheeseshoptech-platform`, working branch **`phase-2-6-build`** (auto-deploys to Netlify site **cheeseshoptech-platform**, URL `https://cheeseshoptech-platform.netlify.app`).
- Stack: Vite + React 18 + Tailwind, Netlify Functions in `netlify/functions/`, Netlify Identity (gotrue) auth.
- Build check: `npm run build` and `npm run validate:clients` (both should pass).

## IMMEDIATE TASK — commit + push the pending media fix

Two files are edited in the working tree but **not committed** (a Cowork-sandbox `.git` lock blocked the commit):
- `config/clients/montitrentini.json` — `cloudinaryFolder` changed to `"monti-trentini"` (the real Cloudinary folder with 104 assets; was the empty `clients/montitrentini`).
- `netlify/functions/media-list.js` — default folder mapping changed to `"products"` so root assets show on the default tab.

Steps:
```bash
rm -f .git/HEAD.lock .git/index.lock   # clear any stray Cowork-sandbox locks first
git add -A
git commit -m "Point Monti media at monti-trentini folder; default products tab"
git push
```
This triggers a Netlify deploy. Confirm `git push` shows the new commit on `origin/phase-2-6-build`.

## Why it matters / what's already done (no action needed)
- The **real Cloudinary media backend** is built: `media-list` function (paginated Admin API, secret server-side) + browser upload via unsigned preset in `src/components/media/media-hub.jsx` / `src/lib/cloudinary.js`.
- **Netlify env vars are already set** (cloud `sofcvmwa`): `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `VITE_CLOUDINARY_CLOUD`, `VITE_CLOUDINARY_UPLOAD_PRESET=cstech_unsigned`, `VITE_MEDIA_BACKEND=cloudinary`. So once this commit deploys, the Media hub should list the real 104 Monti images (Products tab).

## Verify after deploy
- Visit `https://cheeseshoptech-platform.netlify.app/?client=montitrentini` (log in: admin `Rick.posada@outlook.com`), open **Media hub** → real images should load.
- Or hit the function directly: `curl "https://cheeseshoptech-platform.netlify.app/.netlify/functions/media-list?folder=monti-trentini"` → should return a JSON array of assets. If it 500s, check the three `CLOUDINARY_*` server env vars.

## After this: optional next code work
- Build the `crm` + (later) `store`/commerce Netlify functions to take CRM/Storefront off mock (see `docs/CRM_CONNECTOR.md`, `docs/STOREFRONT_STRATEGY.md` — headless rebuild is the locked strategy).
- Cosmetic: a stray empty Netlify env var named `Root` can be deleted in the dashboard.

## Always
- One change = one commit; log material decisions in `docs/BUILD_LOG.md`; end by updating `HANDOFF.md`.
- Secrets stay in Netlify env / your machine — never commit them (`.env` is gitignored).
