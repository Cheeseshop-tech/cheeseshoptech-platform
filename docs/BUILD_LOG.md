# CheeseShop TECH — Build Log

A chronological, append-only record of decisions, actions, and their rationale.
Newest entries at the top. Each entry: **what changed, why, and what it unblocks.**

> Format convention: `## YYYY-MM-DD — Title` · **Decision / Action / Status** ·
> keep entries short and factual. This file is the project's memory.

## 2026-08-25 — Sign Composer: Owner mode — full type and copy control while authoring

**Action.** Rick: "lets make the acception for me the owner as I develop the templets and fine tune
the details… with the text editing."

**The contract I was enforcing was aimed at the wrong person.** `CHEESE_SIGNS_SPEC.md`'s Studio
Director rule — dropdowns over the record, no free typing, no type controls — exists so an
**operator** cannot put a typo or an off-brand face on a printed sign. It was never meant to bind
Rick while he is authoring the template, which is exactly when those controls are the work. So the
rule now has an explicit switch rather than being a blanket law.

**Owner mode**, a toggle in the header, **off by default**, persisted in `localStorage` so it
survives a reload. It widens what can be changed; it does **not** hide what changed, which is the
part that makes experimenting cheap rather than risky.

On, per text slot:

| Control | Range |
|---|---|
| Point size | free numeric, 2–72 pt, shown against the template's own default |
| Face | the **two Brand Kit faces only** — Cora/Fraunces, Futura PT |
| Bold / Italic | free |
| Ink | the **five Brand Kit inks only** — Forest Green, Italia Green, Mountain Ink, Stone Charcoal, Heritage Cream for reversed type |
| Copy | free typing, including fixed labels like "Minimum age" |

**The face and ink lists stay closed on purpose.** The switch is Rick's latitude on the template,
not a door out of the brand — an arbitrary font picker would make the sign family stop being a
family, which is the one thing the type system is holding together. Small/Medium/Large still
multiplies whatever point size is set, so the operator-facing scale keeps working on top of an
authored default.

Owner mode also lifts three frictions that only matter while authoring: the confirm before moving
brand furniture is skipped, `lock` blocks read green rather than red, and **shipped blocks become
resizable** — their slots scale proportionally with the block (offsets, sizes and type all scale by
the box ratio), rather than move-only.

**Everything hand-set is still declared in the export.** The header notes the file was authored in
owner mode, and each affected slot carries an inline comment — `COPY EDITED … differs from <binding>
in signs.json` and `TYPE SET BY HAND in owner mode — size/face/ink below are not the template's
defaults`. That is what lets the latitude be safe: whoever reads the export can see every place the
sign stopped being data-driven.

**Verification.** Switch off by default and persisting. With it off, zero owner panels render; on,
one per text slot. Face list is exactly `$display`/`$ui`, ink list exactly the five brand tokens.
Applied 22 pt / Futura / Italia Green / roman to the name slot and read it back through
`effFont()`; Small/Medium/Large still multiplied it (22 → 26.4 pt at Large); "Back to the template"
restored 13.5 pt Cora exactly. Both export markers present.

## 2026-08-25 — Sign Composer: one Edit button, tight image crop, S/M/L type, PNG export

**Action.** Rick, in one pass: replace the two buttons with an **Edit** button covering text and
image; crop images tight by default with a **size slider**; let copy be edited but **not the font**,
with size as a three-option dropdown; a **Delete from sign**; and **PNG** as an export.

**Copy editing versus the Studio Director contract.** `CHEESE_SIGNS_SPEC.md` says nothing on a sign
face is ever free-typed, and spec §9 says the composer never writes `signs.json`. Both still hold:
a copy edit is stored as a **per-cheese override** keyed by record id, marked `edited` in the
editor with a "Put the original back" button, and — the part that matters — **called out by name in
the JS export**, one comment line per drifted slot naming the record and the binding it no longer
matches. Rick gets to type; a sign that has wandered from its record cannot do so quietly. Editing
Fresco leaves the other three untouched, verified.

**Font is not editable, size is three steps.** Small / Medium / Large map to 0.85 / 1.0 / 1.2 of the
slot's declared size, applied through `effFont()` so overflow checks, `fit:"shrink"` and the export
all see the stepped value. No family, weight or colour control — a type scale, not a free numeric
field, or the family stops looking like a family.

**Tight crop had to be done client-side.** The obvious answer was Cloudinary `c_trim`, and it does
not work on this account: `c_trim` alone returns **400**, and combined into a transformation list it
is **silently dropped** — the returned image is byte-identical to the untrimmed one, which is the
failure mode worth knowing about, because it looks like success. So the content box is computed
from the alpha channel in a 160px offscreen canvas (`tightBox()`, cached per URL) and the image is
positioned so that box fills the slot. CORS is `access-control-allow-origin: *`, so reading pixels
is legal and the canvas is never tainted. The slider scales from that fitted size, 40–170%.

**PNG export, 300 DPI.** Canvas units are 100 to the inch, so scale 3 gives 300 DPI — a
2.5×3.5 talker lands at 750×1050. Drawn **slot by slot** onto a canvas rather than via
`foreignObject`, which is fragile about fonts and needs every image inlined as a data URI. Shapes,
wrapped and aligned text with `fit:"shrink"` honoured, the tricolore, icons rasterised from their
SVG source, Cloudinary images with `crossOrigin`, and the QR placeholder. Two buttons: this sign,
or all four in sequence.

**Verification.** Editor opens correctly for both kinds — the Name block gives two copy fields and
two size dropdowns, the Packshot block gives a live preview, a crop toggle and the slider. Size
steps measured at 15.94 / 18.75 / 22.5 pt. An override applied to Fresco left Stagionato unchanged
and reverted to the exact record value. PNG rendered 750×1050, `toDataURL` succeeded (canvas not
tainted), and the image was rendered back and inspected — full sign, cut-out packshot, badge
correctly hidden for a record without `mountainMark`.

**Still open.** The recognition cue renders empty because `recognitionCue` is not yet a field on the
records — handoff open item 3, unchanged. The QR remains a placeholder pattern in both preview and
PNG; a real encoder is still unbuilt.

## 2026-08-25 — Sign Composer: packshots and logo render cut out, not boxed in white

**Action.** Rick: "render pack shots with removed background and logo as well." The composer was
requesting `c_pad,b_white,…,f_auto,q_auto/<id>.jpg` — which pads a **white box** behind the image
and, because JPEG has no alpha channel, throws away any transparency the source already had. Signs
sit on Heritage Cream, so a white box reads as a printing defect rather than a photo.

**What the sources actually are** (checked, not assumed — fetched each candidate and read the alpha
channel):

| Asset | As requested before | Reality |
|---|---|---|
| MT oval logo | `.jpg`, mode P, alpha 255 everywhere — flattened | **already a PNG with real alpha**; it only needed us to stop flattening it |
| Asiago packshots | `.jpg`, RGB, no alpha | studio shots on **uniform white** — nothing to preserve, so they have to be cut |

**Chose `e_make_transparent` over `e_background_removal`.** Both return clean alpha on these
images. `e_make_transparent` is a **core transformation** — no paid add-on, no async
first-request behaviour where Cloudinary hands back the original while it processes — and uniform
white studio product shots are precisely its case. `e_background_removal` also works and is the
better tool the day a shot arrives on a non-uniform ground; noted in the code comment rather than
wired, so it is a one-word change.

Delivery is `.png`, not `f_auto` — `f_auto` negotiates a format per browser and can hand back one
without an alpha channel, which would silently reinstate the white box.

**Made it a switch, not a silent change.** "Cut the background out" sits under **Photos**, on by
default. When on, the packshot's own `bg: "$paper"` fill is suppressed too — otherwise cutting the
photo out just reveals a Casa Paper rectangle instead of a white one. Turning it off shows the
photo as stored, on the panel the shipped template actually asks for. The shipped templates declare
that `bg`, and that is a real design decision, so the tool shows both rather than overruling it.

**The export says so, because this is a preview-only fix.** The print path resolves its own URLs.
`src/lib/cloudinary.js` already carries a `transparent` option and a `PRESETS_TRANSPARENT` map, so
the app-side support exists — sign packshots simply have to ask for it. Until they do, **the
printed sign keeps the white box this preview no longer shows**, and the export header now states
that in full.

**One self-inflicted bug worth recording.** The first patch escaped a backtick as `\\\`` inside a
template literal, which closes the literal and threw `SyntaxError: Invalid or unexpected token` —
the whole script failed to parse, so the canvas rendered empty. Found it by reading the browser
console rather than guessing. Now syntax-checked with `node --check` against the extracted
`<script>` body before reload, which is a cheap step that would have caught it immediately.

**Verification.** Live in the browser: two images, zero broken, requesting
`c_fit,w_750,h_750,e_make_transparent:12/…png` and `c_fit,w_120,h_120/…png`. Inspected at 200% —
the wheel and wedge sit on Heritage Cream with clean edges and no halo, and the MT oval carries no
white plate.

## 2026-08-25 — Sign Composer: the four shipped templates loaded, UI put in Monti Trentini's voice

**Action.** Rick: "load the templates already built in to the Sign composer and brand this one to
monti trentini brand Voice."

**The shipped templates are now the real ones, not a re-creation.** My first pass shipped two
hand-authored case-sign presets that *approximated* `sign-3x4/short` and `/long`. They also
**collided by id** with the real templates, which meant the shipped ones were shadowed and had
never actually been tested. Both hand-made presets are deleted. In their place all four real
templates — 3x4 and 4x5, short and long — are extracted by **running `src/lib/sign-templates.js`
through node** (`design/sign-composer/dump-shipped.mjs`) rather than transcribed, so the geometry
is verbatim. Regenerate any time the source changes.

They load as **literal-slot blocks**: slots stored as offsets from their block's bounding box, so
dragging a block translates its slots and never rearranges what is inside it. That is the spec's
own rule — block internals are not draggable — and it is what keeps the family looking related.
Literal blocks move but do not resize, and offer no presentation switch, because they have none.

This is the **mapping layer** the spec names as the alternative to refactoring `sign-templates.js`
(build-order step 0, still not done). `rail()` splits into Origin + How to verify, `foot()` into
DOP + Provenance mark + QR, `wordmark()` becomes Company ID. Two new block groupings exist only
here: **Worth knowing** (the `unique` callout) and **Provenance mark** (tricolore + Product of
Italy).

**Loading the real templates immediately surfaced 16-20 flags each** — and the honest reading
matters more than the number:

- **`flavor` is a real overflow and font-independent.** `shortTemplate` gives it `h: 18 * s` with
  no `clamp` and no `fit`. The flavor lines run 80-95 characters at 7.4pt in a 266-unit column,
  which is two lines under any typeface; two lines need ~26 units against the 18 available. Worth
  checking on a proof — the real renderer may let it spill rather than clip, which would explain
  why it survived proofing.
- **The single-line label flags are probably artifacts.** `region_label`, `milk_type`,
  `min_age_label` sit in 9-unit boxes holding 5.6pt type. **Futura PT is not installed here** —
  the composer now detects this and says so — and the system sans standing in is wider than Futura,
  so they wrap in the preview and very likely do not on press.

Two changes came out of that. The overflow rule now only flags text that **actually wraps** past
its box; a single line overshooting its positioning box is typographic overshoot, not a defect, and
flagging it made every 9-unit label read as broken. And a **font-substitution caveat** is rendered
next to any count, naming the missing face and noting that a shipped, already-proofed template is
the stronger evidence. A number nobody can interpret is worse than no number.

**Brand.** Chrome moved off the generic dark editor palette onto the Brand Kit
(`src/data/montitrentini/brand-kit.json`): Heritage Cream ground, Casa Paper panels, Forest Green
header with an Italia Green rule, a deep forest stage so the cream signs read against it. Type
follows the kit's own rule — the display face is italic-only and **never sets a button or a nav
label** (`doNotUseFor: "Buttons and navigation labels"`), so Cora/Fraunces carries headings and the
UI family carries every control.

Copy rewritten to the voice's stated attributes — authentic, warm, rooted — and against its
`avoid` list, which names corporate jargon and cold, impersonal language. "No block selected"
became "Nothing picked yet"; "Series check" became "All four cheeses"; the Vecchio warning now
reads "Hold this one back on the Vecchio… those two numbers disagree" instead of citing an open
item number. The signs themselves are untouched — they were already the brand artifact.

**Verification.** All seven templates render; every one of the seven JS exports parses under node
with correct slot counts (24 for the talkers, 23 for each shipped template, matching source). Font
detection reports Fraunces present, Futura PT absent — which is why the caveat names only Futura.

## 2026-08-25 — Sign Composer built: block-based drag-and-drop layout editor

**Action.** Rick: "lets build the sign creator." Built
`design/sign-composer/sign-composer.html` against `docs/SIGN_COMPOSER_SPEC_2026-08-25.md` —
one standalone file, no build step, opens from `file://`. Covers build-order steps 1-5, 7 and 8:
static render, block drag/resize with snapping and safe-area guides, arrow-key nudge, undo/redo
(40 deep), the inspector sidebar, the series filmstrip, both exports, and all five presets
(talker G/H/I plus case-sign short/long at 3x4).

Ten semantic blocks — Name, Packshot, Flavor, Recognition cue, Origin, How to verify, DOP marks,
Company ID, QR, Description, plus the accent bar. Each declares its **presentations** (band / rail
/ stack / inline / quote), so switching G to H re-presents a block rather than repositioning it,
and a G/H hybrid is two dropdown choices rather than a fourth preset — which is what "keep all
layouts" was asking for. Content configuration survives a template switch; position does not, and
the confirm says so.

Every field control in the sidebar is a **dropdown over binding paths that exist on the record**,
never a text input — the Studio Director contract from `CHEESE_SIGNS_SPEC.md`. An empty binding
(`milk.treatment` on all four Asiagos) renders a labelled placeholder rather than collapsing
silently, so nobody lays out a composition around a field that vanishes at proof time.

**Decision — did NOT refactor `sign-templates.js` (spec build-order step 0).** The spec recommends
replacing `rail()`/`foot()`/`wordmark()` with semantic block builders. The composer instead carries
its own block layer and maps to the existing grammar on export. Reasons: spec §9 says no renderer
changes, and the refactor's blast radius is the 4 shipped templates plus 10 proofed case signs
needing a pixel-parity diff — a separate job with its own risk, not something to fold into building
the tool. Cost of the deferral is the one the spec names: the composer's vocabulary and the code's
vocabulary still disagree, so that mapping is maintained in one place until step 0 is done.

**The overflow detector earned its keep immediately** — it is the feature with the real value, and
it failed the first five presets I wrote. Fixes went into the block builders, not the presets, so
they cannot recur:

- `clamp` now **derives from box height** (`linesIn(h, pt)`) instead of being a hard-coded 2. A
  hard-coded clamp is wrong the moment a block is resized, which is the entire point of the tool.
- `fit: "shrink"` was declared in the grammar and **not honoured by the preview**. Implemented,
  with a 60% floor so a runaway string reports as overflow instead of shrinking to illegibility.
- Several builder boxes were one line-height short of their own type (rail region label at h 9
  against a 10-unit line; `brand_wordmark` likewise).

**A finding about shipped code, not just the presets.** `longTemplate`'s description box is
`h: 150 * s` at 7pt in a 266-unit column, guarded only by `maxChars: 900`. Asiago Stagionato
(786 chars) and Vecchio (787) are inside that guard and still overflow the box — maxChars is a
character count, not a height check, and they are different tests. The composer measures both.
**Caveat: measured with fallback font metrics** (Futura PT is not installed), so confirm against a
real render before treating it as certain. The composer's own Description block carries
`fit: "shrink"`, which is the cheap fix if it holds.

**Spec contradiction worth resolving.** §1's block table adds Packshot to the talker, reversing the
handoff — "we should include a pack shot. it seems there is enough room" — and the height budget
supports it. But §1's own consequence 1 then says "The talker has no Packshot block at all." Built
it **with** the packshot, per the explicit reversal and the arithmetic; the sentence in consequence
1 should be struck.

**Verification.** Exported JS parsed under Node: 24 slots, no duplicate ids, all geometry numeric,
`pad`/`inner` identifiers and `N * s` / `PT * s` expressions preserved. JSON export parses. All
five presets render clean across all four records — zero overflow. Cloudinary packshots and the MT
logo load from `file://` as expected (§6b-D: inline the JSON, fetch the images).

**Status.** Usable. Not built yet: the asset library (§6b — Icons tab reuses `sign-icons.js` and is
mostly wiring; Accents need drawing first) and a real QR encoder (placeholder pattern for now).
Blocks unchanged: the Vecchio DOP-floor contradiction still gates that block, and the sidebar warns
on it when a Vecchio record is selected.

## 2026-08-25 — Asiago provenance cards + DOP origin map, drawn from real boundary data

**Action.** Rick: "4 cards to support the asiago set focusing on authenticity and provenance and
origin... recreate the location map on one slide." Built
`design/asiago-shelf-talkers/asiago-provenance-cards-and-map.html` — a second theme on the
2.5" x 3.5" shelf-talker canvas, alongside the sensory-cue G/H/I round. Same no-photo decision,
built on layout G. Each card runs origin line -> verification -> shipped age against the DOP
floor. The verification block is the strongest content the booklet gave us: two independent
traceability marks (rind stamp, plus a casein stamp in the paste carrying the wheel's own ID
number), from booklet p.6-7. Plus a 16:9 origin slide that drops into a deck as-is.

**Decision — boundaries are data, not illustration.** The first pass hand-drew the province
polygons from estimated lat/long. It looked like blobs, and Rick's reaction ("omg what is that?")
was correct. Rick asked whether to move to Cowork and use Firefly. **We did not**, and the reason
generalizes: a generative image model produces something that *resembles* the region and is wrong
in detail. For a piece whose entire argument is "legally certified to come from exactly here," a
wrong border is the one error that invites the challenge we cannot answer.

Rebuilt from **official ISTAT province boundaries** (openpolis/geojson-italy), projected
equirectangular with a cos(lat) correction and simplified with Ramer-Douglas-Peucker at three
tolerances — slide, card mini-map, country inset. Generator archived at
`design/asiago-shelf-talkers/build-dop-zone-map.py` so the map is reproducible rather than a
one-off artifact. Trento + Vicenza render solid as the zone; Padova + Treviso hatched as partial;
**Bolzano deliberately left grey just outside the line, because that exclusion is the argument.**

Method captured as a project skill: `.claude/skills/accurate-maps/SKILL.md`. Adobe tools are right
for *finishing* a map — type, styling, print prep on accurate vector — not for deriving geometry.

**Verification.** Rendered headless and read back at each step. Contrast measured, not eyeballed:
14 text/ground pairs, all pass AA except accent-green-on-cream at **3.69** — which is also the
smallest type on the card (4.35pt), so it is the one real accessibility defect. Type converted to
print points: the scale runs 12.75pt (name) down to **3.82pt** (spec keys). For calibration the
house engine at 3x4" runs 6.7pt body / 4.6pt muted labels, which scaled to this canvas lands at
5.6pt / 3.8pt — so these sizes are not out of line with `sign-templates.js`, but the whole family
runs small and at talker scale the bottom crosses into "will not hold on press."

**Status.** Comp only — **nothing shipped**. Three items block print, on top of the handoff's
existing four:

1. **The Vecchio card cannot ship.** An authenticity-themed card is exactly where the open
   9-vs-10-month question bites hardest: the card argues the regulator guarantees this, while the
   consortium defines Vecchio as over 10 months. Its DOP-floor cell reads `see note` rather than
   print a number contradicting the regulator. Stefano's answer decides it. (Handoff open item #2.)
2. **Zone boundary needs the disciplinare.** `ASIAGO_DOP_CONSORTIUM_BOOKLET.md` describes the zone
   as "Trento, Vicenza, Belluno and part of Padova," but Belluno reads as outside on the booklet's
   own map and the disciplinare is generally cited as Vicenza + Trento plus parts of Padova and
   Treviso. Drawn as Trento + Vicenza solid with the rest hatched. The zone is defined at *comune*
   level and the same data source has comune boundaries — with the disciplinare's comune list this
   becomes exact instead of hatched.
3. **Make location is claimed only on card 2.** `signs.json` names Caseificio Finco / Enego for the
   Montagna record only; the other three claim the milkshed, not a dairy.

**Unblocks.** Rick picks a theme (sensory cue vs. provenance) and a layout, then
`talkerTemplate()` + `SIGN_SIZES` land per the handoff's build order. This theme needs two new
optional fields on the four Asiago records — `originLine` and `authenticityNote` — same pattern as
the proposed `recognitionCue`.

## 2026-08-17 — Project status panel added to the House Command Center (Agency Console)

**Action.** Rick asked to surface the daily-accountability status directly inside the app,
not only as an external status page. Added an admin-only "Project status" panel to the
Agency Console (`src/components/home/agency-console.jsx`) — the section that always renders
on the House/admin home hub, since `CommandCenter` itself is skipped for the house tenant
(no CRM). New data module `src/lib/project-status.js` mirrors `docs/PROJECT_ROADMAP.md`'s
four threads (status badge, progress bar, next action) — hand-maintained by design, not a
build-time markdown parse, since the roadmap doc is a running narrative log, not clean
structured data. Read-only, matches the v1 scope in `docs/PROGRESS_TAB_SPEC_2026-08-17.md`
(Agency Console/admin view first; client-scoped view once client #2 onboarding is underway).
Build verified clean (2051 modules). Commit script:
`COMMIT PROJECT STATUS PANEL AND ROADMAP UPDATE.command` (same script also carries the
roadmap doc's delivery-mechanism update — see the Daily accountability system entry above
in PROJECT_ROADMAP.md).

**Status.** VERIFIED LIVE, 2026-08-17 ~9:45pm. Pushed (commit `6446101`), Netlify
published deploy confirmed (36s build), and the panel itself confirmed rendering with real
data on `cheeseshoptech.com` (all four threads, correct status badges, next-action text,
on-the-radar callout) via a live Claude-in-Chrome check — not just a green Netlify deploy.

## 2026-08-17 — Security & Auth: real Netlify Identity now actually live; write/read functions being migrated off the old passcode guard

**Finding.** The "Identity has been live since June" belief recorded in earlier sessions was
wrong. `VITE_AUTH_MODE=passcode` was set at the Netlify **team** level (Team settings →
Environment variables) — a separate dashboard page from the project-level one, invisible from it,
that silently overrides every build. Checking only the project-level page for months missed it.
`PasscodeGate`, not `RequireAuth`, was the real, live gate the entire time.

**Fixed today.** Deleted `PORTAL_PASSCODE` / `PORTAL_HOUSE_PASSCODE` / `PORTAL_ADMIN_PASSCODE` /
`PORTAL_ADMIN_PASSCODE_MONTITRENTINI` / `VITE_AUTH_MODE` at BOTH the project and team level,
redeployed, and verified live against the rendered app (not just the dashboard) —
`admin.cheeseshoptech.com` now shows the real email+password Sign In screen. New guardrail added
to `CLAUDE_CODE_BRIEF.md` (#8): env vars exist at two separate layers, check both; and don't trust
the dashboard alone — verify live, because its own SPA can serve a stale cached view mid-session.
Stefano Viero invited as a real Identity user (`client / tenant:montitrentini`).

**New problem this surfaced (in progress).** Every Netlify Function that reads or writes real data
(Media Hub, Items, CRM snapshot, Login log, Inventory, History, Campaigns, Quotes, Presentations)
was guarded ONLY by the old shared passcode header (`_write-guard.js`'s `requireWriteAuth` /
`requireReadAuth`) — never by real Identity. The client's `writeAuthHeader()` only ever sent that
passcode header in passcode mode; now that real Identity is live and the passcode is deleted,
EVERY one of those ~19 functions 401s for everyone, Rick included. Confirmed live via the Agency
Console's own Integration Health panel: "HubSpot CRM: re-enter passcode" — except there's no
passcode left to re-enter. `identityAuthHeader()` (an Identity bearer-token helper) already
existed in `src/lib/auth.js`, half-wired — only `card-scan.js`/`card-ocr.js` used the
dual-credential pattern it was built for. This closes the same gap everywhere else, following that
exact precedent. Full detail + exact resume point: `docs/HANDOFF_2026-08-17_identity-write-guard-fix.md`.

**Status: IN PROGRESS**, not yet deployed/verified live. Also surfaced along the way: Rick's own
real Identity account (`Rick.posada@outlook.com`, created Jun 6) had never had a password
confirmed — passcode mode was the only thing actually in use for two months, so this was the
first real login attempt against it ever. Password reset sent; login not yet confirmed as of this
entry.

---

## 2026-08-14 — Error tracking + performance monitoring (Sentry), env-gated

**Why.** An app-health audit run this session (`docs/APP_HEALTH_AND_ROADMAP_2026-08-14.md`) found
the biggest gap wasn't a missing feature — it was that the platform had zero error/perf monitoring.
Every incident on record (2026-07-24 blank images, 2026-07-25 PNG 400s, 2026-08-13 silently-404ing
logo) was caught by Rick noticing something looked wrong, never by the app. Rick's call (asked via
two questions): Sentry free tier over building in-house, covering both the browser AND all 25
Netlify Functions.

**Shipped.** `src/lib/monitoring.js` + `src/components/error-boundary.jsx` — a React error boundary
now wraps the whole app (`main.jsx`); a render crash shows a branded "reload" screen and reports it,
instead of a blank white page. The Sentry SDK is dynamically imported, so a session without a DSN
pays zero bundle cost. `netlify/functions/_sentry.js` + a `withMonitoring()` wrapper applied to all
25 function handlers — catches uncaught exceptions AND any function that returns a 5xx it handled
gracefully (the exact class of failure that was invisible before), with a >3s slow-response flag as
a first perf signal. Explicit `Sentry.flush()` before every function return, since Netlify Functions
can freeze the process the instant a response goes out — an un-flushed capture is a silently
dropped one.

**Env-gated, same pattern as CRM/Shopify/Campaigns.** `VITE_SENTRY_DSN` (browser) + `SENTRY_DSN`
(functions) are both unset today — zero behavior change, zero cost, everything runs exactly as
before until Rick creates the free Sentry account and sets them in Netlify. Steps in
`docs/APP_HEALTH_AND_ROADMAP_2026-08-14.md` §6 and `docs/ENV_VARS.md`.

**Mechanical note for future reference.** Wrapping 25 function files was scripted (regex rename the
internal `handler` declaration, insert the import, append the wrapped export) rather than done by
hand — first pass caused an `Identifier 'handler' has already been declared` syntax error across
every file (the wrapped export line also declares `const handler`, colliding with the original
declaration in the same module scope); fixed by renaming the internal one to `rawHandler`. Verified
with `node --check` on all 29 function files before calling it done.

---

## 2026-08-21 — Campaigns tab retitled "Campaign Management"; new-campaign form + tab added

**Action.** Rick: "the purpose here is to host campaign updates and details and manage call
outreach for enrichment. so this is campaign management lets title it that. lets add a template
form and tab for create a campaign." Two changes:

1. **Rename.** "Campaigns" → "Campaign Management" everywhere it's a page/nav title — the
   sidebar label (`src/App.jsx` `NAV`) and the page `h1` + subtitle
   (`src/components/campaigns/campaigns-page.jsx`). Left the pill sub-nav labels (Email
   Campaigns / Social Media / Enrichment Campaigns) and dashboard widget copy alone — those
   describe the campaigns themselves, not the page.

2. **New campaign write path + form.** Campaign DEFINITIONS (name, type, goal, audience, etc.)
   had NO write path at all until today — they were either hardcoded `SEEDS` in
   `src/lib/campaigns.js` (mock mode) or a read-only Make webhook fetch
   (`netlify/functions/campaigns.js`). Only campaign STATE (status/checklist ticks/results) was
   ever writable, via `campaign-state.js`. Added:
   - `netlify/functions/campaign-defs.js` — new Netlify Function, same auth/Blobs pattern as
     `campaign-state.js` (`requireReadAuth`/`requireWriteAuth`, `logWrite`, `withMonitoring`,
     400KB cap). Shape deliberately differs from `campaign-state.js`'s "client sends the full
     document" convention: this store only ever grows one campaign at a time from a single form,
     so the server does a read-modify-write UPSERT keyed by campaign id instead of requiring the
     client to hold/resend the whole document.
   - `getCampaignDefs()` / `createCampaign()` / `slugify()` in `src/lib/campaigns.js`. `getCampaigns()`
     now merges the seeded/webhook set with these custom defs, so a UI-created campaign is
     indistinguishable from a seeded one everywhere downstream (pill nav, checklist, the
     `campaign-state.js` status overlay).
   - `src/components/campaigns/new-campaign-form.jsx` — the "template form": picking a campaign
     type shows a live preview of that type's checklist template (`CHECKLIST_TEMPLATES`) — task
     count and how many are required to reach "Ready to launch" — before the campaign is even
     created, since a new campaign's checklist is seeded from exactly that template. Fields:
     name, goal, type, channels, start/end, owner (defaults to the signed-in user), optional
     audience label/size, optional strategy summary, and — for enrichment campaigns only — which
     existing campaign this call pass "clears contacts for" (`serves`, feeds `scopeOf()`'s
     campaign-scoped call console).
   - Wired into `campaigns-page.jsx` as a literal new tab ("+ New campaign") alongside the
     existing type pills. On success the new campaign is folded into local state and opened
     straight into `CampaignDetail`, so Rick lands on its checklist immediately rather than
     hunting for the new card in the list.

Build verified clean (2052 modules). Commit script:
`COMMIT CAMPAIGN MANAGEMENT.command`.

**Status: awaiting push confirmation** (see also the still-unconfirmed push for the Integration
health tenant-fix commit `a8e71c5`, immediately below — this session's `git push` will carry
both).

---

## 2026-08-21 — Integration health: fixed which tenant the new Test buttons probe

**Found live-testing the panel just after it deployed** (clicking the new Test buttons for real,
signed in as admin, against the actual site — not just a clean build). Media showed
`LIVE — reachable (demo)` and Pricing data showed `REACHABLE, EMPTY — reachable, no data yet
(demo)`. Both genuinely reachable, but understated: `testClient = clients[0]` picked up Demo
Client, not Monti Trentini, because `listClients()` returns `Object.values(REGISTRY)` and
`"demo" < "montitrentini"` alphabetically. Demo has no real Cloudinary assets and no published
inventory of its own, so testing against it can never show the TRUE live status those two seams
actually have for the one real tenant.

**Fix.** `testClient` now explicitly skips `"demo"`/`"_template"` and picks the first real
client, falling back to `clients[0]` only if somehow none exist. Build verified clean (2051
modules) again after the change.

## 2026-08-21 — Integration health panel: real connectivity Test buttons, not just build flags

**Finding.** Rick asked to "wire live integration health status." The panel already looked like
it tested things — every seam had a green "live" or grey "mock" badge — but for 5 of 7 rows that
badge came ONLY from whether a build-time env flag (e.g. `VITE_STORE_BACKEND`) literally equaled
the string `"mock"`. A seam pointed at a dead token or a missing secret would still show green.
This is the same false-positive failure mode as the passcode gate's false-red alarm fixed
2026-08-17 (guardrail #7/#8) — just inverted (false green instead of false red). Two live-tested
rows already existed and were the right pattern to extend: "Auth (Identity)" (`pingGate`) and
"HubSpot CRM read-only" (`pingCrm`), both added 2026-07-18/08-17.

**Action.** Added a real `Test` button + probe for the 4 seams that have an actual backend
function: Media (Cloudinary, `media-list.js`), Pricing (`inventory.js`), Storefront
(`store.js`), Campaigns (`campaigns.js`) -- one shared `SEAM_PINGS` map + `SeamStatusBadge`
renderer in `agency-console.jsx` instead of copy-pasting pingCrm/pingGate's JSX four more times.
Each returns a normalized `{ok, reason?, detail?}` so the badge can distinguish live / not
configured / reachable-but-empty / not signed in / error, not just live-vs-mock. Market
signals and Market news have NO backend function at all yet -- there's nothing to probe -- so
their badge is unchanged (the static flag badge is already accurate there; a Test button that
always fails the same way would just be noise). Dropped the old static "CRM" row from the
generic SEAMS table entirely -- it was a build-flag badge sitting right next to the real,
live-tested HubSpot row and could in principle disagree with it; its one useful note ("Monti =
HubSpot; wire Make once deals exist") moved into the HubSpot row instead so nothing was lost.

**Found + fixed along the way.** `store.js` and `campaigns.js` had NO auth guard at all --
every other read function got `requireReadAuth` in the 2026-08-17 write-guard migration
(HANDOFF_2026-08-17_identity-write-guard-fix.md), but these two were missed. Harmless today
(Shopify/Make aren't configured, so every request 500s "not configured" regardless of who asks)
but would otherwise become live, completely open reads of real product/campaign data the moment
those secrets get set. Closed with the same guard used everywhere else. This is exactly the kind
of gap a real connectivity Test button is supposed to surface -- these got noticed *because* the
new Storefront/Campaigns pings needed a request shape to test against, not from a dedicated audit.

Build verified clean (2051 modules, `--emptyOutDir false` workaround as usual). Commit script:
`COMMIT INTEGRATION HEALTH LIVE STATUS.command`.

**Status.** Built and verified, NOT yet committed/pushed/live-tested. Live verification needs a
real signed-in session hitting each Test button against the deployed site (can be done via the
device bridge once pushed, the same way the Access log's identity row was confirmed).

## 2026-08-21 — Access log rewired to show WHO logged in, not just IP/tier

**Finding.** Rick asked the Access log (Agency Console -> "Access log" panel,
`netlify/functions/login-log.js`) to show names. It never could. Every row it has ever shown
came from exactly one call site, `gate.js` — the legacy shared-passcode gate — which logs
`{ ok, role, tenant }` because a shared secret has no individual identity behind it to record.
The portal has signed people in with real per-user Netlify Identity since 2026-08-17
([[cst-auth-upgrade]]), but nothing was ever added to log THAT login path, so since the passcode
->Identity switch the Access log has been silently frozen — recording nothing real.

**Action.** New function `netlify/functions/record-login.js`: POST-only, no request body. Auth
is just "does Netlify's own JWT verification say someone is signed in" — `context.clientContext
.user`, the exact same trust Netlify already extends to every write function (`_write-guard.js`).
Name/email/roles/tenant are read from that verified identity, never from anything the client
sends, so a signed-in user cannot claim to be someone else in this log. Called fire-and-forget
from `login()` in `src/lib/auth-context.jsx` right after a real sign-in succeeds — not a Netlify
Identity webhook/trigger, to stay in the same simple pattern the app's other audit logging
already uses (`_write-log.js`, `_login-log.js`). `_login-log.js`'s shared store now carries two
row shapes (passcode-era vs identity, documented in its header comment); `login-log.js` (the
reader) needed no changes. UI: `LoginLogTable` (`src/components/home/agency-console.jsx`) gets a
new "Who" column — name on top, email below, falling back to "shared passcode" for old
passcode-era rows that never had an individual behind them.

**Scope call.** This only ever logs successful Identity logins. A FAILED real-Identity attempt
(wrong password) has no verifiable "who" — GoTrue rejects it before any JWT exists — so there is
nothing trustworthy to attribute it to; the old passcode gate could log failed attempts because
the whole point there was testing a guess against a known secret. If Rick wants failed real
logins tracked too, that's a second, separate piece of work (would need a client-supplied,
UNVERIFIED "attempted email" clearly labeled as such, or a Netlify Identity `identity-login`
external-trigger function instead of this client-called approach).

Build verified clean (2051 modules, `--emptyOutDir false` to route around this sandbox's
long-standing can't-delete-a-synced-file quirk on `dist/.DS_Store` — same family as the
`.git/*.lock` trap, not a code problem; see `sandbox-git-lock-trap` memory). Commit script:
`COMMIT ACCESS LOG NAMES.command`.

**Status.** Built and verified, NOT yet committed/pushed/live-tested. Live verification needs an
actual Identity sign-in against the deployed site (sign out, sign back in, check the panel) —
can't be done from this sandbox since Identity login is real credentials, not something to
automate on Rick's behalf.

## 2026-08-21 — Locked per-line custom price on quotes + price-document provenance

Three follow-ons to the price-list work, drawing the line between *the official price* and *a
price you negotiated once*.

**Quotes: a locked custom-price field per line.** Rick: *"lets just lock the manual individual
price augmentation field so its safe and no accidental price change can go in."* Every line on the
sheet now ends with a **Custom** button; the price cell is plain text until you press it. Verified
in-browser: with three lines selected there are **zero editable price inputs** — unlock one and
exactly that row gains a field while the others stay locked. Toggling it back off drops the typed
number and restores the list price. The row shows "was $8.07" under the button so the departure
from list is visible while you're still looking at it. Works in all three arrangements (the promo
one edits the *regular* price and the promo recomputes off it).

**One-time by design.** The custom price lives in React state only — no localStorage, nothing sent
to the price store — so it dies on reload, sign-out, or leaving the tab. Confirmed by search: after
typing one, the only persistent trace anywhere is the issued-quote log, and a reload returns
0 selections / 0 unlocked fields. A number negotiated once must not quietly become next week's
price; that is what the Price List tab is for.

**But it IS recorded once it goes to a customer.** The quotes-issued log now carries `custom` and
`listPrice` per line, so the record reads "we quoted 20724 at $6.75 against an $8.07 list" —
verified end-to-end: the printed sheet showed $6.75 for the custom line and list prices for the
other two, and the log matched. Ephemeral in the UI, permanent in the record.

**Price List: a drag-and-drop source document, deliberately NOT parsed.** Drop the HQ price sheet
(xlsx/PDF/csv, 20 MB cap) onto the publish panel; it uploads to Cloudinary under the tenant's
`price-lists` folder and rides along as `sourceDoc` on the draft and then the published version, so
a published list can always be traced back to its paperwork. Rick chose attach-only over parsing:
the numbers stay hand-typed, so a misread cell can never move a price on its own. Attaching is
logged as its own `attach-source` event and is savable on its own (you can attach paperwork
without touching a price).

**The boundary, said out loud.** The two tabs are easy to confuse and the consequences differ
completely, so the Price List now states it: this is the official, published, permanent list — for
a one-off negotiated price use the Custom button in Quotes, which touches this list never.

## 2026-08-21 — The pricing tool is now the PRICE LIST OF RECORD (editable, published, audited)

Rick: *"I want to use this pricing tool as pricing truth that will be updated and published with an
effective date and valid-till date. I want an editable price field for each item and a save button
that records when and who updated the price and keeps a record."* New **Price List** tab, first in
Pricing & Inventory.

**What is edited: the FOB BASE COST** (Rick's call over per-tier prices) — `cost.fob` for
catch-weight bulk, `cost.fobCase` for exact-weight precuts. That is the one number the engine
derives from, so a single edit moves class-of-trade tiers, manual margin/markup and promo prices
together instead of three tier prices drifting apart.

**Two stages, deliberately** (Rick's call over save-goes-live). Save writes a private draft that
nobody can quote; Publish is a separate act that stamps the effective/valid-until window, bumps the
version, and goes live everywhere. Prices feed buyer-facing quote sheets that print without a
second look — a stray keystroke must not reach a customer. Verified in the UI: with unsaved edits
present, Save enables and **Publish stays disabled** until a draft exists.

**The overlay is the whole trick.** `applyPublishedPrices()` overlays the published FOB costs onto
`catalog.json` at the SINGLE read point (`use-pricing-data.js`), so Pro Forma, the Quote Builder,
proposals and the storefront all quote the new number without any of them knowing the price store
exists. catalog.json keeps shipping the spreadsheet-sync baseline and is never mutated — the table
shows "Bundled" vs "Published" side by side so the provenance of every number is visible.
Both fetches (inventory + prices) are now awaited together and applied in ONE `setData`: two
independent `setData(base)` calls would race and whichever landed second would drop the other.

**Audit trail** — `netlify/functions/prices.js` over Blobs store `prices`, three keys per tenant
(`<tenant>` published · `<tenant>--draft` · `<tenant>--log` append-only). One log row per changed
value with from/to, plus a row per publish with the version and window. **The "who" is read from
the verified Identity session server-side, never from the request body** — an audit trail the
caller can forge is not an audit trail. `from` is likewise computed from our own stored state;
`null` means there was no prior override and the value in play was the bundled catalog's.

**Writes are admin / client-admin only**, enforced by `requireWriteAuth` in the function. Confirmed
by test: a signed-in base rep gets **403** on write while reads still succeed — a rep can quote a
price but never change one. The UI hides the controls for them too, but hiding a button is not
security; the function is the gate.

**Tested** (both pure layers lifted out and run in Node): 15/15 on the overlay — including that the
original catalog object is never mutated, pack specs/names survive, and an empty overlay returns
the same object reference; and 15/15 on the price validator — negatives, zero, non-numeric and an
absurd 1e9 fat-finger are all rejected *and not stored*, with one bad value failing the whole save.

**Not yet exercised against real Blobs.** `npm run dev` doesn't serve Netlify Functions, so Save and
Publish have only been driven client-side; the handler was smoke-tested directly in Node (OPTIONS
204, unauthenticated 401, base-rep 403). First real write happens on the deploy.

## 2026-08-21 — The apex is now the sign-in page: "Cheese Merchant Business Tools"

`cheeseshoptech.com` served `ComingSoon` (marketing copy + a quiet "Sign in" link). Rick's call:
make the apex the **sign-in page itself** — one simple door, no marketing detail. New
`marketing/sign-in-page.jsx`; `ComingSoon` and the invite-only `LandingPage` both stay on disk for
a future marketing launch, and App.jsx says how to swap either back.

**Naming — "Business Tools", not "Marketing Tools"** (Rick asked which). Behind that login sit
pricing, quoting, inventory, orders, CRM and catalog alongside the content and campaign tools;
"marketing" describes about a third of it and undersells the rest. A cheese merchant signing in is
running a business, and it reads truer against CST's own sales-led positioning.

**One login, not two.** The form was extracted from `auth/login-screen.jsx` as `LoginForm` and the
new page renders that same live Identity component inside its own layout — there is one auth path
in this app. `LoginScreen` still renders it in exactly the markup it always did, so the
authenticated route is untouched. On success the page hands off to `?app=1`, the staff entry the
router already understands, rather than inventing a second way in.

**Imagery** — two Media Hub assets Rick picked: the alpine pasture as the full-height panel, the
aged wedge as an inset. House palette, deliberately: the scrim is a Terracotta-to-ink gradient, not
neutral black, so the agency's front door stays on its own colour rather than borrowing a client's
green. Two fixes worth remembering: the wedge first rendered letterboxed in a white box because the
`card` preset is `c_pad,b_white` — buyer-facing crops want `preview` (`c_limit`) plus CSS
`object-cover`; and the pasture source was captured from a carousel with two slide dots baked into
its bottom edge, held off with a 6% scale until the asset is re-cropped in the Media Hub.

**Note on the ids.** These are pinned in one named const rather than resolved by `brandAssetUrl()`,
because that resolver reads a TENANT manifest and the apex is house — no tenant, no manifest. They
were verified live against `sofcvmwa` and should move to a house manifest when one exists. Local
dev still falls back to Cloudinary's `demo` cloud, so the panel looks empty on `npm run dev` unless
`VITE_CLOUDINARY_CLOUD=sofcvmwa` is set — the production build already bakes the real cloud in.

## 2026-08-21 — Quote Builder: full-bleed letterhead, Net 15 terms, footer corrections

Against a real export (`New Customer Negotiation — Cowbell.pdf`), five changes from Rick.

**The white border and the "CheeseShop TECH reference" were the same bug.** The printed sheet set
`@page { margin: 0.4in }`, and that margin band is exactly where the browser draws its OWN header
and footer — on the export: the document title, `8/20/26, 4:02 PM`, **`https://cheeseshoptech.com/?client=montitrentini`**,
and "Page 1 of 1". The house URL on a buyer-facing quote was the browser, not our markup. Margin is
now `0`: no band, so the browser drops both, and the page inset moved into `body` padding
(`38px 44px 30px`), clear of the ~0.25in most printers physically cannot mark.

**The cream also stopped partway down the page** — `body` carried the background but its box is
only content-tall, so a short quote printed cream over the top ~80% and white below the contact
line. Fixed by putting the background on `html` as well: the root element's background propagates
to the page canvas, so the cream now fills the whole sheet, and every sheet on a multi-page quote.
Verified at true Letter pixel size (816×1056) with content 884px tall — the 172px that used to be
white is now cream.

**Payment terms Net 15, baked in** on all three purposes, under the date line in Mountain Ink
rather than the accent green (the date is the thing that expires; two green lines would flatten
that). Canonical at `config.pricing.paymentTerms`, not a literal in the component — a tenant with
no terms set simply prints no line. Slot added to the tenant template.

**Footer corrections:** `brand.contact.ordersEmail` → `Customerservice@montitrentini-USA.com`, and
brand-kit `attribution` "Imported by Monti Trentini USA" → **"from Monti Trentini"** — it reads as a
signature under the motto, not an importer-of-record statement. Note the attribution also surfaces
on the Proposal cover eyebrow and in Content Engine copy; changed at the kit so there is still one
source rather than a special case in this component.

**Caveat carried forward:** whether Chrome actually suppresses its header/footer depends on the
print dialog's Margins setting being Default (which honours `@page`). If a URL still appears on an
export, set Margins → None or untick "Headers and footers". That is a dialog setting CSS cannot
reach.

## 2026-08-13 — Quote Builder (one-page rate card) + quotes-issued log + Media Hub asset directive

Built to `docs/QUOTE_BUILDER_SPEC_2026-08-13.md`, reference `FreshDirect_PricingAOneSheet.pdf`.
Commits `2e603c1`, `61cc700`, `d2294a2`. Handoff: `docs/HANDOFF_2026-08-13_quote-builder.md`.

**What it is.** A fourth quoting surface: Pro Forma is the internal working order, Proposal is the
multi-page deck on a shareable link, this is the **one page you print or email as a PDF**. Header,
optional story panels, one pricing table, footer. Print-only for v1 — a trackable link stays the
Proposal engine's job. New `Quotes` tab in Pricing & Inventory; `quote-builder.jsx` kept out of
`pricing-tool.jsx` (already 57KB), which only gained the tab wiring.

**One engine, three arrangements** (purpose selector swaps columns, header framing, footer copy):
New Customer Negotiation (Item/Type/Format & Aging/SKU/price/net wt; story panels on, filtered to
the audience the tier implies) · Price Change Notification (Previous/New/Δ$/Δ%/effective date;
panels off; "Previous" auto-filled from the log) · Promo Offer (Regular/Promo/You Save; offer
window; order-level discount with a per-line override).

**Closes QUOTING_TOOL_PRINCIPLES §9's last "not captured yet" row.** Issued quotes now log to a
shared Blobs store (`netlify/functions/quotes.js` + `src/lib/quotes-log.js`), mirroring the
movement-history pair exactly. One record per SKU line, grouped by `quoteId`, written only on the
explicit Generate/Print action. It records `priceMode` + `pricePct` as well as `tierId`, because
once a typed margin can replace the tier preset `tierId` alone no longer explains a logged price —
and this log is what a later Price Change Notification quotes back to the customer. Remaining gap:
quote **approvals** (accepted/declined). The log accrues **forward only**; "no prior quote on file"
is the honest first answer for every customer, not a bug.

**DIRECTIVE (Rick) — brand assets resolve through the Media Hub, never a hand-typed Cloudinary id.**
A live bug forced this: `brand-kit.json` stored the logo as a folder-less id and
`wordmark`/`favicon`/`seal`/`hero` under a `monti/brand/*` folder **that does not exist in the
account**. All 404'd, so the Monti logo was silently missing from every surface that renders it —
including the buyer-facing Proposal cover — in production. The manifest had the right id
(`monti-trentini/library/tswf07fmciwdpp13facm`) all along. `brandAssetUrl()` in `lib/images.js` now
treats a kit reference as a *hint*, resolves it against the manifest (exact id → folder-less id →
basename → title), and returns a URL only once the manifest confirms the asset exists — `""`
otherwise, because a missing logo is visible and fixable and a broken `<img>` is neither. Delivery
is transparent-safe (these marks carry alpha; `c_pad,b_white` would box them in white on cream).
Fixed `primary` and `imagery.hero`; deliberately did NOT invent mappings for `wordmark`/`favicon`/
`seal` — they are not in the account under any name. Proposal view rewired to the same resolver.
Add an asset → re-run `sync-images.mjs` → it resolves, no code change.

**Palette is sampled, not eyeballed.** Rendered the reference PDF at 150 dpi and read the pixels.
Three first-pass errors: row banding was a green tint (the sample alternates Heritage Cream ↔ Casa
Paper), the divider bar and PDO badge used a washed accent (the sample uses **Alpine Mint
`#C8E2C5`**, already sitting unused in the kit's `secondary`), and the non-PDO badge was green (the
sample uses khaki `#EFE8D1` on bronze `#796A2E` so "Mountain" reads as *not* a PDO). All 13 surface
colours now match to ≤1/255 per channel. The hairline rule `#E3DEC7` and that khaki pair are NOT
kit tokens and are labelled as literals rather than faked out of the green palette.

**Pricing method — two dropdowns, class of trade + how the uplift is expressed.** The tiers are
preset uplifts on FOB (+0/+15/+35); this adds typing your own figure in either of the two ways the
trade quotes it, because they are different arithmetic: markup is `cost × (1+p)`, gross margin is
`cost ÷ (1−p)` — 25% on $8.07 is **$10.09** vs **$10.76**. Confusing them is how margin gets given
away, so they are separate options and a live worked example off a real SKU prints both readings
while choosing. **A manual figure replaces the tier preset rather than stacking** (stacking would
compound an uplift on an uplift); the tier still sets the audience line on the sheet. Margin guarded
to 0–99.9%; Print blocked while invalid. The picker list reprices with the method so what the rep
reads is what prints. Promo consequently changed from the additive `customPct` lever (a 10% promo on
a +15% tier printed 8.7% off) to a straight discount off the regular price — 10% now means 10%.

**Picker: the price list is open on arrival.** First pass was a search box that revealed nothing
until you typed — wrong instrument for "arrange the price list for this conversation," since a rep
builds a rate card by browsing what's for sale. All 106 SKUs now render in a scrollable window on
open; search *narrows* rather than summons, and is the same element as Pro Forma's (identical
placeholder, classes, position). Click adds, click again removes; added rows stay marked through a
filter; the search is not wiped on add.

**Also fixed:** `pricing-tool.jsx`'s hardcoded `TODAY = "2026-06-06"` (flagged 2026-07-28) — every
recorded sale was landing in that month's movement bucket and every printed proforma carried that
date. Now a real local-calendar date (timezone-offset before `toISOString`, so a US evening doesn't
roll into tomorrow). Added `brand.contact` to `client.config.json` + the tenant template so the
footer contact block is canonical rather than hardcoded in the component.

**Known gating issue for the next thread:** the sheet fits **~11 rows on page 1 against the
reference's 18**, and there is no page-break handling at all. Measured, not estimated — 40 SKUs
renders 2046px against 979px of Letter content. Two causes: story panels run 200px vs the
reference's 132px (we print the full brand-kit body at 61–70 words; the reference's copy was edited
to ~35–40), and 14 of 40 rows wrap `Format & Aging` to a second line on long `packing` strings.
Normal row height matches the reference exactly at 32px. Detail + order of attack in the handoff.

**Verified:** at the direct-retail tier the sheet reproduces the reference exactly ($9.07 / $9.28 /
$8.85 / $9.32 / $6.70 / $8.59 / $16.05 / $8.61). Previous-price lookup unit-tested across cutoff,
customer, SKU and unpriced-record boundaries. Netlify Functions don't run under plain `npm run dev`,
so `quotes.js` was smoke-tested in Node (OPTIONS 204, unauthenticated GET/POST 401) — first real
exercise is on the deploy. NOTE: the 2026-08-17 Identity migration (`32a9da6`) subsequently moved
`quotes.js` and `quotes-log.js` onto the real Netlify Identity guard, so the passcode-era testing
notes above no longer describe the live auth path.

## 2026-07-25 — Session close: both fixes live, inventory watch rewired, and a log-coverage gap found

**Live and verified.** `16827d8` pushed to `phase-2-6-build`. Live inventory now reports
`lastUpdated 2026-07-24`, `lastUpdatedSource drive-modifiedTime`, `sheetStatedUpdate 2026-07-28`,
111 SKUs — published via `publish-inventory.mjs` to Netlify Blobs, no rebuild. PNG downloads
verified on production earlier in the session.

**Scheduled task "Monti inventory watch" — instructions rewritten.** It now writes the Drive
sidecar at export time, compares against the previous sidecar's `driveModifiedTime` (exact drop
detection, instead of inferring change from a CSV filename), runs `--require-drive-meta`, treats
exit 4 as a deliberate stop rather than a crash, reports `lastUpdatedSource` so a silent regression
to the banner is visible in the morning report, and clears `.git/*.lock` around its commit. Run
time moved off the peak-hours window.

**The task was the source of the stale git locks.** It commits through the mounted folder every
run, the mount cannot unlink, so each run leaves `.git/*.lock` behind — and a leftover `HEAD.lock`
blocks the *next* git command with "Another git process seems to be running." The `index.lock`
dated 07-24 23:08 that was silently blocking writes at the start of this session was almost
certainly left by it. ~40 daily runs had been quietly littering `.git/`.

**Dry-run check at handoff:** Drive `modifiedTime` == the newest sidecar's `driveModifiedTime`, so
the next run correctly reports "No new drop" and stops. Note that this means the first run does
**not** exercise the new export path — that happens only when MT next touches the sheet. The thing
to check in that report is `lastUpdatedSource: drive-modifiedTime`.

**Log-coverage gap found (worth fixing as a habit, not just today).** This session wrote only to
`docs/BUILD_LOG.md`. The `Claude best Practice manual` folder — `LEARNING_LOG.md`,
`LIMITATIONS.md`, `OPEN_ITEMS.md`, `case_studies/` — was not connected to the session and so was
never consulted or updated, despite holding material this session directly bears on:
`LIMITATIONS.md` documents cross-boundary constraints (the mount's inability to unlink and
`device_bash`'s lack of network access both belong there), and `case_studies/` already contains
`2026-05-26_folder_mount_limit.md` on adjacent ground. **Connect both folders at the start of a
CheeseShop TECH session, not just the repo.**

**Repo hygiene:** `.gitignore` gaps closed (test*.png renders — 103MB dir, `.fuse_hidden*`,
`*.csv.b64`, inventory autosync backups, the local PUSH ALL helper). 148 orphaned `tmp_obj_*` files
and all stale locks cleared; `git gc --prune=now` repacked 3559 objects. `_to_delete/` holds 424K
of moved-aside junk for Rick to delete in Finder.

**Still open:** two corrupted product titles (`Asiago Stag03023 …lbsionato DOP`,
`Asiago Fresco PDM —…28-30 lbs`) · `inventory.NEW.json` is tracked but is the default `--out`
target for dry runs, so any review run clobbers it · ask MT who typed 28 July · from 07-24: re-run
`sync-images.mjs --live`, 41 images missing `bg-removed`, 78 assets with item# but no
product-catalog tag, 8 duplicate item-number pairs.

---

## 2026-07-25 — FIX: inventory "last updated" now comes from Google Drive, not a hand-typed cell

**What:** Rick, on the 2026-07-28 date shipped in `inventory.json`: "I think the date mix up is an
internal error. lets use the last updated notes in google sheets. the date that nots who and when
it was updated. sometime intermitten corrections or updates are made before the weekly up date."

**Confirmed via Drive.** The sheet — "Availability of items and pending orders", file
`1meZQQ_0dA1S1IR5xjVWzFvuqCJE6DLgVd-fOfSMGvCk`, owner `order@montitrentini-usa.com` — has a real
`modifiedTime` of **2026-07-24T15:53:09.134Z**. Row 1 of the exported CSV reads
`Updated on:,28 July 2026 11:52`. The banner is a typo, three days into the future, and it had
already shipped to the live buyer catalog. Secondary symptom: `agency-console.jsx` derives stock
age as `Date.now() - lastUpdated`, so a future date renders a **negative** age.

**Why the banner is the wrong source at all:** it's typed by hand on the weekly refresh. MT makes
intermittent corrections between weeklies, and those never move the cell. Drive's `modifiedTime`
catches them. The typo is the visible failure; the missed mid-week edits are the quiet one.

**Shipped:** `scripts/sync-inventory.mjs` now resolves `lastUpdated` from Drive's `modifiedTime`,
read from a sidecar written at export time — `source/availability_<date>.meta.json` carrying
`driveFileId`, `driveModifiedTime`, `sheetOwner`, `exportedAt`. The sidecar keeps the script
runnable offline with no Drive credentials; absent it, the script falls back to the banner and
says so. Output gains `lastUpdatedSource`, `sheetStatedUpdate`, `sheetModifiedAt`, `sheetFileId`,
`sheetOwner` — the banner is preserved as evidence rather than discarded. `schemaVersion` stays
**1.2** deliberately: `netlify/functions/inventory-publish.js:22` hard-checks that string.

**On divergence it warns loudly and continues** (Rick's call), naming both dates and flagging a
future banner explicitly:

```
!  SHEET BANNER DISAGREES WITH GOOGLE DRIVE
!    banner says : 2026-07-28   <-- IN THE FUTURE, almost certainly a typo
!    Drive says  : 2026-07-24   (2026-07-24T15:53:09.134Z)
```

**Verified:** re-ran against `availability_2026-07-25.csv` → 111 SKUs, 129 lots, 45 sellable-now,
`lastUpdated: 2026-07-24 (source: drive-modifiedTime)`. Diffed the regenerated `skus` tree against
the shipped one: **identical**. Only the header changed — no availability numbers moved.
`node --check` clean.

**Known limit:** this Drive connector exposes `modifiedTime` and the file **owner**, not
`lastModifyingUser`. "When" is exact; "who" is the sheet's owner, not the individual editor.
Closing that needs the Sheets revisions API.

**Also noticed:** `src/data/montitrentini/inventory.NEW.json` — a scratch output from June — is
committed to the repo. It's the default `--out` target for dry runs, so it gets clobbered by any
review run. Should be untracked and gitignored.

---

## 2026-07-25 — Deployed the PNG fix  ·  ⚠ SUPERSEDED: my "supplier's own stamp" call was WRONG

**Deployed.** `19f3cd5` pushed to `phase-2-6-build`; Netlify auto-published. Live bundle
`index-B-yom2GB.js` contains `c_limit,w_2400,f_png`. Production verified: `media-list` and
`items-get` 200, worst-case PNG download 7.38MB / 200, Asiago master 2.63MB / 200.

**⚠ SUPERSEDED — read the 2026-07-25 Drive entry above instead.** This entry originally
concluded that `"lastUpdated": "2026-07-28"` was "the supplier's own header, passed through
faithfully… that is fine." That reasoning was half right and the conclusion was wrong. The banner
*is* the sheet's own header — row 1 of `availability_2026-07-25.csv` reads
`Updated on:,28 July 2026 11:52` — but Rick identified it as an internal typo, and Google Drive
confirmed him: the sheet's real `modifiedTime` is `2026-07-24T15:53:09.134Z`. A hand-typed cell was
never a safe source of truth, and "it came from the supplier so it's correct" was the error in
reasoning: provenance is not accuracy. Left in place rather than rewritten, because a log that
quietly deletes its own wrong calls teaches nothing. The sync script itself was correct; only the
input choice was wrong. The availability swings (Caciotta Rustega 300 → 1740 cases; many `reserved`
→ 0) are real supplier data and did ship correctly in `19f3cd5`.

**Still worth confirming with the supplier:** the buyer catalog will display a "last updated" date
in the future. Either their sheet is forward-dated deliberately (availability effective the 28th)
or the header is mislabeled. Worth one question before a buyer asks it.

**Process note.** `19f3cd5` carries a junk commit message — a shell command pasted into the push
script's commit-message prompt. Left as-is deliberately: rewriting history on the branch Netlify
builds from is not worth a cosmetic gain. The script has since been changed to offer
push-only / commit-and-push / quit rather than assuming a dirty tree should be swept in.

---

## 2026-07-25 — FIX: "Download PNG" 400'd on 31 assets (Cloudinary Free 10MB derived cap)

**What:** Rick: "the media hub and product catalog are erroring at downloading." Chrome showed
its generic `This page isn't working — HTTP ERROR 400`, with no app-side error and nothing in the
logs. Initial suspicion was a repeat of the 07-24 Cloudinary env-var outage; ruled out first —
production deploy live, `media-list`/`items-get` 200 with the passcode, credentials valid, Free
plan at 10.28% of credits.

**Root cause:** Both "Download PNG" buttons force-convert to PNG with no size guard —
`fl_attachment:{name},f_png/{publicId}.png`. Cloudinary's Free plan refuses to deliver any
**derived** image over 10,485,760 bytes. The browser uploader has always downscaled on upload
(`maxEdge: 2560, triggerBytes: 8_000_000, quality: 0.85`), so anything that came in that way
re-encodes to PNG comfortably under the cap. The 31 failing assets never went through it: they
were bulk-loaded (sync-images / direct Cloudinary) at up to **6732×6732**, and re-encode to
12–38MB as PNG. Cloudinary answers `400` with `x-cld-error: File size too large` **and an empty
body**, which is exactly why the browser fell back to its own error page and the app never saw it.
Rick called the cause correctly before the code was read — the size window was real, the bulk
uploads just bypassed it.

**Measured across all 386 assets:** "Download PNG" failed on 31/386 — every one of them over the
2560 window (median long edge 6732px), all JPGs, all modified 2026-05-25 or 2026-06-15. The
working group's median long edge is exactly 2560px — the guard's fingerprint. "Download original"
and "View original" passed 386/386; thumbnails, cards and previews were never affected. A further
**52 assets exceed 2560px and were passing only by luck**, sitting just under the cap.

**Shipped (`8e04b43`):** `c_limit,w_2400` added to both download URLs —
`src/components/catalog/buyer-catalog.jsx:356` and `src/components/media/media-hub.jsx:569` —
with a comment at each site explaining the cap so it doesn't get stripped later.

**Verified:** all 32 formerly-failing URLs return 200, largest output 7.4MB against the 10MB cap.
`c_limit` is a no-op below 2400px, so the 211 in-window assets are byte-identical to before. The
52 borderline assets are now covered too.

**Decision — masters stay at full resolution.** Considered re-uploading the 31 bulk-loaded files
through the 2560 downscaler instead. Rejected: those are print-resolution product shots, the 2560
rule is a *web upload* convenience and not an archival policy, and downscaling masters destroys
resolution that can't be recovered without re-shooting. Guard at delivery, keep the masters big.
Cost accepted knowingly: "Download PNG" now yields 2400px, not full-res. Anyone needing the master
uses "Download original," which works on all 386 and returns the untouched file.

**Also found, not fixed:** two product titles have SKU/description text spliced into the middle of
the name — `Asiago Stag03023 Asiago Stagionato Dop · Whole Wheel, 17-19 lbsionato DOP` and
`Asiago Fresco PDM —Asiago Fresco Della Montagna · Whole Wheel, 28-30 lbs`. These flow into
download filenames. Separately, a `.git/index.lock` had been stale since 07-24 23:08, silently
blocking git writes.

---

## 2026-07-24 — INCIDENT: Media Hub images down — a Deploy Preview was published to production

**What:** Media Hub on `montitrentini.cheeseshoptech.com` showed asset names and tags but no
images; Items count 0; Product Catalog thumbnails blank. Logins kept working throughout.

**Root cause (from the Netlify audit log, not inferred):** at 2:22 PM the push of `48f8721` built
**two** deploys, because GitHub PR #1 was open against `phase-2-6-build` and every push also built
a "Deploy Preview #1." At 2:26 PM the audit log records a roll-forward — a manual **Publish deploy**
click on the *Deploy Preview* row, which sits **above** the Production row in the deploys list.
Preview builds run in the Deploy Previews env context, where `CLOUDINARY_API_KEY` had no value, so
`media-list` / `items-get` returned 500 "Cloudinary env vars not configured." Portal passcodes
existed in every context, which is why auth kept working and masked the shape of the failure. The
same roll-forward/roll-back pair appears on 07-18 at 1:26/1:40 PM — almost certainly the same
mis-click behind that day's "base passcode 401 / Netlify env issue" note.

**Fixed:** republished the Production deploy of `48f8721` (live check: 312 assets with thumbnails,
`media-list`/`items-get` 200) · `CLOUDINARY_API_KEY` set to "same value in all deploy contexts" ·
`ANTHROPIC_API_KEY` filled per-context in all 5 (the secret flag disables the same-value radio) ·
junk env var `Root` (0 values) deleted · **GitHub PR #1 closed**, so `phase-2-6-build` no longer
produces preview builds at all.

**Prevention:** with PR #1 closed the mis-click hazard is structurally gone, not just avoided —
and Netlify build minutes halve. Standing rule: **publish the Production row only, never a Deploy
Preview row.**

**Key facts for future sessions:** live passcode `IMBRIAGO2026` (resolves Client-Admin) · Media Hub
is a non-nav page for admin roles at `/?page=media` · Netlify site `cheeseshoptech-platform`,
production branch `phase-2-6-build`, auto-publish ON.

---

## 2026-07-19 — Feature: real layout variety (6 new hand-designed templates + guardrailed AI layout-swap)

**What:** Rick, after the earlier fixes this session: "The auto compose creates one deck the same
every time and polish only moves framing by a few pixels. I want a real ai design tool in the app
that uses the brand kit voice and design example for lay out and style... how do we get there and
what will it cost." Confirmed the critique was accurate, not a misunderstanding: `directDraft()`
always calls `slide("cover/v1", ...)`, `slide("product-feature/v1", ...)`, `slide("story/v1", ...)`
— one fixed template id per slide type, no variation — and `mergeDeck()` in `ai-compose.js` starts
every result slide from `{ t: sl?.t, ... }` with `t` copied straight through, never reassignable.
AI Polish genuinely never had the ability to touch layout, only slot values within fixed geometry.

**Decision (Rick):** true freeform generative layout (Claude inventing novel x/y/w/h positioning)
is a much larger rebuild — different rendering approach, materially higher per-deck API cost, more
risk of off-brand output. Rick chose the scoped path instead: real design variety comes from
hand-designed layout alternates built directly in a Cowork/Claude session (free, one-time, uses
the real brand kit) rather than generated live per-deck. AI Polish's job stays what it's good at —
selecting and arranging from real, pre-built options — never inventing one. Rick's framing:
"the agent... can just be the selector and the arranger" between hand-picking and asking it to
"arrange it verbally."

**What shipped:**
- `src/lib/slide-templates.js` — every template now carries a `family` (groups real alternates for
  the same slide type). Added 6 new hand-designed templates using Monti Trentini's real brand
  tokens: `cover/v2` (Split — color panel + logo/title left, full-bleed photo right, no scrim
  needed), `cover/v3` (Editorial — top-down scrim, centered upper-third title, cert-emblem badge),
  `product-feature/v2` (Cream Card — product in a rounded card left, copy right), `product-feature/v3`
  (Stacked — full-width photo band top, copy band bottom), `story/v2` (Mirrored — the photo/copy
  flip of v1), `story/v3` (Card — full-bleed photo with a floating cream copy card). Every variant
  in a family reuses v1's exact editable slot-id vocabulary (`hero_image`, `slide_title`,
  `topic_label`, `story_block`, etc.) by design, so any value already resolved for one variant drops
  into another with zero data loss. New `familyOf(id)` / `templateAlternates(id)` exports (return
  `null`/`[]` for an unknown or legacy plain-string slide, never a false-positive fallback).
- Slide Studio's existing "pick a template" grid and "switch this slide's template" dropdown
  (`slide-studio.jsx`, both plain `SLIDE_TEMPLATES.map()`) needed ZERO code changes — the 6 new
  layouts are live and hand-pickable the moment this file syncs. That's the "hand-pick" arm.
- `netlify/functions/ai-compose.js` — the "verbal arrange" arm. `briefSlide()` now exposes each
  slide's own `layoutOptions` (its real alternates only) to Claude. `RETURN_TOOL` gained an
  optional per-slide `layout` field. `mergeDeck()` accepts it ONLY if the id is one of that exact
  slide's own alternates, re-derived server-side from the ORIGINAL template id (never trusts the
  model's echo) — a cross-family id, an invented id, or a same-id "swap" are silently dropped, same
  "degrade to no-op" posture as every other guardrail in this file. New `SYSTEM_PROMPT` rule 10
  documents the boundary; response now also returns `appliedLayouts`.

**Verified:** two dry-run suites against the real modules in the real repo (real `node_modules`,
Anthropic call mocked) — 17 structural checks (every template has a family; canvas bounds; family
membership counts; slot-id vocabulary matches across variants; `familyOf`/`templateAlternates`
edge cases) + 14 end-to-end handler checks (a legit same-family swap applies alongside a normal
text edit; a cross-family id — even a real template elsewhere in the library — is rejected; an
invented id is rejected; a slide with no designed alternates can never be swapped; the pre-existing
text/image/instruction flow is unaffected when no `layout` field is sent at all). 31/31 passed.
`node --check` clean on both files.

**Honest scope note, told to Rick directly:** this is curated variety, not generative design — six
real hand-built layouts across three slide types today, chosen by a human (in this session) using
the brand kit, not invented per-deck by the model. Growing the library (more families, more
variants per family) is the same pattern repeated; freeform generative layout remains a
meaningfully larger, separate undertaking if ever wanted later.

## 2026-07-19 — Fix: AI Polish wasn't actually wired to Media Hub for most real decks

**What:** Rick: "its claiming to have processed a function like adding a photo and nothing
happens. I dont think its wired to media hub or the other brand attributes and brand voice."

**Root cause, confirmed:** `slots.__candidates` — the real, allowed image-id list Stage 2 may
pick from — was ONLY EVER populated by Stage 0 Auto-compose (`studio-director.js`'s
`directDraft()`). Any slide added the other way (clicking a template card instead of
"Auto-compose"), or any slot whose photo was later swapped by hand via the MediaPicker inspector
(`setSlot()` never touches `__candidates`), had either NO candidates or a stale/singleton list
(just the current photo). `ai-compose.js`'s `briefSlide()` then handed Claude a candidate list of
exactly one id — Claude had zero real alternatives, so `mergeDeck()` correctly (per the existing
"only from real candidates" guardrail) silently dropped any image edit it proposed. Claude's own
free-text `notes`, however, could still say something like "updated the hero photo" — hence
"claims to have processed... and nothing happens." This was a real, meaningful Media Hub wiring
gap for exactly the decks most people build by hand, not a misdiagnosis.

**Brand voice/attributes, checked and confirmed NOT broken:** `getBrandKit(resolved)?.voice` for
Monti Trentini is genuinely rich (`positioningHook`, `motto`, `mantra`, `heritage`, `mission`, 3
`coreValues`, 5 `attributes`, 5 `avoid` terms, 7 `readyPhrases`) and reaches `ai-compose.js`
correctly via `sanitizeVoice()` — confirmed by reading the actual bundled `brand-kit.json`. Text
tightening driven by that voice data does apply correctly (see the dry-run test below). The image
symptom above was almost certainly loud enough to make the whole feature *feel* disconnected.

**Fix:** new `netlify/functions/_media-candidates.js` — a lightweight, best-effort server-side
helper that fetches a representative pool of the tenant's live Cloudinary assets (one page per
folder, capped at 100) and scores them against a slot's `tag`, mirroring `studio-director.js`'s
`pickAsset()` scoring (tag match +4, approved +2, ≥2 threshold — "empty beats a wrong photo" still
holds) minus the SKU bonus. `ai-compose.js` now calls this — via a new `backfillImageCandidates()`
— for any image slot whose `__candidates` is missing or has fewer than 2 entries, BEFORE building
the brief sent to Claude, so every image slot gets a real chance regardless of how the slide/slot
was created. Slides that already have a rich candidate list from Stage 0/1 are left alone — no
wasted Cloudinary call. `slide-studio.jsx`'s `aiPolish()` now also sends `cloudinaryFolder` /
`cloudinaryLegacyFolders` (from `resolved`) so the function knows which tenant library to query.
Fully additive and fail-soft: on any failure (missing Cloudinary env vars, no folder sent, a
network hiccup) it silently no-ops back to the exact prior behavior — never blocks the request.

**Verified — two dry-run tests against the real modules (network mocked, all other code paths
real), 23/23 checks passed:**
- Regression suite (the 17 checks from the earlier custom-instruction fix) — still all pass, no
  behavior change for decks that already carry good candidates.
- New backfill-specific suite (6 checks): a manually-added slide with NO `__candidates` at all
  (exactly Rick's reported scenario) — confirms Cloudinary actually gets queried, the outbound
  Anthropic brief carries real candidate ids (not just the singleton current photo), and — the
  core fix — the image edit Claude proposes is now genuinely applied instead of silently dropped.
  Also confirms a slide with an already-rich candidate list skips the Cloudinary call entirely
  (no added latency for the common Auto-compose path).

**Verified:** `node --check` on both `.js` files; `esbuild` syntax-check on `slide-studio.jsx`.

---

## 2026-07-19 — Content Engine: AI Polish now takes an optional custom instruction

**What:** Rick asked "can we prompt the agent from Content Engine?" — until now AI Polish was a
fixed one-button pass with no way to steer it. Added a single deck-level "Optional — tell AI
Polish what to focus on" text box in Slide Studio's toolbar (e.g. "lean into the trade program" or
"make slide 3 punchier"). It's sent as `instruction` to `ai-compose.js`, capped at 400 chars.

**Guardrails held, not loosened:** this is explicitly GUIDANCE ONLY, layered on top of everything
already built (see the 2026-07-19 Stage 2 entry above). `SYSTEM_PROMPT` gained one new rule (#9)
telling Claude the instruction may steer tone/emphasis/order but never expands what it's allowed
to touch or invent — rules 1-3 (no invented facts, image picks only from each slot's own
`__candidates`, out-of-scope slots stay out of scope) still win. Nothing changed in `mergeDeck()` —
every returned field is still independently re-validated against the original deck server-side,
so even an adversarial instruction typed into the box can't get more out of the model than the
briefing already allows. `CONTENT_ENGINE_WIRING_SPEC.md`'s "Not a chatbot" framing still holds:
this is one bounded instruction per pass, not an open conversation.

**Verified:** `node --check` on `ai-compose.js`; `esbuild` syntax-check on `slide-studio.jsx`.

---

## 2026-07-19 — Fix: ai-compose.js 400'd on `temperature` — claude-sonnet-5 rejects it

**What:** Rick clicked "AI Polish" again (after the earlier 404 model-id fix) and got a new error:
`400 invalid_request_error: \`temperature\` is deprecated for this model.` The Anthropic Messages
API call in `netlify/functions/ai-compose.js` sent `temperature: 0.5` alongside the forced
`return_compose` tool call — `claude-sonnet-5` rejects that parameter outright. Removed it; the
call now runs at the model's own default with no other change.

**Why it happened:** same root cause as the 2026-07-19 model-id 404 earlier today — a parameter
picked from training-era API knowledge without checking it against the live model's current
accepted request shape. Two live failures from the same underlying habit in one session is the
signal to actually break it: **going forward, don't add ANY optional Anthropic API parameter
(temperature, top_p, top_k, etc.) to a hardcoded value without confirming it's still supported for
the exact model in use.** When a specific parameter is genuinely needed, check
platform.claude.com/docs for that model's current accepted fields first, or find out via a real
request instead of guessing.

**Verified:** `node --check` on the edited file.

---

## 2026-07-19 — Fix: Monti Trentini MediaPicker showed zero images (mock-data key mismatch)

**What:** Rick reported the Content Studio's variable-slot image dropdowns weren't offering any
images for Monti Trentini. Root cause: `src/lib/media.js`'s MOCK dataset (the fallback used when
`VITE_MEDIA_BACKEND` isn't set — the default on a plain `npm run dev` with no local `.env`, which
this machine doesn't have) was keyed `"clients/montitrentini"`, the OLD tenant-folder convention
(still correct for `config/clients/demo.json`'s `"clients/demo"`). Monti's own config was migrated
to the flat `"monti-trentini"` folder name at some point without updating this key, so
`listAssets()`'s `MOCK[tenantFolder] || []` silently fell through to an empty array for Monti
specifically — no error, no console output, just an empty picker. Changed the MOCK key to
`"monti-trentini"` to match `config/clients/montitrentini.json`'s real `cloudinaryFolder`.

**Also confirmed clean (not the cause, ruled out during investigation):**
- Cloudinary itself: `monti-trentini` (222 assets) and the legacy `monti` folder (70 assets) both
  have real, correctly-tagged images — confirmed live via the Cloudinary MCP connector. An earlier
  `folder:monti*` search returning 0 was a false alarm — Cloudinary's search API doesn't support
  wildcards on the `folder` field, so that query was invalid, not evidence of a missing folder.
- Netlify: `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` are all
  correctly set for the Production deploy context. `VITE_MEDIA_BACKEND` is also set for every
  deploy context including "Local development (Netlify CLI)" — but that only applies when running
  `netlify dev`, not a plain `npm run dev`.
- `netlify/functions/media-list.js` — the live function's logs show zero invocations at all on
  2026-07-19, confirming the browser never even reached the server when Rick saw the empty picker
  — consistent with local dev quietly running in mock mode rather than hitting the real backend.
- The passcode-mode role system (`auth.js` `rolesOf()` / `media.js` `visibleStatesFor()`) already
  handles `client-admin` correctly (it's injected as a superset of `client`), so it wasn't a
  role-visibility bug either.

**Why it happened:** the mock dataset was never updated when Monti's Cloudinary folder convention
changed from `clients/<id>` to a flat tenant folder — a naming-convention drift between a
dev-only fallback and the live tenant config that nothing catches automatically.

**Recommendation for Rick:** if you want the MediaPicker to show *real* Monti images while
developing locally (not just the mock samples), run `netlify dev` instead of `npm run dev` — it
pulls the real Netlify env vars (including `VITE_MEDIA_BACKEND=cloudinary`) and runs the actual
functions locally. Plain `npm run dev` can never reach `/.netlify/functions/media-list` (no
functions runtime), so it will always be mock mode regardless of this fix. Testing directly on
the live cheeseshoptech.com site also shows real images today — that path was never broken.

**Follow-up, same session — made mock mode visible instead of silent.** The reason this bug was
confusing is that mock mode gives ZERO indication it's active — it just looks like a broken/empty
Media Hub. Exported `IS_MOCK_MODE` + `MOCK_MODE_MSG` from `src/lib/media.js` and wired an amber
warning banner into both `MediaPicker` (inside the dropdown panel) and the main `MediaHub` page
(top of the page, always visible when mock mode is on) — text explains what's happening and how to
fix it (`netlify dev` instead of `npm run dev`, or use the live site). Next time this class of bug
happens (mock/live drift for a new tenant, or someone just forgets `netlify dev`), it'll be visibly
labeled instead of silently looking broken.

**Verified:** `node --check` on `media.js`; `esbuild` syntax-checked both edited `.jsx` files
(JSX-aware, since `node --check` can't parse JSX).

---

## 2026-07-19 — Fix: ai-compose.js model default 404'd on first live use

**What:** Rick clicked "AI Polish" and got `404 not_found_error: model: claude-3-5-sonnet-20241022`
back from the Claude API — the pinned snapshot ai-compose.js defaulted to isn't available on his
account. Changed the default to `claude-sonnet-5`. `ANTHROPIC_MODEL` env var override (already
built) still works if this ever needs to change again without a redeploy.

**Why it happened:** the model was picked from training-era knowledge of Anthropic's model catalog
without checking current availability first — a live-account check (or reading
platform.claude.com/docs before hardcoding a snapshot id) would have caught this before Rick had to
report the error back.

**Verified:** `node --check` on the edited file.

---

## 2026-07-19 — Content Engine Part C (Stage 2 AI pass) built: ai-compose.js + "AI Polish"

**What:** Built the Stage 2 AI pass per `CONTENT_ENGINE_WIRING_SPEC.md` §3 / `AI_TOOL_EMBED_SPEC.md`,
now that Rick's Anthropic billing + $25/mo spend cap + `ANTHROPIC_API_KEY` are live in Netlify
(see the same-day billing entry below). Three pieces:

1. `src/lib/studio-director.js` — additive: `pickAsset()` now also collects up to 5 qualifying
   candidate publicIds per image slot (score >= 2, same bar as the pick) into
   `slots.__candidates[slotId]`, same convention as `__off`/`__img`. Zero change to which asset
   Stage 0/1 actually picks — this only exposes real alternates for Stage 2 to choose from, so it
   never has to invent a photo id.
2. `netlify/functions/ai-compose.js` (new) — POST, `requireReadAuth` (any unlocked portal tier,
   matches the read bar on Media Hub browsing — this doesn't write to Cloudinary). Reduces the deck
   to only the fields Claude is allowed to see/edit (image-shaped keys, plain-string text, story
   `{headline,narrative}` blocks — `contact` and any `__`/`$`-prefixed key are never shown). Calls
   the Anthropic Messages API with a forced tool call (`return_compose`) for structured JSON, model
   `claude-3-5-sonnet-20241022` by default (overridable via `ANTHROPIC_MODEL` env var, no redeploy
   needed). Critically: every field in the model's response is **re-validated server-side against
   the original deck** before merging — an image edit only lands if it's a member of that slot's own
   `__candidates` list, a text edit only lands for a slot the briefing itself classified as editable.
   This means "never invent an image" and "never touch brand tokens/contact" hold even if the model
   doesn't follow instructions — defense in depth, not just prompting. Guardrails: 20-slide deck cap,
   24k-char briefing cap, `max_tokens: 2000`, 25s timeout, every call logged via `logWrite()`.
3. `src/components/presentations/slide-studio.jsx` — new "AI Polish" toolbar button next to
   Auto-compose. Sends the current deck + `getBrandKit(resolved)?.voice` + the opportunity to the
   function, merges the result back (applies the order suggestion if present), shows a one-line
   status message. Purely additive on top of Stage 0/1 — nothing about Auto-compose changed, this is
   an optional second pass.

**Why:** This is the last piece of the Studio Director pipeline described in
`CONTENT_ENGINE_WIRING_SPEC.md` §3 (Stage 0 deterministic -> Stage 1 rules of taste -> Stage 2 AI).
A1 (Content/Design Engine Agent) now ships with the AI pass included, per Rick's confirmed scope in
`AGENT_A1_BUILD_SPEC.md` §0 ("ship with Stage 2 included, not Stage 0/1 alone").

**What it unblocks:** `AGENT_A1_BUILD_SPEC.md` Part C is now fully built (was "unblocked, not yet
built" as of the billing entry earlier today). Part D (new CST platform visual direction) is next in
that spec's build order, not started.

**Verified:** `node --check` on `ai-compose.js` and `studio-director.js`; `npx vite build` (alternate
outDir, matching the established device_bash `.DS_Store`-deletion workaround) completed clean —
"1688 modules transformed... built in 4.58s" — with the new imports (`getBrandKit`, `writeAuthHeader`,
`RELOGIN_MSG`, `Sparkles`) resolving correctly in `slide-studio.jsx`.

---

---

## 2026-07-19 — Content Engine: Affineur's Note pattern (Part F, no AI)

**What (Rick: "pick up at the DESIGN AGENT and content ENGINE development... adding earlier
development foundational design direction to educate the design agent"):** ported one concrete,
self-contained pattern from the luxury DTC design research handed off earlier the same day
(`docs/HANDOFF_2026-07-19_luxury-dtc-design-research.md`) into the A1 Content Engine agent — La
Fromagerie's "affineur's note": a first-person expert tasting-note voice. Everything else in that
research (the Fortnum PDP layout, issue-based publishing, "follow," audio-everywhere, cheese
flights) stays open research, not touched.

**Built, all Stage 0/1 — no AI, no Anthropic billing dependency:**
- New slide template `affineurs-note/v1` (`src/lib/slide-templates.js`).
- `pickTastingNote()` + optional deck beat in `directDraft()` (`src/lib/studio-director.js`) —
  mirrors the existing `pickStory()` pattern; only fires when a kit's `tastingNotes` has content.
- `tastingNotesFor()` helper (`src/lib/brandKit.js`), SKU join per `DATA_OWNERSHIP_MAP.md`.
- "Tasting notes" editor card in Brand Management (`src/components/brand/brand-management.jsx`),
  same add/edit/remove UX as Story blocks.

**No content invented.** `tastingNotes` ships empty for every tenant — the new slide never
appears in any existing deck until someone actually writes a note via Brand Management. Doesn't
touch `DESIGN_SYSTEM.md` or any tenant brand tokens; Part D (CST's own new visual direction /
design-agent UI) is untouched and still gated on Rick.

**Detail:** `docs/AGENT_A1_BUILD_SPEC.md` §9 (Part F).

---

## 2026-07-18 — Product Catalog now loads alphabetically by product name

**What (Rick asked to load the Product Catalog alphabetically):** the Catalog's row order came
from `listItems()` in `src/lib/items.js`, sorted by item number/SKU — because that helper mirrors
the price & inventory sheet's own row order, which the Media Hub's Items tab (an admin editing
view) needs to keep matching.

Rather than change that shared helper (which would have silently re-sorted the admin Items tab
too), `buyer-catalog.jsx` now sorts its own `rows` alphabetically by product `name` right after
mapping them, case-insensitively (`localeCompare` with `sensitivity: "base"`). Category counts,
search filtering, and pagination all read from `rows` afterward, so they inherit the new order
for free — no other change needed.

**Verified:** fresh clone at the current commit, edited, `vite build` clean; identical edit
applied to the real repo, confirmed byte-identical (md5) to the verified copy.

---

## 2026-07-18 — Refresh button feedback + FIX: Access log city/state was always blank

**Refresh button (Rick asked: "animate on click and turn green to signify refreshed"):** the
Refresh button on the Access log panel now spins its icon while the request is in flight, then
flips to a solid green "Updated" state for ~1.4s once fresh data lands, before reverting to its
normal look. Doesn't fire on the initial page load — only on an actual click.

**Bug found answering "why are locations not showing up?" (Rick's guess was browser location
sharing — it's not that; this lookup is server-side, from the IP, never the browser):**
`callerIp()` (`_write-log.js`, shared by the write log and the login/geo log) returned the raw
`x-forwarded-for` header verbatim. That header is often a comma-separated PROXY CHAIN
(`client-ip, proxy1-ip, proxy2-ip`) rather than a single IP — confirmed live that ipwho.is
returns a flat 404 when handed a multi-IP string, which is exactly why city/region came back
blank for every single logged attempt, not just Rick's. Fixed: take only the first IP in the
chain (the client's own), which is the standard way to read this header.

**Verified:** fresh clone at the current commit, edited, `vite build` clean, then the identical
edits applied to the real repo and confirmed byte-identical (md5) to the verified copy.

---

## 2026-07-18 — Access log panel: scrollable 10-row window + full-screen expand

**What (Rick asked for a scrollable 10-login view with a full-screen toggle):** the Access log
panel in the Agency Console previously rendered a flat table of up to 25 rows with no scroll
container, growing the whole console page taller as more logins came in.

- Compact view now sits in a fixed-height (~10 rows) scrolling window — the panel's own footprint
  stays constant regardless of how many attempts are recorded.
- A new **Expand** button opens the same table in a near-full-screen dialog (95vw × 90vh) for
  scanning the entire recorded window (up to the server's 500-entry rolling cap) at once.
- Both views share one `LoginLogTable` render path so the compact and expanded table can never
  drift apart visually; the header row is sticky within whichever view is scrolling.
- Newest-first was already correct (`login-log.js` reverses the log before sending) — no backend
  change needed, just made explicit in the panel's description text.

**Verified:** a fresh clone at the current commit, edited, `vite build` clean; then the identical
edit applied to the real repo and confirmed byte-identical (md5) to the verified copy.

---

## 2026-07-18 — FIX: per-tenant manager passcode couldn't read or write Media Hub / Product Catalog data

**What (Rick reported "product catalog is not showing any images" right after the new Monti
Trentini manager passcode started working for login):** logged into the live portal and used the
browser's network tab to watch the actual failing request — `items-get?folder=monti-trentini`
was returning 401 even though the STRAVECCHIO2026 manager passcode had just unlocked the portal.

**Root cause.** Two different bugs, both dating to the 2026-07-16 read-guard rollout, only
surfaced today because this was the first time a tenant-specific (non-generic) admin passcode
was exercised end-to-end:

1. **Reads** (`items-get.js`, `media-list.js`) derived the tenant via `tenantFromPath(folder)`, a
   helper whose regex only matches a `clients/<slug>` style path. The real `folder` value passed
   by the frontend is a bare Cloudinary folder name (e.g. `monti-trentini`), which never matched
   — so `tenantFromPath` always returned nothing, and the per-tenant admin passcode
   (`PORTAL_ADMIN_PASSCODE_<TENANT>`) could never authenticate against either endpoint. Only the
   generic `PORTAL_ADMIN_PASSCODE`, the house passcode, or (for reads only) the base client
   passcode ever worked here.
2. **Writes** (`items-save.js`, `media-update.js`, `media-delete.js`) were worse — each called
   `requireWriteAuth(event)` with **no tenant argument at all**, so a per-tenant admin passcode
   could never save an item, edit a photo's tags, or delete an asset either, regardless of folder.

**Fix.** Matched the pattern already used correctly by `crm-summary.js`, `crm-hubspot.js`,
`inventory.js`, and `history.js`: an explicit `tenant` param (the tenant's config id/subdomain,
e.g. `montitrentini` — distinct from the Cloudinary folder, e.g. `monti-trentini`) sent by the
frontend on every call, read server-side instead of guessed from the folder/publicId path.

- `netlify/functions/items-get.js`, `media-list.js` — read `?tenant=` from the query string.
- `netlify/functions/items-save.js`, `media-update.js`, `media-delete.js` — read `tenant` from
  the POST body (body is now parsed before the auth check, since the tenant lives there).
- `src/lib/items.js` (`loadItems`, `saveItems`) and `src/lib/media.js` (`listAssets`,
  `listAssetsPage`, `updateAsset`, `deleteAsset`) — each takes an explicit `tenantId` param and
  sends it through.
- Every call site updated to pass `resolved.id` through: `buyer-catalog.jsx`, `use-items-doc.js`,
  `media-picker.jsx`, `studio-director.js`, `media-hub.jsx`, `items-panel.jsx`.

**Verified:** `node --check` on all five edited Netlify functions, and a full `vite build` of the
whole app, both clean.

**Still needed (not code):** the deployed `images.json` manifest for Monti Trentini was generated
2026-07-06, before today's dispatch-gate/`bg-removed` rules — re-run `sync-images.mjs --live`
once this fix is deployed so the Catalog reflects the current qualifying-image rules. Separately,
the base client/staff passcode (`PORTAL_PASSCODE` → `ASIAGOFRESCO2026`) is still returning 401 as
of this writing — that's a Netlify environment-variable issue, not something this fix touches;
still needs checking in the Netlify dashboard.

---

## 2026-07-18 — Login/IP tracking: the passcode gate is now logged, with a House Console view

**What (Rick asked "can I track logins from IP addresses?"):** answer was no — writes have been
logged with IP since 2026-07-06 (`_write-log.js`), but the actual login step (`gate.js`) recorded
nothing at all: no IP, no timestamp, not even success vs. failure. Built the missing half:

- `netlify/functions/_login-log.js` — same Netlify Blobs audit-log pattern as `_write-log.js`
  (capped rolling window, never blocks the request it's describing), its own `login-log` store.
- `gate.js` now calls it on every real attempt (both success and failure), recording IP, tenant,
  which passcode tier matched (or none), and result. The Agency Console's health-check ping
  (empty passcode, `pingGate()`) is deliberately excluded so the log isn't noise from every
  dashboard load.
- `netlify/functions/login-log.js` — house-admin-only read endpoint, mirrors `write-log.js`.
- Agency Console (`agency-console.jsx`) gained an **Access log** panel — last 25 login attempts,
  IP / location / tenant / tier / result, with a manual refresh. Same `RoleGate roles={["admin"]}`
  as the rest of the console, so no new auth surface.
- City/state lookup (Rick asked "can we see city or state"): `_login-log.js` now calls ipwho.is
  (free, no API key, HTTPS, 1,000 lookups/day) for each logged IP. Netlify's own geo data only
  exists on its newer Functions API, which none of this codebase's handlers use yet — this avoids
  migrating just one function's runtime style for one field. Adds a little latency to each real
  login (short 2.5s timeout, fails silently to blank city/state, never blocks the login itself);
  sends the visitor's IP to that third-party lookup service.

**Not yet built:** any alerting (e.g. "notify me on N failed attempts") — this is visibility only,
same scope as the existing write-action log.

---

## 2026-07-18 — Fixed a silent 401 in the live image scripts; ran the first validate:images report

**What:** `sync-images.mjs --live` and the new `validate-images.mjs` both called `media-list.js`
with no auth header. That endpoint has required an `x-portal-passcode` header on every read since
the 2026-07-16 wiring-audit P0 #1 fix (closing the "full asset list readable from a bare URL"
hole) — nothing updated these two callers when that landed, so both have been silently returning
401 for two days. Fixed: both now read `PORTAL_PASSCODE` from the environment and send it as
`x-portal-passcode`; both fail with a clear message (not a stack trace) if it's missing.

**First live validate:images run (312 assets scanned):**
- 41 qualifying images (item# + product-catalog tag + approved) — **all 41 still missing the
  `bg-removed` tag**, i.e. none are confirmed transparent yet.
- 78 assets carry an item number but no `product-catalog` tag — exactly the class of leak the
  2026-07-18 dispatch gate now blocks from reaching the manifest; worth a quick look to confirm
  none of these were meant to be product shots.
- 20 assets tagged `product-catalog` with no item number yet.
- 8 duplicate item-number pairs (mostly `monti-trentini/...` vs. the legacy `monti/...` copy of
  the same SKU) — needs a decision on which asset should own each code.
- 1 tagged+numbered asset still in draft (won't reach customers until approved).

**Not yet done:** actually applying the `bg-removed` tag to real assets, and resolving the 78/20/8
lists above — those are manual Cloudinary tagging decisions, not code.

---

## 2026-07-18 — Media Hub: tighten first paint to 12 tiles, 50 per "Load more"

**Decision:** Rick asked to speed up initial load further — cap the FIRST render at 12 images
instead of the 30 from the same-day pagination fix, then pull bigger batches (50) per "Load more"
click after that (fewer round trips once the hub is already up and interactive).

**Action:** `media-hub.jsx` — split the single `PAGE` constant into `INITIAL_PAGE = 12` (first
reveal, and the tab/search reset target) and `PAGE = 50` (every "Load more" after that). The
background fetch effect now passes `maxResults: 12` on its first `listAssetsPage()` call and
`maxResults: 50` on every call after, so the network page size tracks the reveal size — "Load
more" is never waiting on a fetch bigger than what it's about to show.

**Status:** `vite build` clean (1688 modules). Diff is 3 small edits in one file; nothing else
touched.

---

## 2026-07-18 — Image dispatch audit + Media Hub load-time fix (not yet committed as of writing)

**Decision:** audit whether Media Hub/Cloudinary is really the ONE dispatch source for every app,
and whether qualifying images (product tag + item number) are on a removed/transparent
background — Rick's ask, ahead of him tagging the rest of the catalog. Full findings:
`docs/IMAGE_DISPATCH_AUDIT_2026-07-18.md`. Two real, live-confirmed bugs, not hypothetical: a
lifestyle cow photo (`mucche-alpeggio`) carries the Alpeggio packshot's item number `20724` with
no product tag at all, and would win that SKU by manifest-order luck (same defect the 2026-07-09
Image Health report flagged — still live nine days later); and 59 of 70 assets in the legacy
`monti/<code>` folder carry zero tags/context, so `scripts/sync-images.mjs --live` never even
requested that folder (no `legacy=` param passed) — an entire shot-and-ready photo set was
invisible to the app regardless of tagging.

**Action (audit → fix, same session):**
- `scripts/sync-images.mjs` (both Admin API and `--live` modes) — the manifest now only assigns a
  SKU's `code`/`sku` when the asset ALSO carries the `product-catalog` tag AND is approved
  (`gatedCode()`). Closes the `20724`-class bug at the source for every future sync, in both
  modes. Also now reads `config/clients/<tenant>.json` `cloudinaryLegacyFolders` itself and loops
  those prefixes (previously only `netlify/functions/media-list.js`'s own full-mode loop knew
  about legacy folders — Admin API mode never fetched them, and `--live` mode never passed
  `legacy=` in its request).
- `scripts/validate-images.mjs` (new) — `npm run validate:images`. One-command report: qualifying
  count, missing-tag-but-has-SKU (the leak class), tagged-but-no-SKU, tagged+numbered-but-draft,
  duplicate SKUs. Report only — never writes to Cloudinary or images.json.
- **Background-removal path built, not yet used by any real asset.** `lib/cloudinary.js` gained
  transparent-safe `TRANSPARENT_TRANSFORMS` (same crop/size as `thumb`/`card`/`micro`, no forced
  `b_white` pad) selected via a new `cldImage({ transparent: true })` option.
  `netlify/functions/media-list.js` and `sync-images.mjs` now surface a `bgRemoved` boolean off a
  new `bg-removed` Cloudinary tag convention. `lib/images.js` `codeImageUrl()` and `lib/catalog.js`
  `cldThumb()` read the manifest record's `bgRemoved` and pass `transparent` through automatically
  — no call site in Proposals/Pricing/Catalog needed to change. Today every qualifying photo is
  still a flat JPG (confirmed live, zero false positives), so this has no visible effect yet; it
  activates the moment Rick tags a background-removed asset `bg-removed` and re-syncs.
- **Media Hub load-time fix** (Rick: "noticing longer and longer load times"). Root cause,
  confirmed in code: the Hub awaited the WHOLE tenant asset set (main folder + every legacy
  folder, each internally paged up to 500) before rendering a single tile — only gets slower as
  more assets get tagged (292+ today). `netlify/functions/media-list.js` gained an opt-in
  `paged=1` mode (cursor walks `main:<raw>` → `legacy:<idx>:<raw>` → done) alongside the untouched
  full-fetch path the other two callers (`MediaPicker`, Studio Director) still use.
  `lib/media.js` gained `listAssetsPage()`; `media-hub.jsx`'s fetch effect now pulls page 1 fast
  and streams the rest in behind it instead of blocking first paint on everything.

**Status:** `vite build` clean (1688 modules), `node --check` clean on every changed `.js`/`.mjs`.
Not committed yet — Rick reviewing the diff first. No data was changed or deleted in Cloudinary;
this is entirely app-side (2 new files, 7 modified, `package.json` +1 script).

---

## 2026-07-16 — Quote validity + price snapshot (wholesale Phase 1, audit P0 #5)

**Decision:** ship Phase 1 of `WHOLESALE_ORDERING_WORKFLOW_SPEC.md` — every quote carries a
**rep-specified valid-until date** and a **price snapshot taken at generation time**; a reopened
quote NEVER silently reprices. The date is deliberately **not defaulted** (no "+30 days"
pre-fill): the market is volatile and the rep judges validity per quote, per market conditions
(Rick, 2026-07-16). This also closes wiring-audit P0 #5 (proposal price-drift).

**Action:**
- `src/lib/proposals.js` — proposal record gains `validUntil` (rep-set date, empty by default)
  and `priceSnapshot` (`{ takenAt, basis, tierId, tierLabel, prices: { code: $/unit } }`). New
  `snapshotPrices()` freezes the then-current per-SKU quoted prices at share time; new
  `quoteStatus()` classifies a proposal as `legacy` / `quoted` / `expired` (valid THROUGH the
  stated date, local end-of-day). No backend needed: the proposal travels in the link, so the
  snapshot travels with it — no new write endpoint, no auth surface change.
- `proposal-builder.jsx` — a priced proposal (tier selected) shows a required "Quote valid
  until" date input; both Copy-share-link buttons are disabled (with hint) until it's set.
  `copyLink()` embeds the snapshot into the shared link. Unpriced proposals are unaffected.
- `proposal-view.jsx` (buyer-facing) — renders by `quoteStatus()`: while valid, the SNAPSHOT
  prices render (the quote holds even if the live price moved) with a "Quote valid until <date>"
  badge; after the date, a prominent "This quote expired on <date> — request updated pricing"
  notice renders and prices below it are clearly labeled today's current pricing, not the quote.
  Legacy links (no date/snapshot) render live prices exactly as before — no crash, no false
  "expired". Snapshot data lives in the proposal record itself, so none of this depends on the
  items.js fetch (pre-deploy-unlocked viewers and catalog-fallback names are safe).
- `pricing-tool.jsx` (Proforma tab) — required "Quote valid until" date input (empty by default);
  Print/PDF is disabled with a hint until set. The printed document is the quote record: it bakes
  in the per-SKU prices + basis/class-of-trade/custom % shown, displays the valid-until date in
  the meta block (beside Bill to / Basis / Class of trade) and replaces the old hardcoded "Quote
  valid 30 days." footer with "Quote valid until <date> — request updated pricing after this
  date."

**Status:** shipped. Live pricing math, catalog.json spec consumption, and the 2026-07-16
name-join fix untouched. Phase 2 (buyer email gate) next per the spec.

---

## 2026-07-16 — Read endpoints now require a passcode (wiring-audit P0 #1 + #3 closed)

**Decision:** close the audit's most serious finding — every data-returning Netlify function
answered a bare URL with tenant data (CRM companies/contacts/email activity, item docs, full
media list incl. drafts, live stock), and `history.js` accepted unauthenticated POSTs of sales
records. Same model as the proven 2026-07-06 write guard, with one difference: **reads accept
any valid passcode tier**, including the base client passcode (`PORTAL_PASSCODE`) — reps must be
able to read; writes stay admin/client-admin only.

**Action:**
- `_write-guard.js` — new `requireReadAuth(event, tenant)` beside `requireWriteAuth()`. Tiers
  mirror `gate.js` exactly: house → `admin`, per-tenant/generic admin → `client-admin`,
  `PORTAL_PASSCODE` → `client`. 401 via the existing `jsonUnauthorized()`.
- Guarded: `crm-hubspot.js`, `crm-summary.js`, `items-get.js`, `media-list.js`, `inventory.js`
  (guard after the OPTIONS branch; `x-portal-passcode` added to CORS allow-headers), and
  `history.js` GET **and** POST — the Proforma "Record sale" path is base-client-tier, so any
  tier passes. `history.js` POST now also calls `logWrite()` (once on auth failure, once on
  success) per the standing rule below.
- Deleted `netlify/functions/crm.js` (dead Make proxy, P0 #3). Its only reference was the dead
  fallback branch in `src/lib/crm.js`, removed in the same pass — non-mock CRM now always means
  `crm-hubspot`.
- Frontend: every read call replays the unlock passcode via the existing `writeAuthHeader()` —
  `media.js` (listAssets), `items.js` (loadItems), `pricing.js` (fetchInventory), `history.js`
  (GET + POST), `crm.js` (getCrmData), `crm-page.jsx` + `agency-console.jsx` (crm-summary ×3).
- Buyer-facing proposal links unaffected: `use-items-doc.js` already treats any loadItems failure
  (incl. 401) as null → catalog.json names render; no error UI, no retry loop.

**⚠️ Operator impact:** any browser that unlocked the portal BEFORE this deploy has no stashed
passcode to replay (same as the 2026-07-06 "edits not sticking" incident) — its reads will 401
until the user **signs out and re-enters the passcode**. The UI says so instead of showing empty
data: Media Hub toasts the re-login message, CRM page + Agency Console show a "sign in again /
re-enter passcode" badge. Silent-degrade surfaces (pricing tool inventory → bundled snapshot,
movement ledger → local records) keep working on last-known data until re-login.

**Status:** `node --check` clean on all changed functions; `vite build` clean. Deploy, then
sign out/in on every browser that was already unlocked.

---

## 2026-07-16 — Name-source drift fixed in Proposals + Pricing Tool (wiring-audit P1 #6)

**Decision:** apply the same items.js-preferred name join that `studio-director.js` got on
2026-07-15 (commit `b386bf9`) to the two remaining siblings that still read product names straight
off `catalog.json` — Proposals and the Pricing Tool. Canonical rule (2026-07-03): item identity +
copy live in `items.js` (Media Hub items.json); pricing/pack specs stay in `catalog.json`; joined
by SKU code.

**Action:**
- New `src/lib/use-items-doc.js` — small React hook that loads the tenant's items doc (async,
  same pattern as buyer-catalog/media-hub); returns `null` while loading or on failure so every
  consumer falls back to the catalog name and no surface ever blanks or blocks.
- `src/lib/proposals.js` — new `skuDisplayName(itemsDoc, product, sku)`; `flattenSkus()` /
  `resolveSkus()` take an optional `itemsDoc` and carry a resolved `name` per entry (items.js
  name wins, `catalog.json` `name` only for SKUs not yet in the items doc).
- `proposal-builder.jsx` + `proposal-view.jsx` — render the resolved `name`. proposal-view is
  buyer-facing: a failed/slow items fetch degrades to the catalog name, never an empty heading.
- `pricing-tool.jsx` — shared `productName()` join applied to all four tabs (Proforma rows +
  detail dialog, Shelf Life, Movement, Commitments). Pricing logic, pack specs, and all other
  `catalog.json` consumption untouched.

**Status:** built clean (`vite build`), `node --check` clean on changed libs. Edit a product name
in Media Hub's items panel and the Catalog, Proposals, and Pricing Tool now all show the same name.

---

## 2026-07-15 — Full wiring audit across CRM, Pricing/Forecast, Brand Kit, Media Hub

Rick asked for an audit of app-to-app wiring and the data-flow docs, with improvement suggestions.
Full report: `docs/WIRING_AUDIT_2026-07-15.md`. Method: read real code (imports, env-flag branches,
actual function callers) rather than trust the wiring docs, then diffed the two.

**Headline: the platform is wired better than its docs say.** CRM (HubSpot), Brand Kit/BSE gating,
and the BSE "Import kit JSON" button are all live and working — `INTEGRATION_WIRING_BRIEF.md`,
`CRM_CONNECTOR.md`, and `CONTENT_ENGINE_WIRING_SPEC.md` §4 all still describe these as mock/open.
Real gap found in Pricing/Forecast: `forecast-core.js` is genuine working infrastructure (wired into
Pricing Tool's Movement tab), but the only path from a real sale into it is a manual "Record sale"
click — no automated capture, so it's likely run on close to zero real volume so far.

**Mid-audit discovery:** the "open decision" from earlier today's HANDOFF (how to merge the new ERP
monthly data into forecasting) already had an answer — `sales-monthly.js` + `scripts/
build-sales-monthly.mjs` is an existing quality-gated seam built for exactly this. Between the start
and end of this audit, that pipeline ran against today's new ERP files (commits `b28aa64`, `7e18ce5`
— not this session's doing, presumably run directly by Rick), catching and fixing a units bug (2024
seed mislabeled USD, corrected to pounds). Gate is still closed (2.69% of broker volume) — correctly,
not an architecture problem, just insufficient 2024 coverage.

Nine improvement suggestions filed, prioritized P0 (doc/dead-code fixes, cheap) through P2. Full list
in the audit doc. No code changed by this pass — audit only.

**Correction from Rick, same day:** the Pricing/Forecast section's "reps might forget to click
Record Sale" framing was wrong. Forecasting is meant to run off **quarterly sales reports as a
batch tool**, not live order entry — the Proforma's "Record sale" button is strictly a rep
note-taking aid ("what did this customer order last time"), never the forecast's data source.
Audit doc corrected in place (struck the old suggestion, kept for the record); saved as a standing
memory (`cst-forecast-is-quarterly-batch-not-live`) so this isn't re-proposed later.

**Audit extended to Product Catalog / Proposal Engine / Pricing Tool** (§7 of the audit doc).
Catalog (`buyer-catalog.jsx`) is wired correctly to `items.js`. **Proposals and the Pricing tool are
not** — both still read `catalog.json`'s name field, the same bug `studio-director.js` had until
today's fix, just not applied here yet. Bigger finding: **proposal pricing is deliberately
always-live with no freeze** — a buyer reopening an old proposal link can see a silently different
price than what they were originally quoted, by design ("prices always quote live," per the code's
own comments). Real, not hypothetical, trust/dispute risk the day a price actually moves. Suggested
fix: snapshot the quoted price at send time, show a "price has changed since this was sent" badge
rather than swap silently. Also confirmed `catalog.json`'s per-SKU `image` field is fully dead
(zero references in `src/`) — third confirmed-dead duplicate field alongside name/blurb.

Suggestion list now 11 items (P0 4, P1 4, P2 3). No code changed — still audit only.

**Audit closed out — final domain: Auth/Roles, House Admin Console, tenant routing.** Subdomain
tenant routing (apex/`admin.`/`<client>.`) works exactly as documented. Auth itself is further
along than its own doc: `AUTH_AND_ROLES.md` (2026-06-05) still describes one shared passcode; the
real system is a 3-tier server-side passcode (`client`/`client-admin`/`admin`, per-tenant), and
it's genuinely enforced — but **only on the three write endpoints** (`items-save.js`,
`media-update.js`, `media-delete.js`, hardened 2026-07-06 after a direct-curl exploit).

**Most serious finding of the whole audit: that write-side fix was never extended to reads.**
`crm.js`/`crm-hubspot.js`/`crm-summary.js`, `items-get.js`, `media-list.js`, `inventory.js`, and
`history.js`'s POST all have zero server-side auth check today — a bare function URL, no passcode
header, returns the tenant's CRM data/pricing/inventory or accepts a movement-record write. The
fix pattern (`_write-guard.js`'s `requireWriteAuth()`) already exists and is proven; this is
applying it to more endpoints, not new design. Filed as the new #1 P0 item, ahead of everything
else in the audit.

Multi-tenancy at the config level: 2 real configs (`montitrentini.json` live, `demo.json` empty
scaffold), resolver genuinely config-driven, "new client = config only" is plausible but untested
with a real second client. House Console itself is the one doc in this whole audit found to be
accurate about its own incompleteness — `HOUSE_CONSOLE_SPEC.md` already says the pieces missing
(client-selector shell, items importer, bulk upload) aren't built, and they aren't.

**Audit complete.** All originally-named domains covered. 12 prioritized fixes filed (P0 5, P1 4,
P2 3). Full detail in `docs/WIRING_AUDIT_2026-07-15.md`. No code changed by any pass — audit only,
by design, so Rick decides what to act on and in what order.

---

## 2026-07-15 — CORRECTION: ERP monthly is POUNDS not dollars; 2024 = Jan–Jul by construction

**Trigger:** Rick uploaded the three source PDFs ("this is not complete") — read directly.
**Two corrections to tonight's earlier entry (and yesterday's parse):**
1. Reports are *"Statistica Di Riepilogo Mensilizzata — In Peso"* — **by weight**. Values are
   lbs, not USD ("Qtà" = quantità). The parse tied the right numbers with the wrong label.
2. All three PDFs were **elaborated 2024-07-30** ("Da GENNAIO A LUGLIO") — 2024 covers Jan–Jul
   only by construction. Not missing data; a stale run date.
**Corrected coverage:** 2024 = 17,977 lb = **2.7% of broker 667,210 lb** (~4.7% pro-rated).
Conclusion unchanged — small slice, gate stays shut — but units and diagnosis now true.
**Action:** generator + seed rebuilt as schema `1.1-monthly-lb` (soldLb; cases = lb ÷ lbPerCase
real pack spec — better than the price-inferred estimate it replaces; 173/251 records convert).
Coverage gate now measured in lbs. Month-column alignment flagged PROVISIONAL (PDF text
extraction scrambles columns; totals tie, placement unverifiable — proper CSV makes it moot).
Data request updated: run the SAME report fresh (through current closed month), all customers,
In Peso + In Valore, xlsx/csv. Docs corrected in place; seed supersedes the mislabeled v1.0.
**Lesson:** a parse that checksums perfectly can still mislabel units — read the report header,
not just the numbers.

---

## 2026-07-15 — Monthly forecast pipeline built + GATED; ERP monthly exposed as a <1% slice

**Decision (Rick):** build the monthly system properly now ("build the template at least"), flag
the bad 2024 data, and request the proper report — no synthetic splits, no waiting idle.
**Finding that reshaped it:** sanity check of `erp_monthly_resolved_2021-2024.json` against the
broker exports: ERP 2024 = **$17,977 across 7 customers = 0.36%** of sales-history's $4,991,076,
and dead after 2024-06. Yesterday's "real unblock for forecast-core" claim was wrong — the PDFs
were always a tiny direct slice. Parse was faithful (checksums tied); the source was thin.
**Action:**
- `scripts/build-sales-monthly.mjs` — generator: any monthly source → canonical seed. Computes
  per-year coverage against broker USD; `forecastReady` is measured (2024 ≥ 80% of broker), never
  hand-set. Proper report = add to `SOURCES`, re-run, done.
- `src/data/montitrentini/sales-monthly.json` — canonical monthly seed (251 records, 2021–2024,
  USD + estimated cases via implied $/case, per-record provenance). Ships `forecastReady: false`.
- `src/lib/sales-monthly.js` — seam to forecast-core. Seed flows only when the gate opens; live
  rep captures always flow. `seedStatus()` explains the hold in the Movement tab.
- `pricing-tool.jsx` Movement — merges seed + ledger; run-rate/YoY light up automatically when
  the gate opens. esbuild-verified.
- `docs/SALES_DATA_COVERAGE_2026-07-15.md` — the finding. `docs/CLIENT_DATA_REQUESTS_2026-07-15_
  sales-monthly.md` — copy-paste request to Sales Management (full sales-by-item-by-month,
  Jan 2024→current, cases+lbs+USD, xlsx/csv) + acceptance checklist + 15-min drop-in procedure.
**What it unblocks:** the forecast engine goes live the day the proper report lands — zero code.
**Also flagged:** sales-history 2025 "YTD through 2025-10-15" is ~9 months stale vs today —
the new report request covers the gap (through most recent closed month).

---

## 2026-07-15 — Post-close sweep: untracked docs committed, "nothing uncommitted" claim corrected

**Action:** A buildlog check after the `bb7f8bc` close-out found untracked files predating today:
`CLAUDE.md` (the project working-memory file — read-first in every session, yet never in git),
`docs/MARKETING_IMAGE_REQUEST_2026-07-13.md` + `.csv` (referenced from CLAUDE.md's key-docs
index), `COMMIT LOGIN DIAGNOSIS.command` (2026-07-13; never run — its HANDOFF payload landed via
later HANDOFF commits, kept for the record per convention), and 3 inventory-autosync backups
(2026-07-09/-10/-14, ~64K each; all earlier backups are committed). Added `~$*` to `.gitignore`
(Excel temp-lock junk, e.g. `~$Monti_Trentini_SKU_Match_Review.xlsx`).
**Why:** HANDOFF's push-state header claimed "nothing uncommitted" — true for tracked files, blind
to untracked ones. `git status --porcelain` (not just HEAD==origin) is now part of the close check.
**Status:** shipped via `COMMIT SWEEP UNTRACKED DOCS.command` (script includes the post-commit
`$?` check the 2026-07-15 git-lock incident recommended).

---

## 2026-07-15 — Git lock incident: commits silently failing since 2026-07-14, recovered clean

`.git/HEAD.lock`, dated **2026-07-14 08:21** — a full day old, predating this session entirely —
was silently blocking every commit/ref-update on the repo. `COMMIT SALES HISTORY.command` and the
first run of `COMMIT ERP MONTHLY DATA.command` both got through `git add` (files staged fine) and
failed at the ref-update step with `fatal: cannot lock ref 'HEAD'`. **The scripts' own success
message printed anyway** — the post-push status check only verifies `git push` exits 0, which it
does trivially ("Everything up-to-date") when there's nothing new to push. Worth hardening: check
`$?` after `git commit` too, not just after `git push`.

Sandbox-side `rm -f`/`mv` on `.git/HEAD.lock` and `.git/index.lock` both failed with "Operation not
permitted" despite matching ownership — a known FUSE/bind-mount limitation on this repo's shared
mount (see `docs/... sandbox-git-lock-trap` memory), now confirmed to hit `HEAD.lock` too, not just
`index.lock`.

**No data was lost.** Git writes the commit object to the object database before it locks the ref,
so every failed attempt still produced a real, complete commit — just dangling, unreachable from
any branch. `git fsck --unreachable` surfaced them; `git diff --stat` against the prior HEAD
confirmed the latest one (`1246648`) was an exact, clean superset of the intended 10 files (no
partial or duplicate content). Recovered with a plain ref move from Rick's real Terminal (native
filesystem, no FUSE restriction there): `rm -f` the three stray lock files, then
`git update-ref refs/heads/phase-2-6-build 1246648...` — ref-only, didn't touch the working tree,
so the still-pending Agent A1 wiring / placeholder-images changes were untouched throughout.
Verified via `git rev-parse HEAD` == `git rev-parse origin/phase-2-6-build`.

**Takeaway for next time:** if a commit script reports success but `git log` doesn't show a new
commit, check for a stale `.git/*.lock` file before assuming the script is broken — the object may
already exist, dangling, and just need its ref pointed at it (cheaper and safer than re-running the
whole build).

---

## 2026-07-15 — ERP monthly sales history (2021-2024) parsed, validated, cross-referenced to SKU

Rick uploaded 3 PDFs of Monti Trentini's own ERP export ("Statistica Di Riepilogo Mensilizzata") —
`2024.pdf` (Jan-Jul 2024), `2023-2022.pdf`, `2022-2021.pdf` — after flagging that Tony's Fine Foods
item-level sales were missing from the broker-export sales history built earlier today. This ERP
data is genuinely monthly (unlike the annual-only broker exports), which is what `forecast-core.js`
needs for `runRate()`/`yoyGrowth()`.

**Parser built and double-validated.** `parse_pdfs.py` extracts customer → item → year → 12 monthly
qtys from the Italian-language report structure. Two bugs caught and fixed before trusting the
output: (1) "Totale Intestatario"/"Totale Provincia" subtotal lines were being misread as
continuation data for the prior item (~50% over-count); (2) the "Totale Generale" checksum itself
was summing 13 numbers (12 months + the report's own total column) instead of 12 (~50%
under-count in the validation, not the data). Fixed both. Result: 346 item-year rows, every primary
year checksums to $0.00 diff against the PDF's own printed grand total. **Independent cross-check**:
2022 appears in both `2023-2022.pdf` and `2022-2021.pdf` as different years-per-block — both parse
to the identical $12,368.55, confirming the parser is sound, not just checksum-matching by luck.

**SKU cross-reference (same discipline as the phantom-SKU bug caught earlier today):** of 83
distinct item codes in the ERP data, 30 aren't in `catalog.json`'s active 99-SKU list — mostly small
legacy/discontinued codes (flights, old wedge SKUs), 7.8% of $ after one fix. The one large one,
`20471 URBANI AGED TRUFFLE CHEESE` ($5,351.46), is the exact item Rick already resolved today
("effectively for forecasting purposes the same cheese") — mapped to 20533. **92.2% of $ now
resolved to a real catalog SKU**; the other 29 codes are listed, unmapped, in
`source/erp_monthly_resolved_2021-2024.json` (`sku_status: "UNRESOLVED"`) pending Rick's call —
not silently resolved.

**Customer-overlap finding, relevant to the Tony's Fine Foods question:** 16 distinct customers in
this ERP data (Botticelli Foods, Di Palo Fine Foods, Alma Gourmet, Sogno Toscano, Gus Sclafani,
Urbani Truffles, Altomonte, Baldor, others). **Tony's Fine Foods does not appear here either** —
same gap as the broker-export data. This is evidence, not proof, that Tony's Fine Foods' item-level
detail sits in a system/export neither dataset has touched yet, or the account is booked under a
different legal/DBA name in the ERP.

**Not yet done:** merge this 2021-2024 monthly data into `sales-history.json` or into
`history.js`'s movement-ledger shape — same open decision flagged in the entry below (annual vs.
monthly shape), except this data actually clears the monthly-granularity blocker for 2021-2024 (not
2025, which is still broker-export/annual only). Needs Rick's call on how the two datasets should
combine. Raw + resolved data live at `src/data/montitrentini/source/erp_monthly_{raw,resolved}_
2021-2024.json` — commit `1246648`, pushed after the lock-recovery documented above.

---

## ⚠️ CANONICAL FACT — read first

**The platform core IS CheeseShop TECH. Monti Trentini is a CLIENT (tenant #1), not the platform.**

- **CheeseShop TECH** = the multi-tenant platform + shared codebase = the owned IP / crown jewels. Stays with Posada & Co. **Never sold or transferred.**
- **Monti Trentini** = the first client environment running *on* the platform. A tenant, nothing more.
- At any client buyout, the client receives a **single-tenant fork** of their own site only — **never** the CheeseShop TECH platform core or its multi-tenant code.
- Do not conflate the two in any doc, contract, repo name, or config. Platform = CheeseShop TECH; clients = tenants.

---

## ⚠️ STANDING RULE — every write endpoint logs itself

**Every new write/mutating Netlify function MUST call `logWrite()` from
`netlify/functions/_write-log.js`** — once on auth failure, once on a successful write. No
exceptions for "small" or "internal" endpoints; that's exactly how `_write-guard.js` (2026-07-06)
almost didn't happen — the gap was in the endpoints nobody thought to double-check.

- Auth (`requireWriteAuth`) answers "was this allowed." Logging (`logWrite`) answers "what
  actually happened" — both are required, not either/or. An endpoint with a guard and no log can
  still be probed silently; a log with no guard is a diary of a break-in.
- Read the log at `netlify/functions/write-log.js` (GET, house-admin passcode only).
- Full rationale: `docs/TRUST_BY_DESIGN_REVIEW_2026-07-07.md`.

---

## 2026-07-15 — Sales history reconciled to SKU + staged for forecasting (cont.)

**Decision.** Rick uploaded 7 broker/customer ERP exports (Tot Cowbell/Customers/Gordon/Richard
Customers/Selected/Tama/Trader Joe's, "2025-24" = 2024 full year vs 2025 YTD through 10/15) — the
`06_Sales_History.xlsx` onboarding-kit gap that blocks Agents A3 (Replenishment) and A4
(Projection/Production). Chose quick analysis first, then pivoted mid-session to "tighten the
product code identity" — reconciling the free-text item descriptions to real SKU codes, since
that's the real prerequisite for either agent.

**Action.**
- Built a two-stage matcher (product-name family match, then portion/flavor-variant tag match to
  disambiguate SKUs sharing a name) against `catalog.json`. **First pass used `items-seed.json`
  as the corpus and got it dangerously wrong:** 52.7% of 2025 dollar volume, including the single
  largest line item (~$2.1M), matched to SKU codes that don't exist in the active price list —
  `items-seed.json` carries 26 stale/legacy codes catalog.json doesn't. Rebuilt the corpus from
  `catalog.json`'s active 99 SKUs only. Fixed both large items correctly without prompting.
  Logged as a standing rule: `catalog.json` is the accurate source for product identity/naming
  right now, not `items-seed.json`/`items.js` — see memory `cst-price-list-authoritative-for-names`.
- Rick manually confirmed 5 low-confidence items interactively (Piave Vecchio → 03003 Asiago
  Vecchio DOP; Fioretto/Urbani/"Aged Truffle Cheese" → 20533 Fioretto Stagionato with Truffle,
  noting the Urbani co-brand is discontinued but the cheese rolls into 20533 for forecasting;
  Caciotta Rustiga with Truffle confirmed as 20150's working name). Final: **99.4% of 2025 dollar
  volume resolved to a real SKU** (2 genuinely open items are dry-cured ham — not a Monti product,
  likely a different producer's line mixed into the export).
- Built `src/data/montitrentini/sales-history.json` — 39 SKUs, 2024 + 2025 YTD (+ annualized) in
  both lbs and case-equivalents (converted via each SKU's `catalog.json` `pack.netLb`), aggregate
  and per-customer. Source audit trail (`sku_match_review.csv`, `overrides.json` with Rick's
  confirmations) saved to `src/data/montitrentini/source/`.
- **Two flags raised, not resolved — need Rick/Stefano before this feeds any reorder decision:**
  1. SKU 20150 (Caciotta Rustiga with Truffle, the #1 item, $2.1M) computes to ~44,000 cases sold
     in 2025 YTD from actual invoiced sales — `inventory.json`'s own comment on that SKU says
     "average purchase TONY 55 per month" (~660/year), a ~67x gap on its face. **Likely a
     non-issue:** "Tony" isn't a company anywhere in the sales-history export, and a second
     inventory.json comment lists Tony alongside real customer names (Cowbell/ACE Endico/Baldor),
     suggesting Tony is a person/contact whose typical order was noted, not total company demand —
     apples to oranges, not a contradiction. Worth a quick confirm with Stefano, not urgent.
  2. `forecast-core.js`'s `runRate()`/`yoyGrowth()` require MONTHLY periods (6-month window,
     13-month minimum for YoY); this sales history is annual only (2 buckets: 2024, 2025 YTD).
     **Not wired into `history.js`'s movement-ledger store** — writing annual totals into a
     monthly-shaped store would silently produce wrong run-rate/YoY math. Staged as a standalone
     file instead; bridging it into the forecasting engine is an open decision (fabricate a
     monthly split vs. wait for real monthly data vs. extend forecast-core to accept an annual
     fallback).

**Status.** `sales-history.json` built, reconciled, **live on remote (commit `1246648`, pushed
2026-07-15 after a git-lock recovery — see that entry above).** Not yet wired into
`forecast-core.js`/`history.js` — both open flags above still need a decision first.

---

## 2026-07-15 — Agent A1 (Content Engine) data-wiring fix + spec; Auto-compose found already shipped

**Decision.** Rick: solidify inter-app wiring + ship the first Content Engine agent (A1, per
`ONBOARDING_AND_AGENTS_SDD.md`) before any UI-direction work. Scope confirmed via three questions:
rewire the agent's data path + fix the stale ownership doc (not a full `catalog.json`/
`items-seed.json` dedupe); keep Stage 2 (AI) in scope, accepting it's blocked on Rick's Anthropic
billing setup; UI direction is CST platform chrome, not tenant brand, and comes after real screens
exist to design against.

**Action.**
- Wrote `docs/AGENT_A1_BUILD_SPEC.md` (Parts A–E), updated in place as each part landed rather than
  left to go stale.
- **Correction caught before shipping:** the spec's original Part A plan was to reroute Studio
  Director's images from `media.js` (`listAssets()`) to `images.js` (`imageForCode()`). Reading
  both files closed that: `listAssets()` IS the Media Hub (same mock data / same `media-list`
  endpoint the Media Hub UI itself uses); `images.js` is a narrower, generated, build-time-only
  per-SKU manifest with no usage tags or approval state — it cannot serve `pickAsset()`'s scoring
  job (hero/lifestyle/product candidates by tag + approval + SKU). Swapping would have broken image
  selection. **Not done — correctly abandoned before touching code.**
- **What Part A actually fixed:** `studio-director.js`'s `pickProducts()` sourced product-range
  slide names from `catalog.json`'s own `name` field instead of the canonical `items.js` record
  (Media Hub's item-copy source, 2026-07-03 decision). `directDraft()` now also loads the tenant's
  `items.js` doc; `pickProducts()` prefers it, falling back to catalog.json only for SKUs not yet
  entered there. Also deleted a third, dead image-resolution path in the same function
  (`p.skus.find(...).image` from catalog.json) — confirmed via repo grep nothing downstream ever
  consumed it.
- Rewrote `docs/DATA_OWNERSHIP_MAP.md` — it still said (2026-06-13) product copy must NOT live in
  Media Hub, contradicting the 2026-07-03 `items.js` decision. Split "Product" into two domain rows
  (identity + copy → Media Hub; pricing → Price List), fixed the SKU join diagram, logged the
  remaining `catalog.json`/`items-seed.json` duplicate name/blurb fields as tracked-not-fixed.
- **Found, not built:** the "Auto-compose" UI trigger `CONTENT_ENGINE_WIRING_SPEC.md` §4 lists as
  an open gap already exists in `slide-studio.jsx` (empty-state card + toolbar button), wired to
  `directDraft()`. That gap-list entry and the SDD's "not yet exposed" framing of A1 are stale.
  **A1 is functionally shipped** — Stage 0/1 auto-compose runs end-to-end on the corrected data.
- Surfaced, discussed, **not built**: `images.json` only refreshes via manual
  `npm run sync:images` + redeploy — no webhook, no cron — and `VITE_IMAGES_BACKEND` isn't set
  anywhere (`.env.example` or `netlify.toml`), so the "live" adapter branch in `images.js` is dead
  code; the manifest is 100% static in every environment today. Real staleness risk for Catalog /
  Proposals / Pricing after any Media Hub change. Two fix options proposed, neither built: a
  Cloudinary webhook → resync function, or a lighter "manifest last synced" indicator in house
  admin. Awaiting Rick's pick.
- Designed, **not built**: Part E, post-sale CRM pipeline stages (`PO Received` / `Processing` /
  `Shipped` real; `Billed` / `Collected` inert placeholders) behind an off-by-default per-tenant
  flag — deliberately deprioritized per Rick's instruction to focus on wiring + the agent first.

**Status.** Parts A + the ownership-doc fix **shipped — commit `b386bf9`.** Part B needed no code —
already shipped, timing unclear. Part C blocked on Rick's Anthropic billing + spend cap. Parts D
(visual direction) and E (pipeline toggle) are spec'd, not built. The unrelated placeholder-
thumbnail workstream (`images.js`, `pricing-tool.jsx`, `docs/MARKETING_IMAGE_REQUEST_2026-07-13.*`)
also shipped today, separately — commit `038247c`, see entry below.

---

## 2026-07-15 — Placeholder image thumbnails shipped (commit `038247c`)

Earlier-session workstream (not part of today's wiring/agent/sales-data work) landed today. 17
low-res reference thumbnails from the Cut & Wrap assortment sheet (116x111–331x210px, 150–211 ppi),
re-encoded PNG → WebP (836 KB → 108 KB total, 87% smaller), served locally from
`/public/placeholders` — **Cloudinary hi-res-only rule unchanged**, these never get uploaded there.

`codeImageUrl(..., { allowPlaceholder })` is opt-in per call site: only the Proforma tool passes it.
`proposal-builder` and `proposal-view` don't, so a buyer can never be shown or sent a placeholder —
verified `allowPlaceholder` appears nowhere under `components/proposals`. Resolution order is
manifest → placeholder → legacy convention, so any real packshot in the manifest always wins over a
placeholder. Proforma row: dashed border + "REF" corner tag. Detail dialog: native size (no
upscaling into a hero), "Reference image only" banner, Share/Download/Copy link hidden (each would
put a 150 ppi image somewhere it could pass as a real asset).

---

## 2026-07-09 — Line-card template + sell-sheet set (designed out-of-band, handed off to build)

**Action.** Produced a four-item **product line card** (Monti Trentini: 03023 Asiago Stagionato
DOP, 02206 Asiago Fresco della Montagna, 20228 Caciotta alle Erbe, 20141 Caciotta Piccante) plus
four matching single-SKU sales sheets, rendered as PDF + a 1200px email PNG. Rick approved the
line-card format and asked that it become a Content Studio template and the Product Catalog's UI
layout. **No app code changed** — spec + blockers written to
`docs/HANDOFF_2026-07-09_line-card-template.md` for a build session in this repo.

**Why.** The line card is the first layout the sales motion actually asked for that the template
engine cannot express: it is portrait, and it repeats a product row N times against catalog data.
Both gaps are engine-level, not cosmetic — worth fixing once rather than hand-building the card.

**What it unblocks / what it exposed** (verified against source at `d240626`, not memory):

- `slide-renderer.jsx:17` hard-codes `aspect-video`. Every manifest is 960×540, so no template
  has ever exercised another ratio. **Any** non-16:9 template is blocked on this one line.
- `pick` / `fills` are declared on `product-range/v1`'s image slots and **consumed nowhere in
  `src/`** — the catalog-position autofill was specced in `TEMPLATE_ENGINE_SPEC.md` §10 and never
  wired. Wiring it lights up `product-range/v1` and the line card together.
- `components/catalog/buyer-catalog.jsx` is titled "Product Catalog" but reads `lib/catalog.js`,
  which its own header calls a view over the **image** manifest. The product record lives in
  `data/<tenant>/catalog.json` + `lib/items.js`. IA decision needed before any catalog UI work —
  logged in the handoff, not decided here.

**Design decisions to preserve** (they cost rework to rediscover): certification marks are
conditional and absent on non-DOP items, never decorative; packshots need a whitespace trim before
they fill a frame; the cert emblem belongs on the title line, not overlapped on the wheel.

**Facts corrected.** There is no item **02023** — it is a transposition of **03023**. Weights
re-confirmed: 20228/20141 = 3 kg / 6.6 lb; 02206 = 28–30 lb; 03023 = 17–19 lb.

**Status.** Handoff written. Print renderer (reportlab) stays the print path; the app render is a
separate font stack and a separate export story — see handoff watch-outs before promising print
output from the app.

---

## 2026-07-08 (cont. 2) — DECISION: sequencing — second-tenant rehearsal earmarked, not now

**Decision (Rick).** The second-tenant onboarding + passcode rehearsal (stand up a fake client,
walk `config/_template` → seam-map registration → `PORTAL_ADMIN_PASSCODE_<TENANT>` →
write-log tenant tagging end to end — proposed same session as the write-action log above) is
**earmarked, not started.** Target: **~2026-07-22** (two weeks out). Current priority is finishing
the Asiago Touch 1 email send and the Media Hub metadata fields.

**Why now, why not right now.** The rehearsal is real and worth doing before client #2 (per
`TRUST_BY_DESIGN_REVIEW_2026-07-07.md`), but it's infrastructure work with no immediate deadline.
Asiago Touch 1 has a live cadence already running against real buyers (Touch 2 ≈ Fri 7/10) and
Media Hub has two small, already-scoped open items — both are closer to done and time-sensitive
in a way the rehearsal isn't.

**What "earmarked" means in practice:** next time this file is opened for planning, or on/after
2026-07-22, resurface this item. Not on `docs/BACKLOG.md` (that file is scoped to the pricing/
quoting tool) — this is a platform-level item, logged here instead.

**Status check on the two priorities (grounded in the files, not memory, as of this entry):**
- **Asiago Touch 1** — only batch 1 of 3 (10/31 contacts) is confirmed sent
  (`monti_asiago_campaign/LAUNCH_DAY_2026-07-06.md`, `CAMPAIGN_BUILD_LOG.md`). Batches 2 (Tue 7/7)
  and 3 (Wed 7/8 — today) were planned but **no batch-2/3 send confirmation has been logged yet**
  in either file. Confirm actual send status before assuming Touch 2 (Fri 7/10) can queue on
  schedule — the To-do-task cadence only fires off contacts that were actually sent Touch 1.
- **Media Hub metadata fields** — per `BUILD_LOG.md` (cont. 8, 2026-07-06), open items are: bulk-tag
  the 71 legacy `monti/` packshots `product-catalog` (currently untagged → invisible to the
  Product Catalog gate and usage tabs) and fill in their still-blank long descriptions. The
  one-folder Cloudinary migration is explicitly deferred, not part of this scope.

---

## 2026-07-08 — Write-action log (audit trail for the write-guard endpoints)

**Context.** `TRUST_BY_DESIGN_REVIEW_2026-07-07.md` measured CST against Superhuman's "trust by
design" framework (system view / controls / governance). Two of three problems scored well
(system-of-record map, data-ownership rules, documented role model). The one real gap: **no
visibility** — `_write-guard.js` (2026-07-06) stops an unauthorized write, but nothing records who
did an *authorized* one, or who tried and failed. At one tenant that's low-stakes; it stops being
low-stakes the moment a second admin or a second client is in the system.

**Shipped (`node --check` ✓ on all five files, function-only change —
`COMMIT WRITE ACTION LOG.command`):**
- `netlify/functions/_write-log.js` (new, helper) — `logWrite(event, entry)` appends
  `{ts, ip, fn, ok, role, status, action, tenant?}` to a single capped array (last 500 entries) in
  **Netlify Blobs** (store `write-log`) — same pattern as `inventory.js`/`inventory-publish.js`, no
  new infra, no new secret. Logging failures are swallowed — it can never block or fail the write
  it's describing. Also exports `tenantFromPath()`, a best-effort tenant guess from a
  `clients/<tenant>/...` publicId/folder.
- `netlify/functions/write-log.js` (new) — GET endpoint to read the log, newest first. Gated to
  `role === "admin"` (house passcode only) via the existing `requireWriteAuth` — this is CST's
  cross-tenant trail, not a client-facing feature.
- `media-update.js` / `media-delete.js` / `items-save.js` — each now calls `logWrite` on auth
  failure (fn, ok:false, status) and on success (fn, ok:true, role, action, tenant).

**Known gaps (acceptable at one tenant, not later):** no UI for `write-log.js` yet (curl/Postman
only); single Blobs key means no read/write concurrency protection (fine at this write volume);
`client-admin` can't read their own tenant's log (house-only for now, by design — revisit if a
client asks). Passcode auth itself is still the pilot stopgap noted in the trust review — Clerk
migration should land before client #2, per that doc's recommendation.

---

## 2026-07-06 (cont. 11) — LIVE HubSpot email activity on the CRM dashboard

**Context (Rick's ask, hours after the Asiago Touch 1 launch):** is HubSpot email activity
current in the Monti CRM dashboard? It wasn't — crm-hubspot.js returned `activity: []` by
design (Slice 2 wired companies+contacts only). Built now so campaign engagement (sends /
replies / bounces) shows where Rick and reps actually look.

**Shipped (node --check ✓, function-only change — `COMMIT EMAIL ACTIVITY.command`):**
`netlify/functions/crm-hubspot.js` —
- `fetchEmailActivity()`: 3 batched requests — recent 20 sales-email engagements (v3 emails
  search, sorted by hs_timestamp desc) → email→contact associations (v4 batch read) → contact
  names+company (v3 batch read). Maps to the existing activity card shape `{who, what, when}`:
  who = "First Last — Company" (falls back to Inbound/Outbound email), what = "Sent:/Reply:/
  Bounced: <subject>", when = relative ("2h ago", matching the mock strings the card was
  styled around).
- Failure isolation: the whole feed is `.catch`-wrapped — activity problems can never break
  the companies/contacts payload that feeds the Opportunity Engine.
- **Scope-aware degradation:** a 403 on the emails search returns `activity: []` +
  `activityNote: "HubSpot token lacks sales-email-read scope"` — the dashboard card just stays
  hidden. The Recent-activity card lights up as soon as the scope exists; zero frontend changes
  (command-center.jsx already guards on activity.length).

**Rick action (HubSpot, not code):** Settings → Integrations → Private Apps → the CST app →
Scopes → add **`sales-email-read`** (CRM/Sales section) → save. Then verify:
`curl https://montitrentini.cheeseshoptech.com/.netlify/functions/crm-hubspot` — the JSON
should show today's Touch 1 sends in `activity`; if instead it has `activityNote`, the scope
isn't active yet. Note: response is cached `max-age=120`, so the dashboard trails by ≤2 min.

---

## 2026-07-06 (cont. 10) — Viewer-tier asset dialog goes clean (no edit chrome, no footer Close)

**Decision (Rick).** For the salesman/broker-facing Media Hub, the asset dialog needs NO edit
affordances and NO footer Close button — the X is enough. Managers were already the only ones
with an Edit button (canManageMedia = admin/client-admin since cont. 2); what viewers still saw
was the "Asset details are managed by the brand team" lock notice + a redundant footer Close.

**Shipped (build ✓ — `COMMIT VIEWER DIALOG CLEAN.command`):** `media-hub.jsx` AssetDialog view
mode — lock notice REMOVED (viewers get image · badges · PNG/Share/Copy · item info, nothing
else) · footer Close REMOVED for everyone (X + Escape + backdrop close the dialog) · unused
`Lock`/`DialogClose` imports dropped. Admin edit/delete row unchanged. Upload dialog and edit
mode footers (Cancel/Save) unchanged.

---

## 2026-07-06 (cont. 9) — "Edits not sticking" diagnosed: stale unlock vs the new write-guard

**Rick's report:** photo-data edits in the Media Hub don't stick, and "no close button after
save." Root cause chain: the same-day write-guard (cont. 2) requires the unlocked passcode
replayed as `x-portal-passcode` — but the passcode is stashed **only at unlock time**. A browser
unlocked BEFORE the guard shipped has nothing to replay → every media/items save 401s. The
failed save keeps the dialog in edit mode (by design, so nothing is lost) — which reads as
"stuck / no close." A second contributor: media-list's `max-age=60` browser cache meant even a
SUCCESSFUL edit + reload within a minute served the pre-edit list — also reads as "didn't stick."
**Operator fix (works immediately, no deploy): sign out → re-enter the passcode.**

**Shipped (build ✓, function node --check ✓ — `COMMIT SAVE AUTH UX.command`):**
- `src/lib/media.js` — new exported `RELOGIN_MSG`; `updateAsset`/`deleteAsset` map a 401 to it
  ("sign out and re-enter your passcode…") instead of a bare status code.
- `src/lib/items.js` — `saveItems` same 401 mapping (imports RELOGIN_MSG from media.js).
- `netlify/functions/media-list.js` — `cache-control: no-store` (was `private, max-age=60`);
  the hub fetches once per mount, the cache bought nothing and cost trust.

**Not changed (checked, working as designed):** the asset dialog's view mode has a footer
Close + the X; edit mode has Cancel. The "trapped" feeling was the failed-save loop, not a
missing control. If it recurs after re-login, revisit.

**Every already-unlocked browser (Rick's desktop, phone, any tester) hits this once** — the fix
is always sign out / sign in. Consider auto-forcing re-gate on 401 later if it keeps biting.

---

## 2026-07-06 (cont. 8) — Media Hub now surfaces the 71 legacy `monti/` packshots

**Problem (Rick).** Product images exist in Cloudinary that never show in the Media Hub.
Diagnosed against the live media-list endpoint: cloud `sofcvmwa` holds 242 assets under
`monti-trentini/` (what Media Hub lists) **plus 71 under legacy `monti/<itemcode>`** (the
per-SKU packshots — filename IS the item code, zero context/tags). media-list only queried the
tenant folder, so the packshots were invisible. These are the same assets the pricing tool's
`codeImageUrl` legacy fallback and campaign materials reference by delivery URL — so **moving/
renaming them was ruled out** (breaks live URLs); a one-folder migration is its own deliberate
session.

**Shipped (vite build ✓ · validate:clients ✓ · node --check on the function ✓ —
`COMMIT LEGACY PACKSHOTS.command`):**
- `netlify/functions/media-list.js` — optional `legacy=` param (comma list): fetches each legacy
  prefix too, filters to EXACT folder (Admin-API `prefix` is a string match — `monti` also
  matches `monti-trentini/…`), dedupes, and **derives `sku` from the filename** (`monti/01021` →
  sku `01021`, only when context has none) so packshots auto-link to item records.
- `src/lib/media.js` — `listAssets` takes `legacyFolders`, appends `&legacy=`.
- Callers pass `resolved.cloudinaryLegacyFolders`: `media-hub.jsx`, `media-picker.jsx`,
  `studio-director.js`.
- `client.schema.json` — new optional `cloudinaryLegacyFolders: string[]` ·
  `clientConfig.js` resolves it (default `[]`) · `montitrentini.json` sets `["monti"]`.

**Behavior notes:** legacy packshots land in the "products" folder bucket, untagged →
approved-for-press default (visible to all roles), no usage tags — so they appear in All/
Products but NOT in usage tabs or the Product Catalog gate (`product-catalog` tag) until
tagged (bulk-tag in-app). Editing them via the asset dialog works as-is (media-update is
public_id-based).

**Open:** tag the 71 packshots `product-catalog` (bulk) · long descriptions still blank ·
one-folder migration later.

---

## 2026-07-06 (cont. 7) — Real mobile nav drawer + presentations RoleGate

**Context.** Continuation of the (cont. 6) session below. The stopgap back-to-Dashboard button
shipped there was never intended as the fix; reps are testing on phones, so the real mobile nav
went in same-day. Also closed open item (3) from the handoff: the `presentations` route had no
`RoleGate` in the render switch — reachable via `?page=presentations` regardless of role.

**Shipped (vite build ✓ to a sandbox outDir — the mounted `dist/` can't be emptied from the
sandbox, same permission class as the git-lock trap; `npm run validate:clients` ✓):**
- `src/components/layout/app-shell.jsx` — stopgap back button REPLACED by a hamburger
  (`md:hidden`, always visible) → new `MobileNavDrawer`: backdrop + left panel, brand header
  (+ Agency Console eyebrow for house), the SAME role-filtered `nav` array the sidebar gets
  (so rep scoping carries over automatically), taller touch targets (py-3), Escape + backdrop +
  X to close, closes on navigate. No new deps, conditional render (no animation lib).
- `src/App.jsx` — `presentations` render wrapped in
  `RoleGate roles={["admin","client"]}` matching its nav `allowed`, with the standard
  `AccessNotice` fallback. Buyer deep links (`?page=presentations` behind the tenant passcode)
  still work — the base client role passes the gate.

**Commit hygiene note.** `COMMIT SALES REP MOBILE FIX.command` (cont. 6) was never run, and this
work edits the same files — the two changesets are one working-tree state now. Superseded by
**`COMMIT MOBILE NAV DRAWER.command`**, whose message covers BOTH (cards role-gate fix +
featuredNav leak + drawer + RoleGate); it deletes the old button after a successful push.

**Open (unchanged):** personalized/email-gated Presentation Library (placeholder only) · the
uncommitted other-workstream file pile (Asiago materials, asiago-wheel renders, HubSpot cleanup
docs, inventory.NEW.json, src/archive) still needs triage into its own commits.

---

## 2026-07-06 (cont. 6) — Dashboard tool cards weren't role-gated at all; mobile has no nav

**Found testing the sales-rep tier on an iPhone (Rick).** The Dashboard's tool launch cards
(`home-hub.jsx`, driven by `resolved.tools` in each client config) had **no role filtering
whatsoever** — every tool showed to every signed-in user regardless of role. This is a separate
surface from the top-nav `NAV`/`featuredNav` we scoped earlier today; fixing the nav didn't fix
this. Also found: the sidebar (`app-shell.jsx`) is `hidden ... md:flex` — **below the md
breakpoint there is no navigation UI at all**, just a blank header. On phone, once you leave the
Dashboard there was no way back.

**Decisions (Rick).** Sales-rep dashboard cards: drop Storefront and Campaigns · replace Trade
Portal with **Presentation Library** — for now a relabeled pointer at the same Content Library
page, but the real plan is personalized per-buyer presentations built by the rep or sales
support, eventually gated by individual email-based login (not built yet — noted as the next
step, not shipped today). Mobile: stopgap back button only, not a full mobile nav rebuild.

**Shipped (build ✓, `npm run validate:clients` ✓ — `COMMIT SALES REP MOBILE FIX.command`):**
- `config/clients/client.schema.json` — new optional `allowed` array per tool entry (roles that
  may see its home-hub card / nav tab; omit = open to admin+client as before).
- `config/clients/montitrentini.json` — Campaigns and Storefront tools now `"allowed": ["admin"]`
  · `trade-portal` tool renamed to `presentation-library` / "Presentation Library" with updated
  copy describing the personalized/email-gated plan.
- `src/components/home/home-hub.jsx` — tool cards now actually filter by `allowed` (previously
  didn't filter at all).
- `src/App.jsx` — `featuredNav` now reads a tool's own `allowed` instead of hardcoding
  `["admin","client"]` for every featured tool (this is what let Storefront leak onto the
  sales-rep top nav too, not just the dashboard).
- `src/components/layout/app-shell.jsx` — mobile-only (`md:hidden`) back button, upper-left of
  the header, jumps to Dashboard; hidden once already there.

**Open — bigger fix, not done today:** there's still no mobile navigation drawer/menu — the back
button is a stopgap, not a fix for "can't get from A to B on phone" in general. Worth a real pass
if reps end up primarily on mobile. Presentation Library is a relabeled placeholder, not the
personalized/individual-access feature yet.

---

## 2026-07-06 (cont. 5) — "client" tier v1 scoped: Dashboard, CRM, Price List, Catalog, Content Library

**Decision (Rick).** First real definition of what the base "client" passcode tier (brokers/
sales reps) can see: Dashboard, CRM, Price List (Pricing & Inventory), Product Catalog, Content
Library. Explicitly NOT Campaigns, Orders, or the full Content Engine hub (which also bundles
Content Studio, Brand Systems/Kits/Voice, Media Hub) — those stay admin-only for now. Deliberate
starting point, widen one line at a time as real reps actually need more.

**Shipped (build ✓ — `COMMIT CLIENT TIER V1.command`):** `src/App.jsx` —
- `campaigns` and `orders` NAV entries: `allowed` narrowed from `["admin","client"]` to
  `["admin"]`.
- `tools` (Content Engine hub): narrowed to `["admin"]` — giving "client" this tab would also
  surface its Media Hub card (`content-engine-page.jsx` APPS config already permits
  `["admin","client",...]` there), which isn't wanted for reps yet.
- New direct NAV entry: `presentations` → "Content Library" (icon `MonitorPlay`, matches its
  Content Engine card), `allowed: ["admin","client"]` — reps get Content Library on its own tab
  instead of the whole hub. Added to `NAV_ORDER` right after the catalog tool tab.
- Price List + Product Catalog needed NO change — both are `featured: true` in
  `config/clients/montitrentini.json`, and featured-tool tabs already default to
  `allowed: ["admin","client"]` (App.jsx `featuredNav` mapping).
- Zero risk to any live user: confirmed earlier this session that no "client"-tier passcode has
  ever actually been handed out, so nobody's access changes as a result of this.

**Known pre-existing gap, not introduced here, not fixed:** the `presentations` route has no
`RoleGate` in the render switch (unlike `brand`/`brand-systems`) — reachable via `?page=
presentations` regardless of role, same as before this change. Low priority (view-only content,
no write path) but worth closing if Content Library ever holds anything sensitive.

---

## 2026-07-06 (cont. 3) — "Request access" form on the portal gate (Netlify Forms, no backend)

**Context.** Testing the write-guard change, Rick realized there's no live broker/sales-rep
("client" tier) passcode actually in use — a real gap once he starts handing out
narrower-than-admin access. Asked for a signup form that lands with admin@cheeseshoptech.com for
manual approval. Explicitly NOT a self-serve account system (the passcode model has no concept
of individual users) — a request form only; granting access is still Rick manually handing out
the right passcode after reviewing.

**Shipped (build ✓ — `COMMIT REQUEST ACCESS.command`):**
- `index.html` — a hidden static `<form name="access-request" data-netlify="true">` (name,
  email, company, role, tenant, note, honeypot). Required so Netlify's build-time crawler
  registers the form schema — a React-rendered form is invisible to it (documented Netlify
  Forms + SPA pattern).
- `src/components/auth/request-access.jsx` (new) — the real form UI, submits via `fetch("/", …)`
  with `form-name=access-request`, the matching SPA-submission recipe.
- `passcode-gate.jsx` — "Don't have a passcode? Request access" link (client-facing tenant gate
  only, not the house console) toggles to the request form; success state points back to
  admin@cheeseshoptech.com.

**Rick action required (Netlify dashboard, not code):** Site settings → Forms → Form
notifications → Add notification → Email notification → **`hello@cheeseshoptech.com`** (the
address Rick actually reads — avoids standing up a paid admin@ mailbox before signing client
#1), watching form **"access-request."** The form's own displayed copy still says "sent to
admin@cheeseshoptech.com" on purpose — Rick's call, addable as a real routed mailbox later
without touching this code, only the Netlify notification target. Without the notification step
submissions land in the Netlify Forms dashboard but nothing emails anyone.

**Open / by design:** granting access is still 100% manual (Rick reads the request, decides,
sends the appropriate passcode himself) — no auto-provisioning, no revoke-per-person. If/when
real per-user accounts matter (Clerk, per the existing plan), this request form's job shrinks to
"tell me you exist" rather than the access mechanism itself.

---

## 2026-07-06 (cont. 2) — Cloudinary rewrites now require CST/client-admin auth server-side

**Problem (Rick's ask, following the wiring review above).** `media-update`, `media-delete`,
and `items-save` called the Cloudinary Admin API safely server-side (secret never in the
browser) but had **no check on the caller** — the client-side role gates only hid buttons in
the UI. Hitting the function URL directly (as this session's own scripts did, repeatedly, to
fix data) rewrote or deleted assets with zero authentication. Decision: only CST (house
passcode) and a client's admin (client-admin passcode) may write; the base "client" portal
viewer and unauthenticated requests are blocked. Direct-to-Cloudinary access was never possible
anyway (secret server-side only) — this closes the gap that our OWN endpoints didn't check who
was asking.

**Shipped (build ✓ — `COMMIT WRITE GUARD.command`):**
- `netlify/functions/_write-guard.js` (new, not its own endpoint — leading underscore) — shared
  `requireWriteAuth(event)`, same shared-passcode model as `gate.js`: replays the passcode the
  user unlocked with, sent as `x-portal-passcode` (mirrors the existing `x-publish-secret`
  pattern in `inventory-publish.js`). Accepts house or (tenant/generic) admin passcode only —
  deliberately does NOT accept the base client passcode.
- `media-update.js` / `media-delete.js` / `items-save.js` — each now calls the guard first, 401s
  if missing/wrong.
- `auth-context.jsx` — `unlock(role, code)` now also stashes the raw passcode
  (`cs-portal-passcode`, cleared on logout); new `writeAuthHeader()` export replays it.
  `passcode-gate.jsx` passes the code through on unlock.
- `media.js` / `items.js` — `updateAsset`/`deleteAsset`/`saveItems` attach `writeAuthHeader()`.
  `canManageMedia`/`canManageItems` tightened from admin-or-client to **admin-or-client-admin**
  (client-side gate now matches what the server will actually allow — no more showing an Edit
  button a base-tier viewer can't actually use). `canDeleteMedia` was already this tight.

**Known gap, not fixed (dead code path today).** This only works in passcode auth mode
(`VITE_AUTH_MODE=passcode`), which is the live mode per HANDOFF. Identity mode
(`VITE_AUTH_MODE=identity`) has no equivalent check — `writeAuthHeader()` returns nothing, so
writes would 401 across the board if identity mode were ever turned back on. Needs a real
Identity-JWT check added to `_write-guard.js` before that switch happens (Clerk is the actual
plan per AUTH_AND_ROLES, so this may never matter).

**Test before trusting it:** after this deploys, confirm you can still edit/link/delete assets
in Media Hub logged in with your normal (admin or client-admin) passcode — should work exactly
as before. If you ever log in with the base client passcode, Edit/Delete buttons will now be
hidden (by design).

---

## 2026-07-06 (cont.) — Image manifest un-froze: 103→242 images, live-syncable without secrets

**Root cause found.** Product Catalog reads item identity/copy LIVE (`items.js` fetches
`items-get` at runtime — Media Hub edits show up immediately). But it reads **photos** from a
STATIC bundle, `src/data/montitrentini/images.json`, built once by `sync-images.mjs` and frozen
until someone with the Cloudinary Admin API secret manually re-runs it and redeploys. That
manifest hadn't been regenerated since early sessions — it had 103 images while Cloudinary
actually holds 242 (139 real uploads, invisible to the Catalog/Proposals/Pricing this whole
time, though fully visible+editable in the Media Hub, which lists live). This explains the
whole afternoon's confusion about edits "not showing up."

**Shipped (build ✓ — `COMMIT IMAGE NETWORK.command`):**
- `netlify/functions/media-list.js` now also returns `version`/`bytes`/`modified` (were already
  on the Cloudinary resource, just not mapped through).
- `scripts/sync-images.mjs` gets a `--live` mode: when Admin API secrets aren't set, it rebuilds
  the manifest from the already-deployed `media-list` function instead (no secret needed
  anywhere but Netlify). Auto-selects live mode if secrets are absent. Full Admin-API mode is
  unchanged and still preferred when secrets ARE available (nothing lost there).
- Regenerated `images.json`: **103 → 242 images**, using live mode. Ran the matcher
  (`match-photos-to-items.mjs`) after, which caught one more confident match (Alpeggio Cheese,
  20724) and confirmed the previously-ambiguous Vezzena/Lagorai/Provolone/Piave assignments
  Rick made by hand this session are durable in Cloudinary context.
- **Regression caught before shipping:** the refresh initially DROPPED 27 of 47 previously-coded
  images — turned out those codes only ever existed in the old local bundle, never written to
  Cloudinary context (pre-dating the Media Hub item-linking feature). Cross-checked all 27
  against `items-seed.json`: 23 were valid and got written back via `media-update` (durable
  now); 4 were the already-known bad orphan codes (05123/05205/20220/01315) correctly staying
  unlinked. Also wrote the 5 already-resolved-but-unwritten links from this session (Lagorai
  ×2, Provolone, Piave ×2).
- **Final state: 50/242 images coded, 43/113 items have ≥1 photo.**

**Open (real, not fixable from data alone):** item **20229** (Caciotta alle Erbe 3kg) has no
photo anywhere in the live 242 — genuinely missing, not a matching problem · 194 images have no
code, most correctly so (brand/lifestyle/raw/production shots) but the original 49-item "no
match" backlog is inside that count and still needs eyes · long descriptions still blank on
most items.

**Wiring review — findings + recommendations** (full review shared with Rick in chat; not
duplicating here to keep this entry short): the images/items asymmetry above is the headline
finding. Also flagged: `media-update`/`media-list` have no caller auth (anyone with the URL can
rewrite Cloudinary metadata) · `VITE_IMAGES_BACKEND` "live" adapter is an unimplemented stub
(`return null`) sitting next to the working `VITE_MEDIA_BACKEND` flag — confusing pair, worth
either implementing or removing · no scheduled/automatic manifest refresh exists — recommend
either a Netlify build-plugin prebuild step calling `sync-images.mjs --live`, or a scheduled
task, so this can't go stale silently again.

---

## 2026-07-06 — Media Hub asset-grid search (Product Catalog already had one)

**Finding.** The Product Catalog (`buyer-catalog.jsx`) and Media Hub's Items tab
(`items-panel.jsx`) already had search — name/item #/description/certification/UPC — built
2026-07-04. The gap was the Media Hub's main asset grid (All · Recent · usage tabs), which only
had the left-rail tag filters, no free-text search.

**Shipped (build ✓ — `COMMIT MEDIA HUB SEARCH.command`):** `media-hub.jsx` — search box (title /
SKU / alt text / description) above the grid on every tab except Items (which keeps its own);
filters client-side, resets pagination, distinct empty-state copy for "no matches" vs. "nothing
tagged yet."

**Also resolved this session (photo→item matching, via `match-photos-to-items.mjs` dry-run +
live Cloudinary lookup + item-reference cross-check, no Media Hub hand-editing needed):**
Asiago Stagionato + Asiago Fresco already fixed live · Vezzena whole/quarter assigned (04181 /
04046 — note the "300g-atm-usa-**04108**" filename token is stale, not a real code) · **Piave
turned out to be two distinct products, not a pack-size split** — Mezzano = 40107, Vecchio
(label confirms "stagionato oltre 180 giorni" = >6mo) = 40109, not 40158 · Lagorai whole/quarter
resolved · Sharp Provolone resolved to 01032 "HALF CYLINDER" by label + shape (the other 3
candidate SKUs are Piccante, Mild, and a roped variant — none matched the photo). Writes not
yet pushed — pending Rick's go-ahead (session paused to build the search bar instead).

**Open:** apply the resolved SKU writes above via `match-photos-to-items.mjs --write` (or by
hand in Media Hub) · then `npm run media:refresh` needs `CLOUDINARY_API_KEY`/`_SECRET` (Netlify
only, not in this sandbox) · 71 long descriptions still blank · dedupe check on the two
identical Vezzena hero-shot files (`1noi0y` / `1d-tf4`).

---

## 2026-07-04 (cont.) — Product NAME in item truth + bulk photo→item matching + catalog rule

**Decisions (Rick).** (1) Media Hub holds the IDENTITY — stale image titles like "Asiago di
Alpeggio" (not a real product name; the product is **Alpeggio Cheese**) must never display.
(2) **The Product Catalog shows ONLY product photos WITH item codes** — uncoded/brand/lifestyle
imagery stays in the Media Hub. (3) Catalog lightbox gets **Download PNG + Share** along with
the link.

**Shipped (build ✓, validate ✓ — `COMMIT PRODUCT IDENTITY MATCH.command`):**
- **Item record gains `name`** (identity field, first in the record): items.js + Items dialog +
  asset-editor item box + view box. Every consumer surface displays `item.name`, never a title.
- **Seed = catalog ∪ item-reference:** `build-items-seed.mjs` merges
  `source/item-reference.json` (the availability-sheet truth list) — 71 full records + 41
  identity-only = **112 items**; trailing weights lifted into the weight field.
- **`scripts/match-photos-to-items.mjs` (new)** — the bulk SKU→photo pass: exact item-number
  tokens in filenames, single-SKU product-name matches, bad-code fixes. Round-trips
  media-update (which replaces tags/context wholesale) so nothing gets wiped. `--write` run:
  **12 links written** (8 token + 3 name + 20742→20724 Alpeggio fix), 11 pushed to Cloudinary
  context (durable across re-syncs), images.json now **47 coded / 103**.
- **Product Catalog = ITEM-DRIVEN MIRROR (Rick, final model same session):** the page mirrors
  the price-list item numbers / item data — one row per item record (112), photos + short/long
  descriptions attach FROM Cloudinary by item number. Items without photos still render ("No
  photo yet" tile — the gap is visible, not hidden). Multi-photo items get a thumbnail strip in
  the lightbox. Search = name/item #/descriptions/certification; stats = Items · With photos ·
  Photos; lightbox adds **Download PNG** (fl_attachment,f_png) + **Share** (native sheet; link
  copied either way) alongside Copy share link. The old freehand edit panel + edits
  export/import UI is GONE — identity/copy edits live in Media Hub → Items; the legacy local
  edits overlay still applies read-only so hand-fixed codes keep linking.

**Also this session:** **Product catalog gets a sidebar tab** (Rick) — buyer-catalog is now a
featured tool in all three configs; sidebar order: Dashboard · Pricing & Inventory · CRM ·
Campaigns · Orders · **Product catalog** · Content Engine · Storefront; tab renders CatalogPage
natively, dashboard card + deep links unchanged · card title casing "Product catalog" (matches
the Media hub card)
· **footer build-stamp shipped** (vite `define` bakes build time into the sidebar footer;
answers "am I on the latest deploy?" at a glance — the 7/2 quick-win, built after today's
stale-cache repeat) · **one-build question settled with proof:** montitrentini.cheeseshoptech.com
and cheeseshoptech-platform.netlify.app returned the SAME deploy (identical ETag) — one site,
many doors; the "Image Catalog" sighting was browser cache (live bundle greps 10× Product
Catalog, 0× Image Catalog).

**Open:** 4 photos carry codes in NO truth source (05123, 05205, 20220, 01315) — hidden from
the catalog until fixed in Media Hub or added to the item list · 11 photos match multi-SKU
products (pack ambiguous — assign SKU in Media Hub) · ~49 uncoded photos stay Media-Hub-only
by design · images.json manifest refresh pending Rick's Media Hub pass finishing.

---

## 2026-07-04 — Image Catalog → PRODUCT CATALOG, wired to item truth

**Decision (Rick).** The buyer-facing catalog is renamed **Product Catalog** and its item
numbers + descriptions now come from the Media Hub item-truth doc in Cloudinary — not freehand.

**Verified first:** `monti-trentini/copy/items.json` live on Cloudinary already carries
**71/71 items with item numbers + short descriptions** (a Media Hub save persisted the seed
merge) — no publish step needed. Long descriptions still blank (existing open item).

**Shipped (build ✓, validate:clients ✓ — `COMMIT PRODUCT CATALOG.command`):**
- Rename in `App.jsx` (page title), `buyer-catalog.jsx` (headers), and all three client
  configs (montitrentini · demo · _template).
- `buyer-catalog.jsx` loads the items doc (`loadItems(resolved.cloudinaryFolder)`): grid tiles
  show the **spec line** (weight · pack · milk · age) when a record exists; lightbox shows spec
  line + `descriptionFor(…, 'long')` (freehand only when no record) + certification row;
  "Item code" → **"Item number"**; Edit-details hides the freehand Description field for
  SKU-linked images and points to Media Hub → Items (never freehand item copy).

**Open:** catalog search doesn't index item descriptions yet · unmatched images (no `code`)
still fall back to category/freehand — the bulk SKU→photo matching pass remains the fix.

---

## 2026-07-04 — Media Hub = item truth: records, seed, tag-driven fields (2026-07-03→04 session)

**Decision (revised same-session): Media Hub owns the item IDENTITY + COPY record — item number,
pack size, weight, UPC, milk type, minimum age, short description, long description,
certification. Pricing strictly NOT here** (stays in the Custom Price List Creator — one mind,
one body). Media Hub = organizational portal + distribution hub for all images and item copy.

**Shipped (4 commits via buttons):**
- **Item records** (`src/lib/items.js` + `items-panel.jsx` + Items tab first in the rail): one raw
  JSON per tenant at `{tenant}/copy/items.json` in Cloudinary — `items-save` fn (signed upload,
  overwrite+invalidate), `items-get` fn (version-aware, cache-proof). Consumer API:
  `descriptionFor(doc, sku, 'short'|'long')` for slides/blogs/emails/social.
  → `COMMIT MEDIA HUB ITEMS.command` (PUSHED — verified live on prod 7/3)
- **Spec line + share** — `specLine()` (weight · pack · milk · age) rides in the asset-dialog
  header, grid tiles, Items list; long-description toggle; **Download PNG** (fl_attachment,f_png)
  + **Share** (native sheet / clipboard). → `COMMIT ITEM SPECS AND SHARE.command`
- **All-products seed** — `scripts/build-items-seed.mjs`: catalog.json → items-seed.json
  (**71 SKUs / 34 products**; weight from packing, pack from pieces/case, milk+age+blurb from
  marketing block, DOP/PDO/IGP detection). `loadItems()` fills blanks only — Media Hub edits
  always win. Re-run on catalog change. → `COMMIT ITEMS SEED ALL PRODUCTS.command`
- **Tag-driven fields + production tag** — the `product-catalog` usage decides the edit form:
  product photos = SKU + item record; non-product (cow/pasture/press) = ONE description field
  (Cloudinary context `description=`). New usage tag **production** (Production / Cheese making)
  in lib + both function whitelists. Asset tiles: usage badges removed (clutter), spec line
  instead. → `COMMIT TAG DRIVEN FIELDS.command`

**Env verified:** `VITE_MEDIA_BACKEND=cloudinary` already set in Netlify — live mode active, no
new secrets (functions reuse the Cloudinary trio). **Standing rule adopted: every code change
ends with a double-clickable COMMIT button.**

**Open:** long descriptions blank for all 71 SKUs (draft from catalog facts or queue tasting
notes to the client) · bulk SKU→photo matching by public_id · wire Studio/Content Engine to
`descriptionFor()` · optional: Price List Creator reads identity specs from items.json ·
note: items-save/items-get functions are unauthenticated like media-update — fine for now,
harden with the platform auth pass.

---

## 2026-07-02 — Session close: pricing proposal v1.1 + economics decisions (late night)

**Pricing proposed (`docs/PRICING_PROPOSAL_v1.1.md` — separate numbers doc; structure stays in
PRICING_AND_ENGAGEMENT_MODEL.md).** Stand-Up Month onboarding $2,500 / $5,000 (Monti-scale) /
$9,500+; monthly tiers Portal $650 · Orchestration $1,500 (target) · Growth Partner $3,000;
buyout N=18 proposed; founding-client lever = half the onboarding fee credited across months
2–4, never discount the monthly. Sales motion: demo tenant showroom → "with YOUR products"
anchor → assembled-alternative comparison → close on the Stand-Up Month. **Status: PROPOSED —
flinch-test on the first 2–3 prospects before locking.**

**Agent economics decided (same conversation):** Rick's $100/mo Max plan (+$109 extra usage) =
the Cowork/build meter — covers all session work, canNOT fund in-app agent calls. Embedded
Stage-2 agents need a separate Anthropic Console (API) account, pay-as-you-go: ~$5–15/mo per
tenant, ~2–4¢ per compose (Sonnet), spend cap ~$25/mo covers multiple tenants. **One Max plan
total (Rick's workbench) + ONE API account for all client tenants — never a $100 plan per
client.** Prices verified 2026-07-02: Haiku 4.5 $1/$5 · Sonnet $3/$15 · Opus $5/$25 per M tokens.

**Fit-fix verified live** via in-browser inspection (fresh tab: slide fills the pane at 1177px).
Recurring lesson recorded: **hard-refresh (Cmd+Shift+R) before judging any deploy** — stale
bundle cache produced three false alarms tonight. Offered (not built): footer build-stamp.

---

## 2026-07-02 — Studio Director Stage 0+1 SHIPPED (deterministic Auto-compose)

**The teed-up highest-leverage build (CONTENT_ENGINE_WIRING_SPEC §3), now real.**
`src/lib/studio-director.js` — `directDraft({resolved, user, opportunity})`, pure resolution,
no AI, $0: composes a full deck (cover → statement → story → image beat → product range →
closing) from the tenant's own systems. Kit voice → text slots (Stage 1 taste rules: statements
take the shortest line, story slides the long blocks); Media Hub → image slots (slot-tag →
12-tag-taxonomy crosswalk, approved-first, SKU-linked preferred, never the same image twice);
catalog → product slots (opportunity SKUs → featured → catalog order); Monti sample contact
blanked so it can't leak cross-tenant. **SlideStudio** gains an Auto-compose button (empty-state
hero + toolbar). **ContentStudio** feeds the Director the last Opportunity Compose draft
(headline/storyKeys/skuCodes) — wire 5 closes: market intelligence → Studio end-to-end.
**Fit fix (after Rick's live screenshot — `COMMIT STUDIO FIT FIX.command`):** the preview's
ResizeObserver attached at Studio mount (template gallery — pane didn't exist yet), so the main
slide collapsed to minimum width in prod. `useFitWidth` now takes an `active` flag, measures on
attach, re-measures on nav-collapse/Focus changes, ignores 0-size rects. The slide now fills the
pane; collapsing the left nav grows it further — which was Rick's point: nav collapse buys the
filmstrip room AND a much bigger main slide.

**Plus workspace view options (same session):** collapsible left nav — lever in the topbar,
collapses to an icon rail, persisted per browser (`app-shell.jsx`, serves every page not just
the Studio) · Studio **Focus mode** (auto-expand the slide, panels hide) · **fullscreen current
slide** (Expand button) · **fullscreen slide show** (Play; ←/→/Space/click advance, Esc exits,
position returns to the editor on close).

**Plus the one-viewport workspace (Rick's UX rule: less scrolling = faster design + continuity):**
vertical filmstrip rail (left, scrolls) · height-fitted 16:9 preview (ResizeObserver) · inspector
scrolls internally (right) · deck title inline in the toolbar · per-slide template switcher.
Zero page scroll while editing on desktop; mobile falls back to stacked flow.
Build ✓ — ship via **`COMMIT STUDIO DIRECTOR.command`**. This is the substrate for agent A1
(ONBOARDING_AND_AGENTS_SDD Part 3); Stage 2 (AI pass) plugs in behind the same call once
Anthropic billing + spend cap are set (Rick).

---

## 2026-07-02 — Pricing & Inventory data-intake state (real app, not a mock)

**Decision (Rick).** The template Pricing & Inventory must be **the duplicate encoded app**, not
a mock/dead shell — and its empty state must carry the data-upload path: preferred file formats +
the same delivery process as live tenants = **a shared Google Drive file** (until a future client
needs different). In-app upload stays roadmap.

**Shipped (build ✓ — `COMMIT PRICING INTAKE.command`).** `PricingTool` now renders a `DataIntake`
panel when `catalog.products` is empty: Step 1 download templates 01/02/03 from
`/onboarding-kit/` (with what each feeds + cadence) · Step 2 fill (Excel or Google Sheets,
example-row guidance, "engine never invents pricing") · Step 3 share a Drive folder view-access
to hello@cheeseshoptech.com — the shared file IS the pipeline, weekly inventory sync, no
re-uploads. Applies to ANY tenant with an empty catalog (demo today, every new client tomorrow).

---

## 2026-07-02 — Onboarding Hub on the house Command Center (late night)

**Decision (Rick, after seeing the deployed round).** cheeseshoptech.com (house) = **the hub for
new-client onboarding**: the template apps visible ON the Command Center, not only behind
`?client=demo`.

**Shipped (build ✓ — commit via `COMMIT ONBOARDING HUB.command`).** New
`src/components/home/onboarding-hub.jsx` on the house dashboard: template app cards from
`_template.json` (each opens the demo tenant at that app, new tab), "Open the template portal"
launcher, and intake-kit download tiles (kit copied to `public/onboarding-kit/` — blank templates,
safe public; page sits behind the house gate). Visible to admin + client-admin house sessions;
Agency Console stays admin-only. Sending addresses locked same night: **Sales@montitrentini-usa.com**
(Monti outreach, HubSpot Starter, plaintext + hosted-page pattern) + **hello@cheeseshoptech.com**
(all things CST) — both live Google Workspace mailboxes.

---

## 2026-07-02 — Template tenant + onboarding kit + agents SDD (new round)

**Decision (Rick).** New development round: (1) the Monti app set copied into the platform as a
content-free **template tenant**; (2) a **client onboarding intake kit** (templates + instructions
per client department); (3) the **agent roster** scoped — content engine, pricing/inventory,
replenishment, sales projection/production, campaign planning. Spec: `docs/ONBOARDING_AND_AGENTS_SDD.md`.

**Shipped (build clean, `validate:clients` ✓ — commit via `COMMIT ONBOARDING TEMPLATE.command`).**
- **`config/clients/_template.json` upgraded** bare stub → THE CLONE: full Monti-shaped config
  (all modules, six tools, home block) with placeholder copy. Still skipped by registry/validator.
- **`src/data/_template/`** — empty-but-schema-valid data set for all nine seam files; the target
  shapes the onboarding kit maps into. Brand-kit placeholder hexes blanked so config colors win.
- **`demo` tenant LIVE** (`config/clients/demo.json` + `demo:` registered in pricing/images/
  brandKit/attention/signals/market-news seams → `_template` data). `?client=demo` renders every
  app's empty state — QA reference + prospect showroom. CRM/campaigns fall through to empty mocks.
- **`onboarding-kit/`** (client-facing): 00 README (owners/cadence/ground rules) · 01 Product
  Catalog & Pricing.xlsx (Products + Pricing Rules sheets) · 02 Inventory Availability.xlsx
  (SKU Summary + Lot Detail, weekly) · 03 Standing Orders & Commitments.xlsx · 04 Brand Asset
  Checklist.md (design team) · 05 Marketing Content Worksheet.docx (voice/story blocks/calendar) ·
  06 Sales History.xlsx (**the forecasting foundation** — new intake, feeds agents A3/A4).
- **`docs/CLIENT_ONBOARDING_GUIDE.md`** (internal runbook): Step 0 stand-up-a-tenant (~15 min,
  config only) → kit → per-file ingestion map → verification. Known gaps listed (import-catalog
  script, generic inventory parser, House Console checklist UI).

**Agent roster scoped (SDD Part 3).** Build order: Studio Director Stage 0 → A1 Content Agent
(data ready today) → A2 Pricing Agent → sales-history intake → A3 Replenishment → goals.json +
HubSpot deals → A4 Projection/Production + A5 Campaign Planning. Key finding: **sales history is
the gap** for everything forecast-shaped — hence kit file 06.

---

## 2026-07-02 — Content Engine reorg + dashboard priority window + coming-soon login + Director spec

**Decision (Rick).** The portal UI reorganizes around the two-engine model: **"Tools" nav →
CONTENT ENGINE**, and the **Dashboard = start-the-day operations view**.

**Shipped (build clean, `validate:clients` ✓ — commit via `COMMIT CONTENT ENGINE UI.command`).**
- **Content Engine page** — `src/components/tools/content-engine-page.jsx` (replaces ToolsPage
  route; key stays `tools`). Per-app cards: Content Studio · Content Library · Brand Systems
  (external → BSE) · Brand Kits (house-admin) · Brand Voice (→ BSE Voice) · Media Hub. Platform-
  shared registry, role-filtered. Their old top-level tabs removed; routes stay reachable via
  `NON_NAV_PAGES` (deep links + engine cards + compose all work); Brand kits render is RoleGated;
  Media hub tab kept ONLY for pr/influencer/creator (their whole portal is the hub).
- **Dashboard leads with operations** — Monti `tools` config reordered: **Pricing & Inventory ·
  CRM · Trade Portal · Campaigns** (new campaigns tool card + `megaphone` icon), then Image
  Catalog · Storefront. Media hub card moved off the grid (lives in the Content Engine). Grid
  heading "Tools" → "Operations".
- **Priority window** — `priority-card.jsx` at the top of the dashboard: **"Priority — response
  needed"** (URGENT emails awaiting reply, deadline tasks). New seam `lib/attention.js`
  (`VITE_ATTENTION_BACKEND`, mock bundle `data/montitrentini/attention.json`, Sample chip);
  planned live source = a mailbox-reading Netlify function (gated on the sending-address decision,
  Prereq #3). Renders nothing when clear.
- **At a glance order** — Opportunities → **Active campaigns → Market news** → pipeline/activity/
  needs-attention (command-center.jsx).
- **Coming-soon login** — quiet bottom-right **Log in** on `public/coming-soon/index.html` +
  `/login` 302 → platform house gate in `_redirects`. **Live only after Rick re-drops
  `public/coming-soon/` on the "cheeseshoptech" Netlify Drop site** (not git-connected).
- **`docs/CONTENT_ENGINE_WIRING_SPEC.md`** — the Studio Director: how Content Studio wires to
  Media Hub/Cloudinary · Brand Voice · Design System · Brand Kit · templates, and the intelligence
  as an escalating resolver pipeline: Stage 0 deterministic auto-fill (build first, $0) → Stage 1
  taste heuristics → Stage 2 AI pass (unparks AI_TOOL_EMBED, selection-only, no image gen) →
  Stage 3 dispatch awareness. Gap #1 named: BSE→brand-kit import + **gate the BSE** (still open).

**Unblocks / next:** Stage 0 `lib/studio-director.js` + Auto-compose button · BSE kit-import on
Brand Kits page · attention-list function once the sending address exists.

## 2026-07-02 (cont.) — ONE ADDRESS + sidebar order + branched-page back buttons + sides spec

**Decision (Rick).** Consolidate cheeseshoptech.com + montitrentini.cheeseshoptech.com under ONE
point of reference — the platform site serves everything; the Netlify Drop coming-soon site
retires. Also on record: **onboarding tools live on the CST side** (correction from "client side").

**Shipped (build clean).**
- **Apex = ComingSoon + Sign in, served by the platform.** `App.jsx` apex render swapped
  LandingPage → `ComingSoon` (kept for launch, one-line swap-back comment). `coming-soon.jsx`
  gains a quiet footer **Sign in** → `?app=1` → gate. `docs/DOMAIN_CONSOLIDATION_RUNBOOK.md` =
  Rick's ~10-min DNS/Netlify steps (alias on platform site, apex record in Cloudflare, verify,
  retire Drop site). After the flip: coming-soon edits deploy via git (no re-drops), /tools/* +
  /series/* serve natively (proxies obsolete).
- **Sidebar order (Rick):** Dashboard · Pricing & Inventory · CRM · Campaigns · Orders · Content
  Engine · Storefront (`NAV_ORDER` sort; featured tabs slot by config key). Catalog off the
  sidebar — reachable via its dashboard card (`catalog` added to `NON_NAV_PAGES`).
- **Back buttons on branched pages** (house rule: every page branched off the site gets one):
  BSE + Queso Couture — quiet `< Back` text line under the eyebrow, right side; history-back when
  referred, else cheeseshoptech.com. ⚠️ Edited in `public/` — copy upstream to the
  `Projects/Monti trentini Ecommerce strategy/` sources or the next re-copy overwrites.
- **`docs/PLATFORM_SIDES_SPEC.md`** — the dividing line: **CST side = factory** (template
  client-build apps + the 5-step onboarding flow: kit import → item-code importer → bulk
  image/tag → branded blank templates → config clone) vs **client side = product** (functional
  apps + proprietary data/brand system). Includes the 10-row wiring board ("all apps live and
  communicating") with priority order; SEAMS panel is its live twin.

**Rick's actions to go live:** double-click `COMMIT CONTENT ENGINE UI.command` → run the DNS
runbook → verify apex Sign in → (still open) sending-address decision.

## 2026-07-02 (cont. 4) — SESSION CLOSE — everything live + pushed

**Final state, all verified:** apex/www/admin/montitrentini all serve `cheeseshoptech-platform`
with valid SSL · old Drop project DELETED (netlify.app 404s — domain can't wander back) · repo
`phase-2-6-build` in sync with origin (Content Engine reorg + BSE integration + coming-soon Sign
in all deployed). The day's shape: **UI reorg (Content Engine + operations dashboard + Priority
window) → BSE integrated + gated → one-address domain consolidation with three doors.**
Open items carried: sending-address decision (blocks 3 wires) · copy BSE/QC edits upstream to
Projects sources · Studio Director Stage 0 = next build. Memory updated (`cst-domains-and-doors`).

## 2026-07-02 (cont. 3) — DOMAIN CONSOLIDATION EXECUTED — one address, three doors, LIVE

**Done (Rick + Claude, verified live from the sandbox).** The DOMAIN_CONSOLIDATION_RUNBOOK was
executed and extended with a staff door:
- **cheeseshoptech.com** → the platform site (coming-soon + quiet Sign in). PRIMARY domain.
- **www** → 301 to apex. **admin.cheeseshoptech.com** → NEW hidden house door (reserved
  STAFF_HOSTS subdomain, straight to the gate; Cloudflare CNAME DNS-only). 
- **montitrentini.cheeseshoptech.com** → client door, unchanged. Pattern going forward: every
  client gets `<brand>.cheeseshoptech.com` (professional norm; clients never see the house).
- Legacy `/tools/brand-systems-engine/` 302s to the gated in-app page ✓; `/series/queso-couture/`
  public ✓. Let's Encrypt reissued for all four names.
- Netlify project renamed **cheeseshoptech-platform** (was display-named
  "montitrentini.cheeseshoptech.com" — that name kept luring the domain to the wrong site).
- Gotchas hit + solved: domains were attached to the old Drop site (had to remove alias → www →
  primary, in that order); "Add a domain" was clicked once on the wrong project (byte-compare
  caught it); apex/www invisible-cert phase until Renew certificate after adding both.
- **Old Drop site ("cheeseshoptech.com" project) is now unused** — delete it to prevent the
  domain wandering back.

## 2026-07-02 (cont. 2) — BSE INTEGRATED into the app under Content Engine (and thereby GATED)

**Decision (Rick).** "Integrate [the BSE] into the main site under Content Engine" — the CST.com
portal, not a public path.

**Action.** The engine's single-file HTML moved INTO the app: `src/assets/brand-systems-engine.html`
(back-button block stripped — portal chrome does nav), lazy-loaded via `?raw` dynamic import
(separate 220 KB chunk, only fetched when opened) and rendered in an `iframe srcDoc` by the new
`src/components/brand/brand-systems-page.jsx`. Internal route **`brand-systems`** (NON_NAV_PAGES),
**RoleGated admin/client-admin**. Content Engine cards "Brand Systems" + "Brand Voice" now route
internally (were external links). `srcDoc` inherits the app origin, so the engine's localStorage
kits share the portal's store. **The ungated public copy is REMOVED** — commit script does
`git rm -r public/tools/brand-systems-engine` (sandbox can't delete on the mount) — which **closes
the "gate the engine" open item** from 2026-07-01. Old public URL will 404 by design; the QC
showcase room stays public (portfolio/lead magnet). Build clean.

**Iterate note.** BSE source of truth remains `Projects/Monti trentini Ecommerce strategy/` —
re-copy now targets `src/assets/brand-systems-engine.html` (strip the back block), not `public/`.

## 2026-07-01 (cont. 3) — Brand Systems Engine LIVE + Queso Couture series + brand-domain proxy

**Shipped (all verified live on cheeseshoptech.com).**
- **Brand Systems Engine v1** — `public/tools/brand-systems-engine/` (single-file, self-contained).
  Closes **Standing Prerequisite #1** (brand voice doc → living app). Headless architecture: portable
  brand-kit JSON is the contract; CST brands the chrome, client kits carry their own systems (`brandSystem`
  vars re-skin the workspace). Umbrella houses three disciplines: **Brand Guide · Brand Voice · Brand Design**.
  Renamed same-day from "Brand Voice Engine" (old `/tools/brand-voice-engine/` path removed).
- **Canonical MT kit v1.1** — rebuilt from `Monti_Trentini_Brand/` sources (Brand_Guide.md 2026-05-24 audit
  + token JSONs): real palette (Forest Green #064E22, Heritage Cream, Pantone refs, use ratios), Cora italic +
  Futura PT (Adobe kit `med2peg`), official motto/mantra, Casa Finco 1925 history, 800 m dairy (prefer over
  600 m generic in MT copy). Kit + blank template + schema README:
  `Projects/Monti trentini Ecommerce strategy/Brand_Systems_Templates/`.
- **Queso Couture** — CST style play under **Brand Design**, FULLY SEPARATE from MT (no client product claims
  on plates; charter + plate register in `Projects/.../CST_Queso_Couture/00_Series_Charter.md`). Plates 02–03
  clean; Plate 01 predates the split (carries MT claims) — retire/rework before public use. Showcase room
  live at `public/series/queso-couture/` — atelier-colophon voice (no sales pitch), "Correspondence" intent
  capture (interim **mailto → rick.posada@outlook.com**).
- **Brand-domain routing solved.** Root cause of 404s: cheeseshoptech.com is held by the separate
  **coming-soon Netlify site** ("cheeseshoptech", Netlify Drop), not cheeseshoptech-platform. Fix: dropped
  `public/coming-soon/` (now incl. `_redirects` + `robots.txt`) onto that site — `/series/*` and `/tools/*`
  now **proxy (200)** to `cheeseshoptech-platform.netlify.app`. Public face stays "Launching soon";
  unlisted rooms ride the brand domain. Platform `robots.txt` also added (Disallow /series/ /tools/).

**Architecture decision (Richard).** Two engines, separate but connected: **Brand Systems Engine** = source
of truth (kits out) → **Content Engine** = assembly line (campaigns out). Kit JSON is the conveyor.
Design series library doubles as CST's portfolio/lead magnet ("cheese brands see themselves in it").

**Commits:** `a34ae9e` (pages + robots), rename commit (BVE→BSE path), `6b58f1f` (coming-soon proxy files —
**unpushed at session end**; proxy is live via Drop regardless). Note: tonight's commits were made from the
sandbox before re-reading the sandbox-git rule — locks were self-healed, nothing stranded; rule respected
going forward (docs edits left uncommitted for `COMMIT BRAND SYSTEMS ENGINE.command`).

**Unblocks / next:** (1) **gate the engine** — unlisted but ungated, carries full MT kit; (2) **sending
address (Prereq #3)** — now also gates QC mailto→Make swap; (3) first QC Pinterest dispatch (UTM
`?utm_source=pinterest&utm_campaign=qc_series`); (4) MT-LP-001 build; (5) MT board deck (project deliverable).

---

## 2026-07-01 (cont. 2) — Push unblocked (PAT auth) + Opportunity Engine Slice 3: Market News card

**Deploy fix (root cause found).** The recurring "push not working": (1) GitHub HTTPS auth had no
credential — Terminal was silently prompting `Username for 'https://github.com':` inside a window that
closed unseen. Fixed with a classic PAT (repo scope, no expiration, note "MacBook push"), now stored in
macOS keychain — future pushes just work. (2) The stale `.git/index.lock` blocking commits is created by
the *Cowork sandbox itself*: it can create files under `.git/` but not delete them, so any lock-taking
sandbox git command (even `git status`) strands a lock. Rule going forward: sandbox uses
`GIT_OPTIONAL_LOCKS=0`; `FIX GIT LOCK AND PUSH.command` (repo root) self-heals lock + push on double-click.
`7f94011` + `1742a94` confirmed on origin 2026-07-01 ~17:00; Netlify deploy triggered.

**Action — Slice 3 (spec §5), on mock.** The Tier 1 "morning read" + the Tier 1→2 bridge:
- `data/montitrentini/market-news.json` — 6 sample items (trade + consumer), spec §2a shape.
- `lib/market-news.js` — `getMarketNews()` behind `VITE_MARKETNEWS_BACKEND` (mock|function),
  `marketNewsAreSample`, `NEWS_CATEGORIES`. Newest-first sort in the seam.
- `components/home/market-news.jsx` — `MarketNewsCard`: Trade/Consumer tabs, headline · source · date
  rows opening the article, Sample chip. House-only **"→ Signal"** action distills a headline into a
  Tier 2 signal (deterministic `distill()` — no AI pass yet).
- `lib/signals.js` — localStorage overlay (`cs-signals-local-<tenant>`, same model as brand kit /
  Library catalog): `loadLocalSignals` / `addLocalSignal` / `removeLocalSignal`, merged in `getSignals()`.
  Promoted signals immediately feed `rankOpportunities`.
- `command-center.jsx` — renders the card in the At-a-glance grid; `signalsVersion` bump on promote
  re-ranks the Opportunities lane without flashing the whole strip.
- `agency-console.jsx` — `market-news` row added to the SEAMS integration panel.
**Status:** `npx vite build` clean (to `/tmp/dist-check`; sandbox can't empty `dist/` on the mount —
same create-not-delete asymmetry as the lock). Next: wire the real overnight source (scheduled morning
research task writing `market-news.json` — spec-recommended v1), then Slice 4 (one live signal feed).

## 2026-07-01 (cont.) — SKU pre-select + Slice 2 (HubSpot companies, scoped) — committed, NOT yet pushed

**Action — SKU pre-select (closes the Slice 0+1 gap).** `command-center.jsx` now passes
`getPricingData(resolved)?.catalog` into `rankOpportunities` — the catalog arg was never passed before, so
`skuCodes` was silently always empty and Compose never pre-selected anything. Also fixed 5 product-id refs in
`signals.json` that didn't match `catalog.json` (best-effort placeholders flagged in the prior handoff):
`grana-padano-dop`→`grana-padano`, `parmigiano-reggiano-dop`→`parmigiano-reggiano-pdo` (×2),
`provolone-dolce`→`mild-provolone`. All 8 signals now resolve cleanly against the catalog.

**Action — Slice 2, scoped to companies/contacts (deals don't exist yet).** Tested the live
`crm-summary` function directly: `HUBSPOT_TOKEN` already existed in Netlify and works — 697 contacts, 591
companies, **0 deals**. Since the mock CRM shape (`pipeline`/`orders`/`invoices`) is deal-centric, decided
(Rick) to scope Slice 2 to real accounts only and leave pipeline/invoices on mock until deal-stage tracking
exists in HubSpot for real — rather than ship a dashboard with a misleadingly-empty pipeline.

- `netlify/functions/crm-hubspot.js` (new) — read-only, paginated HubSpot companies + contacts count. Leaves
  `pipeline`/`orders`/`invoices`/`activity` empty on purpose (see scope note above).
- `lib/crm.js` — `getCrmData()` branches on `VITE_CRM_BACKEND`: `mock` → bundled sample, `hubspot` → the new
  function, anything else → the existing Make-webhook proxy (unchanged).
- `lib/opportunities.js` — `accountsFromCrm()` now also ingests `crm.companies`, so real HubSpot accounts
  (with their Channel) flow into the ranking.
- `command-center.jsx` — Pipeline-by-stage / Recent-activity cards now hide when their array is empty,
  instead of rendering misleading all-zero rows once a real backend is live.
- **Company property `Channel` internal name confirmed live in HubSpot as `channel`** (Settings > Properties
  > Company properties > Channel > Internal name) — matches what the code assumed, no fix needed.

**Status.** Committed as `1742a94` (on top of `7f94011`) — build compiles clean. **NOT yet pushed** as of
this writing; multiple push attempts from the Cowork sandbox and from Rick's Terminal have not landed on
`origin/phase-2-6-build` (still shows "ahead 2" after `git fetch`) — root cause not yet confirmed, see
`HANDOFF.md` for the exact retry steps. Netlify env var `VITE_CRM_BACKEND=hubspot` was added with **Builds**
scope (all scopes) — confirmed correct scope (Post processing, the first attempt, would NOT have worked;
`VITE_*` vars need the Builds scope since Vite reads them at build time) — but the value can't take effect
until the push lands and a new deploy runs.

**Unblocks (once pushed + deployed).** Live re-test of `crm-hubspot` endpoint + Opportunities lane showing
real Monti accounts. **Next after that:** Slice 3 (Market News card + scheduled morning brief, no connector
needed).

---

## 2026-07-01 — Market Intelligence / Opportunity Engine — Slice 0 + 1 shipped (on mock)

**Decision.** Extend the Content Engine from one input (brand voice) to three — **brand voice + market
signal + customer profile** — fused into ranked "who / why-now / what-to-say" content actions. The brand
story is the **selector** (brand-fit scoring picks the angle), not a passive input. Full architecture:
`docs/MARKET_INTELLIGENCE_SPEC.md`.

**Action — Slice 0 (reconcile).** Salesforce is dead; **HubSpot IS the CRM**. Fixed stale Salesforce refs
in `lib/crm.js`, `command-center.jsx`, and `agency-console.jsx` (`SEAMS`: CRM `liveWhen:"hubspot"`, added a
`signals` seam row). Added the channel→audience crosswalk `CHANNEL_TO_AUDIENCE`/`audienceOf` in `crm.js`
(Distributor→distributor · Restaurant/Chef→foodservice · Specialty grocer + Retail chain→retail ·
Partner/Producer→excluded).

**Action — Slice 1 (engine, on mock).** `data/montitrentini/signals.json` (8 real Monti signals) ·
`lib/signals.js` (`getSignals` seam, `VITE_SIGNALS_BACKEND`) · `lib/opportunities.js` (`rankOpportunities`,
brand-fit-weighted 0.45/0.30/0.25) · `emptyProposal()` gains `buyerId` + `signalKeys` · **Opportunities lane**
on the Command Center → **Compose** seeds a proposal draft and jumps into the builder. Compose target = the
previously **orphaned `ProposalBuilder`, revived behind a non-nav `compose` route** in `App.jsx`
(ContentStudio/SlideStudio keeps the "proposals" nav slot).

**Status.** Build compiles clean (`vite build` — only the pre-existing chunk-size warning). Engine verified
against mock CRM: Eataly (distributor, active reorder) tops at 97 with the supply-chain angle. **Uncommitted
on disk — Rick reviews, then pushes.** No new credentials used.

**Unblocks.** Demo-ready proof of the "Content Engine wired to the CRM" pitch on mock — waits on no one.
Next: Slice 2 (wire HubSpot read-only, needs `HUBSPOT_TOKEN` in Netlify env) · Slice 3 (Market News card +
scheduled morning brief) · pass a real `catalog` into `rankOpportunities` so Compose pre-selects SKUs.

---

## 2026-06-20 (cont.) — Wheel: motion locked in Blender, photoreal ceiling, pivot to illustrated

**Track A (Higgsfield photoreal intro) — stalled on the rigid tilt.** Higgsfield
(Cinema Studio / Seedance) renders gorgeous photoreal cheese but **morphs** the
wedge instead of a rigid hinge — failed repeatedly across v2/v3 prompts, end-frame
anchoring, and the "imitate the diagram" wording. Checked Higgsfield's Edit tab:
Grok Imagine Edit / Kling Video Edit exist but there's **no outline→photoreal
restyle (ControlNet) mode** — Method A is a dead end for line-art input.

**Blender owns the MOTION.** Built the exact rigid hinge: a wedge tilts up 90°
about its **bottom outer rim edge** (the lever), rigid, no morph, wheel stays
whole. Scripts in `design/asiago-wheel/handoff/blender/`: `previz_rigid_tilt.py`
(spin+flyover), `outline_motion.py` (Freestyle OUTLINE plate, photo perspective,
wedge right-of-center via BASE_SPIN, stand+hold), `solid_standing.py`,
`photoreal_standing.py`. Renders + `wedge_storyboard.png` + `key_*` frames + the
clips copied to **`~/Downloads/Wheel Story/`**. Geometry/axis spec:
`docs/WEDGE_GEOMETRY_AND_AXIS.md`.

**Photoreal-in-Blender hit a ceiling (Rick: "terrible").** Procedural materials =
smooth golden "clay" (no skin); the only photo texture maps we have
(`textures/paste_*`,`rind_*`) are low-res web crops = bad. True photoreal needs a
GOOD texture source we don't have (high-res cut-face/rind photo, or Firefly
seamless textures). **Decision (Rick): drop photoreal, focus the ILLUSTRATED
animation** per `docs/CST_OPENING_ANIMATION_STORYBOARD.md`.

**Track B (illustrated explainer) — started.** Built Phase 1, the **data-viz open**:
`prototypes/cst-data-open.html` — an 8-slice pie chart that draws itself on in CST
brand colors with leader lines + typewriter business-term labels (Pricing, Content,
Sales, Inventory, Social Media, Content Studio, Orders, Dashboard). Self-contained
HTML, doubles as a landing asset. **NEXT:** grid + pie→cheese morph → 8 app labels
→ rigid wedge reveal + app window → colored-pencil logo. Blender MCP connector is
installed but the **add-on server isn't started** (N-panel → BlenderMCP → Connect);
until then Blender is driven via console clipboard-paste. **Status.** In progress.

## 2026-06-20 — Asiago wheel goes 3D in Blender + split into TWO tracks

**Action.** Built the Asiago wheel for real in **Blender 5.1** (driven via app
control — the Blender MCP connector never linked). `build_asiago_wheel.py` = a
one-click procedural build: separate wedge objects (apex at origin), beveled,
procedural paste/rind, 3-point studio rig, camera, Cycles. Rendered photoreal
hero stills (`renders/wheel_hero2.png`), then a clay **motion previz**
(`renders/previz.mp4` via `previz_animation.py` — spin + camera push-in + one
wedge eject). Saved `design/asiago-wheel/asiago_wheel.blend`.

**Decisions (Rick).** (1) **Wedge count = 8** (one per portal app:
Dashboard·Campaigns·Catalog·Orders·CRM·Media hub·Tools·Content Studio) — rebuilt
from 7. (2) **Paused photoreal**, pivoted the styled version to an **illustrated
"art + tech"** look — cel-shaded brand tones + Freestyle ink outlines
(`style_illustrated.py`, `renders/wheel_illustrated.png`). (3) Split the effort
into **two parallel, separate tracks** (see `design/asiago-wheel/handoff/docs/
TRACKS_AND_AGENDA.md`):
- **Track A — Higgsfield cinematic intro (photoreal):** rotation + a wedge
  standing (tilt **corrected** vs the awkward v1) + zoom-in + camera flyover,
  **longer** cut, **no app/label text** → then **After Effects** for the CST logo
  build + animation overlay. Assets: Firefly photoreal still + Higgsfield v1 clip.
  Paste-ready prompt: `HIGGSFIELD_INTRO_LONG_PROMPT.md` (+ `HIGGSFIELD_SPIN_TILT_PROMPT.md`).
- **Track B — art-tech illustrated wheel (Blender):** the branded opening
  animation (pie→cheese morph → spin → per-wedge portal reveal with labels) and
  the same-engine real-time **app launcher**. Storyboard + art direction:
  `CST_OPENING_ANIMATION_STORYBOARD.md`.

**Shared.** After Effects is the post home for both (logo/titles/music); the video
engines output clean plates. Higgsfield watermark removes only via a
watermark-free export tier, not the prompt. **Status.** Track A: longer corrected
prompt ready → Rick to generate in Higgsfield, then AE. Track B: 8-wedge model +
illustrated style v1 + clay previz done → refine look, add morph, labels.

## 2026-07-23 — Outreach console VERIFIED LIVE (+ two wiring fixes)

**Fixes after first deploy showed "0 accounts".** (1) HubSpot caps CRM *search* at ~4 req/s per token;
the parallel companies+contacts sweeps could burst past it, and one failed page 502'd the whole payload.
Now: `hsSearch()` with 429/5xx backoff, the two sweeps run **sequentially**, both degrade to partial
results instead of throwing (`59b6f8e`). (2) Nameless HubSpot **auto-created companies** (spawned from
contact email domains) sorted into a "(no name)" wall — they now display their **domain** (`5e3ea69`).
**Verified on staging (Rick's session):** "HubSpot live ✓ 648 accounts" · 817 contacts · 64 sendable ·
full artifact faceplate in tenant green — and the **contact join is live** (A&S Fine Foods → Anthony
Nicolo + email + ✉/↗ actions; A Taste of Italy → Tommy Guarino, Southeast pill). Funnel reads 648 New —
correct: outreach state starts empty (the artifact's localStorage history was never migrated).
**Next candidates:** one-time seed of campaign statuses (8 Emailed / 2 Replied from the artifact's
data + `crm_contacts.json`) · server-side Gmail line (sync + drafts) · CRM hygiene (2 dup-domain
companies; associate contacts properly in HubSpot).

## 2026-07-22 — Outreach console v2: CLONE the artifact faceplate (Rick: port was sloppy)

**What.** Rick's review of v1: the artifact's layout is cleaner — the shadcn translation dropped fields
(owner/contact, region, last-reply, per-row actions) and text broke out of cells. v2 **clones the
artifact 1:1**: its stylesheet scoped under `.crmc` and remapped onto the tenant theme circuit
(`--cs-color-*` — Monti green flows in, no hardcoded brand), its exact structure (header + acct chip ·
6 KPIs incl. Sendable + Meetings/Won · 5 stage bars, clickable · search/region/status/has-email
controls · responses panel · dense 8-col sortable table · footer), native selects/textareas
(color-coded `.s-*` status tints), "Not a fit" stage restored (server whitelist widened).
**New wiring to feed the missing fields:** `crm-hubspot.js` now pulls **all contacts** (paginated,
name/email/phone/company) and joins a **primary contact per company** by normalized company-name —
the import created no association records, so the name join is the honest key; contacts total now
comes from the same sweep. `regionOf()` derives the artifact's four East Coast regions (+ graceful
buckets) from company state — display grouping, not client config. **Frozen data fully gone** (Rick:
"remove frozen data for live") — no embedded contact array; every row is the live HubSpot read.
✉ action = `mailto:` until a server-side Gmail line lands. **Gates.** build + validate:clients pass.
**Status.** Pushed to `phase-2-6-build` → staging; visual verify with Rick's session.

## 2026-07-22 — CRM page → OUTREACH CONSOLE (campaign-CRM artifact ported into the platform)

**What.** Ported the Gmail-native campaign CRM's information design (Prospecting Phase 10 artifact,
`MontiTrentini_Campaign_CRM.html`) into the platform CRM page as a proper module. The artifact's build
existed but was tethered to Claude's artifact runtime (`sendPrompt`, Gmail connector calls) and
browser `localStorage` — the port keeps the design, swaps the plumbing:
- **`src/components/crm/crm-page.jsx`** rebuilt: KPI tiles (Contacts · Companies · Emailed · Replied ·
  Response rate) → clickable **stage funnel** (New→Emailed→Replied→Meeting→Won/Lost, bars) → filters
  (search · channel · status) → **accounts table** (company + site link · location · Channel badge ·
  **editable Status** select · **Notes**) → **Export CSV**. Email-activity card renders when the
  `sales-email-read` scope exists (hides today). Row cap 250 with refine note.
- **`netlify/functions/crm-outreach.js`** (new): per-tenant outreach overlay `{companyId: {status,
  note}}` in **Netlify Blobs** (store `crm-outreach`, key = tenant) — the localStorage replacement.
  GET = any passcode tier; POST = house/client-admin (requireWriteAuth + logWrite), stages
  whitelisted, notes capped 500 chars, doc capped 400KB, last-writer-wins (items-save trade-off).
  Status CANNOT live in HubSpot — the private app is read-only by design.
- **`netlify/functions/crm-hubspot.js`**: company properties extended with `city/state/domain/phone`
  (populated by tonight's import) for the location column + site links.
- **`src/lib/crm.js`**: `OUTREACH_STAGES` + `getOutreach()/saveOutreach()` (debounced full-doc save
  in the page, 401 → "read-only" note).
**Deliberately NOT ported** (need a server-side Gmail integration; artifact-runtime only): Sync
Gmail reply detection · per-contact "Draft email". Next candidates once Gmail is wired server-side.
**Gates.** `npm run build` + `validate:clients` pass. Local visual check stops at the auth gate
(no mock auth; Identity only exists on the deployed site) → visual verify on staging post-push.
This also closes the go-live's open item: **channel becomes visible in the UI** (badge per account).
**Status.** Pushed to `phase-2-6-build` → staging.

## 2026-07-22 — Monti CRM LIVE: mock → real HubSpot verified (no code change needed)

**What.** Completed the go-live from `MONTI_CRM_CLAUDE_CODE_HANDOFF.md` / `MONTI_CRM_GOLIVE_RUNBOOK.md`.
**No code change was required** — `CHANNEL_PROPERTY = "channel"` in `netlify/functions/crm-hubspot.js`
was already correct.

**Channel property (the handoff's open question).** Confirmed the Company property's **internal name is
`channel`** ✅. Found it had been **relabeled "E-commerce"** (with an e-commerce description) — internal
names are immutable in HubSpot, which is why a property *displaying* "E-commerce" still read as `channel`.
Renamed the **label** back to **"Channel"** (cosmetic + makes CSV `Channel` columns auto-map). Its **12
dropdown options and data were untouched**: Distributor 57 · Restaurant/Chef 40 · Specialty grocer 7 ·
Retail chain 28 · Partner/Producer 14 · **Cheese shop/Boutique 247** · Independent Supermarket 40 ·
Regional Supermarket Chain 24 · National Chains 0 · Manufacturers 0 (fill rate 70.52%, unchanged).

**Data loaded (Rick, HubSpot UI).** Companies: 92 rows → **86 updated**; 6 errors (3 invalid domain,
2 duplicate-domain ambiguity, 1 skipped because the run was update-only). Contacts: 89 rows → **63 new +
26 updated, 0 errors**. The contacts file's `Channel` column was **not imported** — the *contact-level*
Channel property has no matching options, and the platform reads channel from **companies only**.

**Config was already in place** from 2026-07-01 (`HUBSPOT_TOKEN`, `VITE_CRM_BACKEND=hubspot`, private app
`CheeseShop TECH-read-only` with `crm.objects.companies.read` + `crm.objects.contacts.read`). The live
build (2026-07-20) already contained the flag, so **no redeploy was needed** — the gap was never config,
it was data.

**Verified live** on `cheeseshoptech-platform.netlify.app` → CRM: **817 contacts · 648 companies · 0 deals**,
**LIVE** badge, no "Sample"; Recent contacts all dated 7/22/2026 (tonight's import), proving
CSV → HubSpot → live API → UI end to end. Build gate on `phase-2-6-build`: `npm install` + `npm run build`
(1688 modules) + `npm run validate:clients` (demo + montitrentini) all **pass**.

**Open / next.** (1) `channel` non-null is **not yet visually verified** — the CRM page renders only stat
tiles + recent contacts and never surfaces companies or their channel. (2) Deals stay mock (no HubSpot
deals) — expected. (3) 2 duplicate-domain companies are a real CRM-hygiene item. (4) The **Campaign CRM
artifact** (Gmail-native console: pipeline, funnel, Sync Gmail, drafts — Prospecting Phase 10) is **not**
ported into the platform; the deployed CRM page is a read-only HubSpot mirror by comparison.
**Status.** Live.

## 2026-06-19 — Wheel embedded as the flow landing HERO (code-slot)

**Action (Rick: "the version you have now").** Built `prototypes/flow-landing-wheel-hero.html` — the
interactive photo-textured Asiago wheel mounted as the **`kind:"code"`/scene HERO slot** of a `flow`
landing (per `docs/SLOT_MANIFEST_SCHEMA.md`). Brand-painted CST house kit (Forest/cream/Fraunces), nav +
eyebrow→title→sub hero, the live wheel (drag/click → eject + readout, unchanged), then flow band
("One platform. Every channel. Built to sell." + CTA) + footer, all scroll-revealed. Wheel module
(textures + deterministic mechanic) reused **verbatim** from `…-photoref.html` via Python splice — proves
the showpiece drops into the Content Engine flow renderer as-is. **NEXT:** when Stage-3 `.glb` lands, swap
geometry/material inside the same hero slot (no landing changes). **Status.** Prototype.

## 2026-06-17 — In-engine beauty still + Stage-3 decision (Blender/Substance)

**Action.** Built `prototypes/asiago-wheel-beauty-render.html` — a standalone hero still (photo
materials, per-wedge mirror-flip variation, RoomEnvironment + PCFSoft **cast shadows**, 3⁄4 angle, one
wedge ejected, high-res supersample); saved `design/asiago-wheel/beauty-render-inengine.png`. **Finding:**
two hard ceilings on photoreal *here* — (1) web-res references → only ~150px clean paste, soft/swirly at
hero scale; (2) no Blender/Node in-env → no path-tracer. **Decision (Rick):** go **Stage 3** — real
Blender + Substance on his machine. Wrote `docs/ASIAGO_WHEEL_BLENDER_BUILD.md`: specs matched to the
prototype (7 wedges · 51.43° · R:H 3:1 · paste=cut faces · apex at origin), Substance paste/rind recipe,
Blender model→bevel→UV→materials→HDRI→Cycles, then bake + **glTF/Draco/KTX2** export back into the
runtime (eject code unchanged). Two outputs from one model: hero still (Track B) + web GLB (Track A).
**Status.** Guide ready; Rick to build offline, then hand back the `.glb` + still.

## 2026-06-17 — Photo-textured wheel (render-plan stage 2, lean path)

**Action.** Kicked off the photoreal track from `ASIAGO_WHEEL_RENDER_PLAN.md`. Baked **real reference
crops** into PBR maps with PIL (the in-session stand-in for Substance/Firefly): **paste** (eyes) from
`formaggio…stagionato` bottom-left block crop, **rind** from `slider_vecchio`'s clean brown side.
De-lit each via **divide-by-blur** (kills the shadow gradient → flat albedo, keeps eyes/pores), retinted,
derived **bump** from luminance. Masters saved to `design/asiago-wheel/textures/` (paste/rind ×
albedo+bump, ~185 KB total). New prototype `prototypes/asiago-wheel-3d-photoref.html` inlines them as
base64 data-URIs (avoids file:// canvas-taint) and swaps the procedural canvas textures for
`TextureLoader` maps — same geometry, same deterministic eject, real photographic paste on every wedge.
**Open follow-ups:** per-wedge UV offset/rotation to break the pinwheel repetition · deepen paste
contrast · richer rind on the arc · then Blender bevel+bake+HDRI (stage 3). **Status.** Prototype.

## 2026-06-17 — Wheel v3.1 — fixed perspective + deterministic motion

**Action (Rick notes).** (1) *Out of perspective* → dollied camera back + narrowed FOV (26°), eased the
rig lean to −0.24 and lifted it; the wheel now reads as a clean round 3D object, no skew. (2) *No random
rotation* → replaced the sine-wave rock with a **scripted, repeatable timeline**: rotate slice to slot
(`T_ROT`) → slide it **radially out of the wheel** (`RAD_OUT`, reads as pulling a slice from the pie) +
push toward camera (`POP_Z`) → **one clean 360°** revolution → settle facing front and **hold**.
Identical path + end pose every time; non-selected wedges retract to the nearest full-turn (no unwind).
Drag-spin still snaps nearest-to-slot on release. **Status.** Prototype.

## 2026-06-17 — Full spinnable Asiago WHEEL selector (v3)

**Action.** Built `prototypes/asiago-wheel-3d-prototype.html` — the slices assemble into a **complete
wheel** and become the nav. **7 sector wedges** (apex-at-origin geometry, PBR paste face + eyes, rind
rim/arc) seated at `i·(2π/7)` on a `wheel` group, tilted back on a `rig` so the depth + rind band read.
**Spinnable** (pointer-drag → `wheel.rotation.z` with snap-to-slot on release) and **selectable**
(raycast a slice, or a tool-chip picker). The selected slice eases to the **bottom ACTIVE SLOT**, then
**pushes forward** (`pop` group +Z toward camera) and **rotates on its own slice axis** (`spin` group,
pivot at the wedge centroid) to present itself — while the readout types its `page · id · function` and
HTML labels **orbit** each slice (projected per-frame). All 7 tools wired (Proforma…Commitments).
Self-contained (procedural textures, no external assets). **NEXT:** real-photo albedo texture · tune
eject (distance / full barrel-roll vs rock) · then embed as a `kind:"code"` scene-slot in a `flow`
manifest (apex landing hero). **Status.** Prototype only.

## 2026-06-17 — Photoreal PBR skin on the 3D wedge (v2)

**Action.** Built `prototypes/asiago-wedge-3d-photoreal.html` — the wedge gets a real **PBR skin**.
Procedural **canvas textures**: paste albedo with scattered **eyes** (dark-cored holes + ring +
highlight) over mottled aged straw, plus rind albedo with grain + cracking; matching **bump maps** so
light catches the surface. **UV-mapped** geometry (radial×height on the cut faces, angle×height on the
curve, planar caps). `RoomEnvironment` + PMREM for soft studio reflections, **ACES** tone mapping;
paste = `MeshPhysicalMaterial` w/ faint clearcoat (waxy aged look), rind = rougher standard. Warm key +
cool fill + warm rim restore dimensional shaping. Fully **interactive** (drag/hover/readout intact),
**self-contained** (no external assets, no CORS). Interactive-grade realism — a true-photographic pass
would map the enhanced reference photo as albedo; the **Higgsfield** route is the *non-interactive*
cinematic graph→cheese intro (art layer, linear video), not this nav. **Status.** Prototype only.

## 2026-06-17 — 3D Asiago wedge POC (Three.js) — the wheel goes 3D

**Action.** Built `prototypes/asiago-wedge-3d-prototype.html` — a **true 3D** Asiago wedge in Three.js
(ES module + OrbitControls via CDN importmap). Custom **extruded sector geometry** with two material
groups: **PASTE** (pale straw-gold) on the radial cut faces, **RIND** (tan/amber) on the curved edge +
caps; warm key/fill/rim lighting; **drag-to-rotate** (OrbitControls) + hover auto-spin; tool readout
type-on. Renders headless via swiftshader (`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`).
Procedural material POC. **NEXT:** map the **enhanced Asiago reference photo** as the texture
(eyes/crystalline paste/rind detail) → replicate around the **full 3D wheel** → embed as a
`kind:"code"`/scene slot in a `flow` manifest (apex landing hero). **Status.** Prototype only.

## 2026-06-17 — Showpiece cheese → WHEEL OF ASIAGO (Monti flagship); source folder

**Decision (Rick).** The dynamic-landing cheese-wheel is now a **wheel of Asiago** (Monti's flagship
Asiago PDO, "Product of the Mountains") — ties the showpiece to the hero product + brand story (was
BellaVitano-form). **Created `design/asiago-wheel/`** for source assets: `references/` (drop reference
photos) + README (shot list — top-down whole wheel · cut wedge w/ eyes + rind cross-section · rind
close-up · 3⁄4 views; look = pale straw→golden, irregular eyes, natural rind; illustration over
photoreal). Pipeline: compile → enhance (Adobe/Firefly) → 3D (Three.js wedge/wheel) → embed as a
`kind:"code"`/scene slot in a `flow` manifest. The cheese-wheel POC's color/texture get retuned to
Asiago once refs are in. **Status.** Folder + brief; awaiting Rick's reference images.

## 2026-06-17 — cheese-wheel nav (interaction POC) — the dynamic-landing concept

**Action.** Built `prototypes/cheese-wheel-nav-prototype.html` — proves the core interaction of Rick's
dynamic-landing idea: a **market-size wheel rendered as an ILLUSTRATED wheel of cheese** (golden body
+ amber rind + eyes/cracks, BellaVitano-form inspired — form only, not the brand's trade dress).
Wedges sized to segment/tool weights (from channel research); each wedge **is** a portal tool. Hover
→ the wedge **lifts + tilts (pseudo-3D) + brightens** and the tool's **page ID + function TYPE in**
(typewriter) + a segment-share bar. SVG + vanilla JS, illustration-over-photoreal, on-brand (CST green
UI + Fraunces italic). 7 tool slices. **NEXT layers:** true 3D wedge (Three.js/R3F); **Higgsfield**-
generated graph→cheese morph + illustrated art (Higgsfield = linear video, NOT interactive — assets
only, can't drive from here); then embed the showpiece as a `kind:"code"`/scene slot in a `flow`
manifest (stays inside the engine, not a fork). **Status.** Prototype only — no app code.

## 2026-06-17 — flow renderer POC (animated landing) — schema `flow` mode proven

**Action.** Built `prototypes/flow-landing-prototype.html` — a self-contained POC of the **`flow`**
layout mode (`SLOT_MANIFEST_SCHEMA.md`). The CST apex landing as a flow **manifest** (`sections[]` of
typed slots: role/kind/`$token` paint + `anim`) → a generic **flow renderer** (walks manifest → DOM,
paints from tokens, tags animations) → a brand-painted **animated** landing page (fade-up · stagger ·
count-up via IntersectionObserver; reduced-motion safe). **Same slot vocabulary as the fixed/slide
mode** — only the layout + renderer differ. Proves the new half of the locked contract. Matches the
existing `prototypes/template-engine-prototype.html` (fixed-mode POC). **NEXT:** port to React
(`flow-renderer.jsx` + an apex flow template) when the fixed engine port lands; then `code` kind +
Composer flow authoring. **Status.** Prototype only — no app code touched.

## 2026-06-17 — Canonical slot-manifest schema LOCKED (Option A)

**Decision (Rick).** Locked the Content Engine contract in `docs/SLOT_MANIFEST_SCHEMA.md`. Verified the
manifest **already exists** as the v2 POC (`prototypes/template-engine-prototype.html`) and IS the Slot
Kit 1:1 (role var/brand/lock × kind image/text/shape, `as:"title"|"story"`, `$token` paint via
`brand-tokens.js`, bindings via tag/asset/voice). **Chose Option A: ONE slot vocabulary, TWO layout
modes** — `fixed` (absolute x/y/w/h canvas → slides/social, the locked POC shape) + `flow` (stacked
`sections[]`, responsive → landing/email, NEW). Extensions added to the vocab: `kind:"code"` (sanitized
embed) + `anim` attribute (none/fade-up/stagger/count-up/parallax). Build order off the contract:
(1) port fixed engine `template-manifests.js`+`manifest-renderer.jsx`; (2) build flow renderer (landing
first); (3) add code+anim; (4) Slot Composer emits both modes. **Status.** Schema doc only — no code.
Current files: v1 `slide-templates.js`+`slide-renderer.jsx` exist; `brand-tokens.js` exists; v2 manifest
files NOT yet ported.

## 2026-06-17 — Slot Composer spec (house-admin visual template builder)

**Decision (Rick).** Greenlit the **Slot Composer** — a HOUSE-ADMIN-ONLY drag-and-drop canvas that
composes templates in the Slot Kit language and emits the existing template manifest
(`slide-templates.js` shape, rendered by `slide-renderer.jsx`). Spec: `docs/SLOT_COMPOSER_SPEC.md`.
Drag containers/cards/shapes → tag each slot (role VAR/BRAND/LOCK × kind image/text/story/shape/code
× binding: upload / Media Hub / brand voice / Brand Kit token / code × anim) → save to template
library → renderers paint per client. Lives in the House Console (`agency-console.jsx`), admin-gated;
clients consume + fill VAR only. **Sequencing locked:** manifest + renderers first (Excalidraw bridge
now) → Composer is Phase 2 (a GUI over stable JSON; build the contract before the GUI). Reuses
component catalogue + Media Hub + Brand Kit + template engine. Templates = house IP (not transferred
at buyout). **Status.** Spec only — no code.

## 2026-06-17 — Slot Kit = foundational language for the Content Engine (+ handoff)

**Decision (Rick).** The **Slot Kit** is the foundational core of the Content Engine: a
template-guided, **brand-painted** content language. Wireframe a layout on a **960×540** canvas
(Excalidraw); every box is a **slot** = one **role** (`VAR` fill-per-use · `BRAND` swappable asset ·
`LOCK` auto-painted from the Brand Kit) × one **kind** (`image` · `text` · `story` · `shape`). It
compiles to a template **manifest** the engine renders. One slot-defined template → many outputs.

**Direction.** Fan the same manifest across channels: slides/PPTX (done) → **email** + **HubSpot
(social)** + **animated landing pages** (new). The Brand Kit paints the LOCK/BRAND slots so every
output is on-brand by construction. **NEXT: design the first animated landing page as a Slot Kit
wireframe in Excalidraw → hand off → manifest → renderer.**

**Tracked now.** Committed `design/slot-kit.excalidraw` + `design/SLOT_KIT_GUIDE.md` (were untracked;
now preserved as the engine's source language). The guide = the labeling vocabulary.

**Handoff for the design/build surface.** The **slot language is the CONTRACT.** Build the
landing-page, email, and social renderers to consume the *same manifest shape* the slide engine uses;
keep roles/kinds identical across renderers. Don't fork the vocabulary per output. (`brand/
monti-logo-transparent.png` still untracked — commit if it's the canonical mark.)

## 2026-06-17 — Competitive landscape: Keychain strategic read

**Action.** Added `docs/COMPETITIVE_LANDSCAPE.md` — full strategic read of **Keychain** (keychain.com,
the CPG *manufacturing* network: KeychainOS + Keychain360; ~30k mfrs / 20k brands; ~$68M; free for
brands, $5k–$100k/yr enhanced listings for manufacturers; no rev-share/API/partner program).
**Decision/framing:** Keychain is a **strategic ADJACENCY — not a partner, not a competitor.** It's
upstream (sourcing/make-it); CST is downstream (brand/sell-it). Key gap: Keychain promotes *makers to
brands*, never a *brand/product to buyers or consumers* — that's CST. Doc covers: reselling angle
(package Keychain's free buyer side as a "Source & Scale" managed service; manage Monti's producer
listing) and a conceptual **downstream integration** (Keychain export → CST canonical-catalog adapter
→ storefront; manual handoff until an API exists; never build a dependent feature). **Status.** Docs only.

## 2026-06-17 (cont. 5) — Content Studio IS the template engine

Rick: "the template engine prototype is the app now." Made it so. `App.jsx` route `proposals` (Content Studio)
now renders `ContentStudio` (`src/components/proposals/content-studio.jsx`) → opens **directly** into `SlideStudio`
(full-window: type switcher, template gallery, filmstrip, slot inspector). The old `ProposalBuilder` "pitch/range"
form is no longer routed (retired; will return as the **Sales sheet** type in the switcher). `SlideStudio` back
button is now optional (page mode). **Image-adjust ported** to the live renderer + inspector: fit (cover/contain),
zoom/resize, reposition, skew X/Y, reset (stored on the slide in `slots.__img`, applied in `slide-renderer.jsx`).
Note: deploys were building but **auto-publish was off** in Netlify — turned on; that was why v2 looked "not live."
Still to port for full prototype parity: **Present mode** + **16:9 Export PDF**. `vite build` clean.

## 2026-06-17 (cont. 4) — v1 retired; manifest engine is canonical

Removed the dead region-based `DeckComposer` modal from `presentations-page.jsx` and its now-unused imports
(SLIDE_TEMPLATES/getSlideTemplate/firstImageId, getBrandKit, voiceOptions). The **tokenized manifest engine
+ `SlideStudio`** is the single source of truth for Content Studio composition; `slide-templates.js` (manifests)
and `slide-renderer.jsx` (coordinate renderer) fully replace the v1 region model. `vite build` clean.
POC (`prototypes/template-engine-prototype.html`) extended this session with: content-type switcher, full-window
deck builder, per-image Adjust panel (fit/zoom/reposition/skew), and 16:9 PDF export (cream + auto-fit hold).
Still to port to the app: Adjust-image panel + 16:9 PDF export.

## 2026-06-17 (cont. 3) — Template Engine v2 PORTED into the React app

POC approved → ported the manifest engine into Content Studio. New/changed:
- `src/lib/brand-tokens.js` (new) — `brandTokens(resolved)` resolves `$accent/$display/$logo/…` from the
  tenant Brand Kit (colors, type cssStacks, logo/seal); `resolveTok` + `voiceOptions` (story blocks, ready
  phrases, lines) for copy slots.
- `src/lib/slide-templates.js` (rewritten) — now the 10 tokenized **manifests** (coordinate slots, roles
  var/brand/lock, z-order, tags, fills, pick, logo toggle). Same export names (`SLIDE_TEMPLATES`,
  `getSlideTemplate`, `firstImageId`) so callers didn't change.
- `src/components/presentations/slide-renderer.jsx` (rewritten) — coordinate renderer painted by tokens; cqw
  fonts; gradient/scrim shapes; per-slide hide (`slots.__off`); brand/lock asset overrides; present mode
  (hides empty slots + wireframe); legacy string-slide fallback kept.
- `DeckComposer` (presentations-page.jsx) — template-first slot panel: image slots → live **MediaPicker**
  (`defaultTag = slot.tag`, stores Cloudinary public_id), copy slots → **brand-voice** dropdown + free text,
  story slots → story-block filler, logo → "show on this slide" toggle + swap. Saves link-based deck
  `{kind:"deck", category:"slide-deck", cover, slides:[{t,slots}]}`. DeckViewer/proposal-view already render
  structured slides via SlideRenderer.

**Full-window composer + content-type switcher** (`src/components/presentations/slide-studio.jsx`, new):
Content Studio's "Compose deck" now renders inline as the main view (modal removed) — content-type switcher
(slide-deck live; blog/email/social-post/social-carousel/sales-sheet coming-soon), slide filmstrip, per-slide
template dropdown, slot inspector beside the live painted preview. `proposal-builder.jsx` renders `<SlideStudio>`
when composing and saves via the same Content-Library seam.

Quote template (#7) gained an optional hero photo with a left→right gradient fade. **Text auto-fit ported**
(imperative shrink-to-box pass in SlideRenderer via data-cqw nodes + ResizeObserver). `vite build` clean.
Deferred (matches POC stubs): Cloudinary bg-removal pipeline + tag, product-name metadata link (Custom Price
List), server-side PDF, Content-Library write seam.
Prototype kept at `prototypes/template-engine-prototype.html` as the reference spec.

## 2026-06-17 (cont. 2) — Template Engine v2: tokenized manifest POC + bindings

Rick supplied a PowerPoint-derived **handoff** (`product-feature-v1`): a coordinate field-map — slots with
roles **var/brand/lock**, absolute x/y/w/h on a 960×540 canvas, z-order, per-slot fonts/colors. Adopted the
slot model over v1's region approach (marketing slides are compositions, not reflowing docs — that's why the
handoff JPEGs look polished). **Challenged & refined it** before building:
- **Critical fix — tokenize the paint.** Handoff hard-coded Monti hexes/fonts (`#00963F`, Georgia). That makes
  a *Monti* template, not a *platform* template, and breaks the clone canon. Refined so slots reference Brand-Kit
  **tokens** (`$accent`, `$display`, `$logo`); the renderer resolves them against the active tenant's kit. Same
  manifest → any brand, zero edits. (Migration trivial: the literal hexes already *are* Monti tokens.)
- **Templates are platform-shared** (`templates/<family>/vN`), painted per tenant — not tenant-namespaced.
- **Text auto-fit** (shrink-to-box) so real copy doesn't overflow fixed boxes.
- **Scope honestly:** coordinate manifests = fixed-canvas (slides + social per ratio); blog/email = separate
  flow engine later. **HTML is the source render; PPTX/PDF/PNG are derived** (defer the `render.ts` PPTX path).
- **Bindings live in the manifest** (built ahead of the plug-in phase): image slots → **Media Hub** (tag-filtered),
  copy slots → **brand voice** (story blocks / phrases / lines), lock → painted from kit.

**Built:** `prototypes/template-engine-prototype.html` — a self-contained, tokenized POC. Template browser of
10 templates (product-feature + the 9), all painted from ONE `BRAND_KIT` object via tokens; template-first
editor (pick → painted → fill each slot); required Title per template; Media-Hub pickers for images, brand-voice
dropdowns for copy; Monti Heritage Cream canvas. Decision (Rick): **tokenized paint**. This is the "smart brand-kit
plug-in + smart slide-deck builder" foundation. Next: build a 10-slide Monti deck to stress-test the 9, then port
the manifest engine into the React Content Studio (live MediaPicker + brand-voice doc + Cloudinary).

## 2026-06-17 (cont.) — Template Engine: spec + v1 (Content Studio templates)

Rick: Content Studio needs templates. Model decided & spec'd (`docs/TEMPLATE_ENGINE_SPEC.md`) + diagrammed:
**a template = layout SLOTS + brand-kit PAINT + slot BINDINGS** (image slots → MediaPicker; copy slots →
story blocks/topics; text → input; logo/colors/fonts → auto-painted from the Brand Kit). One engine serves
slides now, then social (size-aware, image export) / blog (HTML) / email (email-safe) — only layouts+sizes
differ. Reuses ~80% of existing parts (Brand Kit, Theme Engine, MediaPicker, story blocks, DeckViewer).
**v1 build (slides):** `src/lib/slide-templates.js` (Image/Cover/Statement/Story slot defs) + `SlideRenderer`
(brand-painted) + template-based DeckComposer (pick template → fill slots → live preview) + DeckViewer renders
structured slides (`{t, slots}`), with string slides kept as legacy full-bleed images (backward compatible).
Decks save link-based to the Content Library (category slide-deck). Clone fit: shared templates + per-tenant
Brand Kit paint → instant on-brand starter deck for any client (the `_template` onboarding model).

**v1.1 — template library expanded (5 added).** Beyond Image/Cover/Statement/Story, added five layouts to
`slide-templates.js` + `SlideRenderer`: **Three-up (pillars)** (3 image+caption columns), **Big stat**
(large figure + label on brand field), **Quote** (pull-quote + attribution), **Product range** (3 product
cards, image + name), **Closing / CTA** (logo + headline + CTA pill + contact). All brand-painted via
`--cs-color-*` tokens with cqw sizing; empty slots render on-brand placeholders. Build clean. Nine templates
now selectable in the Content Studio composer.

## 2026-06-17 (cont.) — CRM tool card on the Operations Portal landing page

Added a **CRM** entry to Monti's `config/clients/montitrentini.json` `tools` array (registered the `contact`
icon in `src/lib/icons.js`; `type: internal`, `route: "crm"`, `tag: "CRM · live"`) so it appears in the
dashboard **Tools** grid → opens the CRM page via `onNavigate("crm")`. Pure **config** change — clone-friendly:
include or omit the CRM tool per client in the `_template`, zero code. Build clean. (CRM now reachable three
ways: side-panel nav, Tools-grid card, and the house CRM-snapshot card.)

## 2026-06-17 (cont.) — CRM surfaced: house snapshot + tenant CRM page

**Verified live** earlier: the read-only HubSpot connection returned 632 contacts · 514 companies · 0 deals.
Now surfaced in two places: (1) **house dashboard** — a live "CRM snapshot" card (`agency-console.jsx`)
auto-loads the three counts on open; (2) **tenant Operations portal** — a new **CRM page**
(`src/components/crm/crm-page.jsx`) + side-panel nav **"CRM"** (`App.jsx`, allowed admin/client) showing
count tiles + a **recent-contacts table**. `crm-summary.js` extended to also return `recentContacts` (newest
10: name/email/company/created). Distinct from the **Campaigns** page (social/email marketing). All
read-only/additive; build clean. NOTE: single HubSpot connection = Monti's CRM for now; per-tenant CRM keys
are a future multi-tenant concern.

## 2026-06-17 — CRM seam live (read-only HubSpot) + clean admin URL + UX polish

**CRM go-live (read-only, additive):** new `netlify/functions/crm-summary.js` — direct HubSpot via the
**Service Key** (`HUBSPOT_TOKEN`, server-side only), READ-ONLY, hits the CRM search endpoint for
contacts/companies/deals totals. Integration-health panel gains a live **"HubSpot CRM (read-only)" Test
row** (counts or error). **Deliberately additive:** did NOT flip `VITE_CRM_BACKEND` (lib/crm.js treats any
non-mock value as the **Make** webhook → would break the CRM dashboard), and did NOT touch the Make `crm.js`.
Decision: Service Key (HubSpot's recommended single-account credential) over legacy private app. Full CRM-
dashboard-on-HubSpot (map shape + flip flag) = its own next slice. **Clean house URL:** reserved subdomains
`admin`/`app`/`console` now skip the landing → house app (`App.jsx`); DNS + Netlify alias still Rick's to add.
**UX polish:** gate eyebrow (house vs client), Content Studio subtitle, Content Library "Load content" + empty
state. **Doc:** `docs/INTEGRATION_WIRING_BRIEF.md`. Build clean.

## 2026-06-16 — CheeseShop TECH landing page v1 (apex)

Built `src/components/marketing/landing-page.jsx` from `docs/CST_POSITIONING_BRIEF.md` and wired it at the
apex in `App.jsx` (replaces `<ComingSoon/>` render; ComingSoon file kept for rollback). Invite-only, outcome-led:
hero "The brand power of a big team. The focus of a small one." + brand-to-sales-engine sub; 4 pillars; a proof
band (10–20% consistency stat + the founder's 300%→$5M cheese-brand story); closing CTA; quiet "Log in" → /?app=1.
House brand via tokens. Build clean. OPEN before launch: the "Request an invitation" CTA is a **mailto placeholder
(hello@cheeseshoptech.com)** — wire a real form/inbox; and confirm the apex DNS serves the Netlify site.

## 2026-06-16 — SESSION RECAP (platform-build day)
Content-orchestration v1 shipped end-to-end (Slices 1–4: categories, gated publishing, download-to-device, quota)
then simplified (PPTX cut → no risky backend; review gate OFF by default behind per-client `reviewRequired`).
Canonical locked: **CheeseShop TECH = platform/agency Rick owns; Monti = client/tenant.** Two-track rule
(platform build never waits on client approval; goal 10+ clients in 6–12 mo). Positioning brief written
(platform moat + founder credibility from the real resume + competitive sampling). Landing page v1 built. Monti
campaign staged, **gated on Sales Management approval + pricing (Thursday 2026-06-18 meeting; reminder set 7:30am)**.

## 2026-06-16 — Review gate OFF by default (per-client opt-in)

Rick's call: the CST review gate isn't needed. Junk/sprawl is already controlled by the **10-item quota** +
light link/thumbnail storage, and brand consistency is enforced at the **inputs** (brand kit / themes /
CST-controlled Media Hub) — so reviewing a client's own finished proposals is redundant. Implementation:
saves now post **directly** unless a per-client **`resolved.reviewRequired`** flag is set (default off →
Monti self-saves). The approval machinery (STATUS, Approve/Return UI, dedup flag) is **kept but dormant** —
activates only when a client opts in, so the template keeps the capability for future clients. Two onSave
sites changed (DeckComposer in Content Studio + LoadDialog in Content Library). Spec §7/§13 updated. Build clean.

## 2026-06-16 — PPTX cut from the app (de-risks Slice 5)

Rick's call: PowerPoint is handled entirely outside the platform — export to PDF first. Removed PPTX from
the LoadDialog upload path (`accept` now `.pdf,image/*`; kind detection drops the pptx branch; copy updated
to "export to PDF"). Why it matters: PPTX was the only Cloudinary `raw` finished type, so this **eliminates
the need to touch `media-list.js`** — finished files are now PDFs + images (both `image` resource type,
already listed). Spec §11/§12 updated; the risky "finished-file backend" slice collapses to an optional,
deferred CST-gated-writes pass. Net: less surface area, lower risk, build clean. (Legacy `pptx` badge label
kept as a harmless display fallback.)

## 2026-06-16 — Content orchestration Slices 3 + 4: download-to-device + storage quota

Spec §9/§10. **Download-to-device:** `downloadHref()` in `presentations-store.js` adds Cloudinary
`fl_attachment` so the browser saves the file instead of navigating; a **Download** button shows on any
Library card whose `url` is a Cloudinary file (PDF/image/PPTX). Live decks/links have no single file → no
button. **Storage quota:** `DEFAULT_QUOTA = 10` (per-tenant override `resolved.contentQuota`); counts the
client's stored catalog only (platform/config decks don't count). Content Library header shows **`n/quota
stored`** (red when full) and **disables Load** at the cap; both save paths guard — LoadDialog (Library) and
DeckComposer (Content Studio) refuse to add when full and toast "delete or download to add." Frees on
delete. Build clean. NEXT (spec §12): finished-file backend — extend `media-list`/upload for raw/finished
types + CST-gated Cloudinary writes (the last orchestration slice; bigger, touches Netlify functions).

## 2026-06-16 — Content orchestration Slice 2: submission + review/dedup (gated publishing)

Spec §3/§7. `presentations-store.js`: `STATUS` (submitted/posted/returned), `entryStatus()` (legacy/house
entries default **posted**), `updateEntry()`, `duplicateKeys()` (flags entries sharing a normalized title
or identical url). Saves now stamp status by role: **house/CST (admin) → posted; client/client-admin →
submitted** (DeckComposer in Content Studio + LoadDialog both). Content Library: non-managers see **posted
only**; managers also see pending/returned with **Pending review / Returned** badges + a **Possible
duplicate** flag (house). House-only **Approve** (→ posted) / **Return** (→ returned, optional note via
prompt) actions per card. Models gated publishing without a backend (per-tenant localStorage); a real review
queue + cross-tenant House Console comes later. Build clean. NEXT (spec §12): download-to-device; storage
quota (default 10/client); finished-file backend (raw types + CST-gated Cloudinary writes).

## 2026-06-16 — Content orchestration Slice 1: content-type categories

First slice of `CONTENT_ORCHESTRATION_SPEC.md`. Two-track rule in effect — platform build proceeds
independent of client approval (see memory `cst-build-strategy`). `presentations-store.js`: added the
**content-type taxonomy** `CONTENT_CATEGORIES` (presentation · slide-deck · social-post · email-campaign ·
blog-post) + `categoryLabel()` + `entryCategory()` (legacy entries fall back to "presentation"); entries
gain a `category` field. Content Library (`presentations-page.jsx`): **category tabs** (All + 5, with live
counts) that filter the grid; each card shows a category badge; "Nothing in this category yet" empty state.
DeckComposer auto-tags saves as `slide-deck`; LoadDialog gained a category selector; config decks default
to `slide-deck`. Build clean. NEXT slices (spec §12): submission/review queue + dedup; download-to-device;
storage quota (default 10/client); finished-file backend (raw types + CST-gated writes).

## 2026-06-16 — Content Studio / Content Library + Slice 2 deck composer

The proposal surface evolved into a content system (Rick's "one mind, one body" as outputs multiply
to social/blog). Shipped together:
- **Renames (display only, route keys stable):** "Create a Proposal" → **Content Studio** (makes it);
  "Presentations" → **Content Library** (holds it). "Catalog" reserved for the Product Catalog (avoid
  collision). Mental model: **Media Hub uploads ingredients → Content Studio pulls + composes → exports
  finished pieces (slides/social/presentations/blogs) to the Content Library.**
- **Story topics panel** (`proposal-builder.jsx`): brand-voice angles from `brand-kit.json storyTopics`
  (7 for Monti), under the range picker; click → appends the line to the proposal intro.
- **Attribution from the brand kit:** `brand-kit.json` `attribution` field → proposal-view closing line
  shows **"Imported by Monti Trentini USA"** (was "Prepared with CheeseShop TECH"); other tenants fall
  back. Sell sheets updated to match (Posada & Co. + CheeseShop TECH removed from prospect-facing footer).
- **Slice 2 — slide-deck composer (images-only), SHIPPED:** **"Compose deck" button lives in Content
  Studio** (`proposal-builder.jsx`, next to Clear/Preview) — composing belongs where you *make* things.
  `DeckComposer` (exported from `presentations-page.jsx`) pulls Media Hub images via the tag-filtered
  `MediaPicker` (hover-preview), orders slides (up/down/remove), first slide = cover. Saves a
  **link-based "deck"** entry into the **Content Library** catalog (`addEntry`) — slides are Cloudinary
  delivery URLs (references, **no upload**); plays in `DeckViewer` (iPad touch + fullscreen), shares by
  link. Confirms the model: **Media Hub → Content Studio composes → Content Library holds.** Build clean.
  NEXT slices: story-block text slides; social-post + blog export paths.

## 2026-06-16 — AI tool embed PARKED (house-admin design agent)

Rick: "let's hold off for now but tag it in the build." Decided NOT to build a live in-app AI agent
yet. Tagged: `docs/AI_TOOL_EMBED_SPEC.md` (PARKED) + a `PARKED(ai-embed)` code marker in
`proposal-builder.jsx` where an "Auto-compose" button would sit. Reasoning captured: the in-website
AI would reuse the exact secret-safe Netlify-function pattern already in prod (media-* functions) —
browser → function (holds `ANTHROPIC_API_KEY`) → Claude API → draft back. Prereqs are Rick's:
pay-as-you-go Anthropic API billing (separate from the Claude subscription) + a console spend cap.
Cost-per-compose is cents; the real cost is build/maintenance, so deferred until self-serve volume
earns it. Until then the design-agent role = Claude in Cowork (no infra/key/cost). Hard rule kept:
NOT AI image generation — compose from the real Media Hub photography, don't synthesize. Resume only
after Slice 2 (deterministic composer) exists; AI is the optional layer on top.

## 2026-06-16 — "Create a Proposal" + color-safe PDF export + tag-driven Media Hub picker

Three shippable pieces (build verified clean each time; deployed via Terminal paste — see lock note).

- **Renamed Proposals → "Create a Proposal"** (nav `App.jsx` + builder headings).
- **Print-to-PDF export, color-safe.** `proposal-view.jsx` "Export PDF" (window.print) now backed by
  a real `@media print` block in `src/index.css`: isolates `.proposal-print` (hides app chrome via
  visibility + absolute lift), forces `print-color-adjust: exact` so themed cover/closing/zone
  backgrounds actually render (browsers strip backgrounds by default = the #1 cause of washed-out
  exports), `@page 14mm`, `break-inside: avoid` on product rows/cards/story blocks. DECISION: PDF is
  the proposal format — exports brand hex + Fraunces/Inter directly (no PPTX round-trip). Diagnosed
  Rick's HEB color shift = the Mac "Reduce File Size" Quartz filter dropping the color profile, NOT
  the app. Sharing/email stays in the Presentations tab (Rick's choice). Caveat: brand kit's first
  heading font "cora" (Adobe) isn't web-loaded → falls back to Fraunces until Adobe Fonts is wired.
- **Tag-driven Media Hub image picker (Slice 1).** New `src/components/media/media-picker.jsx`:
  scrollable thumbnail panel reading the SAME `listAssets()` seam, usage-tag filter dropdown,
  hover-to-enlarge preview pane (above the scroll area so it never clips), click to select. Wired
  into the builder: a **Cover image** picker + a **per-story-block** image picker. Proposal model
  (`proposals.js`) gained `heroImageId` + `storyImages{}` (backward compatible; fall back to brand
  kit). `proposal-view.jsx` zones now honor the picks. NEXT = **Slice 2: slide-deck composer**
  (assemble tagged images + story blocks into the in-app deck — iPad touch-present + fullscreen,
  export to PDF, save to Presentations).

## 2026-06-16 — Presentations = catalog of finished proposals (Load + Share + PDF first-page thumbnail)

Presentations reframed (Rick: "a catalog of finished proposals to catalog and share"; Proposals is
where they're built). `presentations-store.js` (per-tenant localStorage catalog, mirrors
brand-kit-edits). PresentationsPage "Load presentation" dialog takes a proposal three ways — paste
URL, browse files, or drag & drop — accepting PDF / PPTX / image via new `cloudinary.js`
`uploadFileAuto()` (unsigned `/auto/upload`; images downscaled, raw passes through). Each card gets
Open / Share (Web Share API → clipboard) / admin Remove. `pdfThumbUrl()` renders a PDF's **first
page** (`pg_1,c_limit,f_jpg`) as the auto cover — CONFIRMED working. **Cloudinary "Allow delivery of
PDF and ZIP files" ENABLED** (unlocks both the PDF link and the thumbnail). PPTX is stored/shareable
but downloads to open (no inline preview) → PDF is the recommended format.

## 2026-06-16 — Media Hub admin-clearance DELETE

`netlify/functions/media-delete.js` (Cloudinary Admin API DELETE, secret server-side,
invalidate=true). `media.js` `canDeleteMedia()` = admin OR client-admin (first cut was admin-only,
hid it from Rick's client-admin role). Red Delete button in AssetDialog w/ confirm; drops from
grid/recent on success. Hard delete (not archive). Commit `72db00b`.

## 2026-06-15 — Media Hub uploader fix + brand kit to Cloudinary + Asiago campaign

- **Upload "stalls forever" fixed.** `cloudinary.js` `downscaleForUpload()` (cap longest edge 2560px,
  PNG→PNG else→JPEG) runs BEFORE the unsigned POST. Root cause: unsigned preset ~10 MB cap, farm
  masters were 15–40 MB. Tradeoff: hub uploads are web-master, not print-res. Deployed (commit
  `023f373`). **RECURRING MB WALL:** Cloudinary free plan rejects >10 MB account-side — no
  signed/server/chunked upload beats it; the FILE must shrink. `downscaleForUpload` only shrinks
  images, NOT PDF/PPTX. For big decks, compress the PDF first (Rick did 22 MB → 6 MB via Preview
  "Reduce File Size").
- **Monti brand web-asset kit → Cloudinary** (29 files → `monti-trentini/library/`, clean public_ids,
  tagged). Working sandbox→Cloudinary route: `curl -F file=@… -F upload_preset=st_unsigned …` to
  `…/v1_1/sofcvmwa/image/upload` (the Cloudinary MCP can't read sandbox `file://` paths). Manifest:
  `monti_asiago_campaign/brand_kit_cloudinary_manifest.csv`.
- **Asiago launch campaign collateral** in `monti_asiago_campaign/`: photo-forward sell sheet
  (`Asiago_Sell_Sheet.html`), 3-touch relationship-first email sequence, social starter, brief.
  Pricing-by-inquiry (no numbers). Email = `Sales@montitrentini-usa.com`.
- **National Cheese Shop campaign:** 161 companies imported to HubSpot, "National Cheese Shop
  Campaign" active list (id 17), Channel = Cheese shop / Boutique grocery.

## DEPLOY / GIT LOCK NOTE (read before deploying)

The Cowork sandbox **cannot manage `.git` locks** ("Operation not permitted" on the mounted repo),
and running git from the sandbox can LEAVE a stale `.git/index.lock` that silently blocks all
commits (the `.command` buttons' `git add` then fails → "nothing committed" → push says "Everything
up-to-date"). FIX going forward: Claude does NOT run git in the sandbox; it hands Rick a paste-in-
**Terminal** block that does `rm -f .git/index.lock .git/*.lock`, stages the named files, commits,
and pushes. Rick's Mac has the permission the sandbox lacks. Verify a real commit hash +
`phase-2-6-build -> phase-2-6-build` (not "up-to-date").

## 2026-06-13 (cont.) — Usage taxonomy covers all dispatch paths (12 tags)

Rick: tags must map 1:1 to dispatch destinations so no asset has a home it can't reach. Final set
(12, Event appears ONCE, Lifestyle separate): Product Catalog, Hero, Story block, Lifestyle, Food
styling, Social, Press / PR, Event, Brand asset, **Email / Campaign, Print / Sell-sheet, Web /
Marketing** (3 added). Updated the single source `src/lib/media.js USAGE` + both functions'
`USAGE_IDS` (`media-list`, `media-update`) so they stay in lockstep — change the list in one place
conceptually, but it lives in 3 files; keep them identical.

## 2026-06-13 (cont.) — Media Hub asset editing (the WRITE half) + ownership map

Fixed the "backwards" gap (Rick: Catalog had data-entry, Media Hub didn't). Established the data
ownership model and made the Media Hub the true asset control plane — it can now EDIT assets, not
just upload them.

- **`docs/DATA_OWNERSHIP_MAP.md`** — three domains, one authoring home each: Product (SKU → price-list
  admin), Brand (Brand Kit), Asset (Media Hub). Join key = **SKU**. Product copy is NOT an asset field
  (one description, many photos); it lives with the SKU. Catalog → pure view long-term. Guardrail: one
  authoring home per fact; everything else references by key.
- **`media-update` Netlify function (WRITE)** — server-side Cloudinary Admin API update of an asset's
  tags (approval + usage) and context (caption/sku/alt). Same secret-safe pattern as `media-list`;
  reuses the existing `CLOUDINARY_*` env (no new secrets).
- **Asset edit dialog** — managers open an asset → Edit → rename, re-tag usage, link a SKU, add alt
  text, set approval; Save persists via `media-update` and merges into local + Recent state. `media.js`
  `updateAsset()` is the seam (mock = local-only no-op). Replaced the old approval-only quick buttons.

Learning note: this is the READ/WRITE split of an API made concrete — `media-list` (GET) reads,
`media-update` (POST) writes, both behind serverless functions holding the secret. The browser only
ever sees safe, shaped data.

## 2026-06-13 (cont.) — Asset Library LIVE backend (Media Hub reads real Cloudinary)

Flipped the Media Hub from mock to the real Cloudinary backend. The `media-list` Netlify function
(already existed — calls the Cloudinary Admin API server-side via Basic auth, so the API secret
NEVER touches the browser; paginates the tenant's `monti-trentini/*` prefix) now also returns
`usage[]` (tags ∩ the USAGE taxonomy) and recognizes the `library` upload subfolder — so the tag
tabs + per-view counts work against real assets. Frontend unchanged (the seam was already there).

Activation = env only: `VITE_MEDIA_BACKEND=cloudinary` (build-time, public) + server-side secrets
`CLOUDINARY_CLOUD_NAME` (sofcvmwa), `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` set in Netlify
alongside the `PORTAL_*` secrets. These are real secrets — dashboard only, never committed.

Learning note: a *serverless function* is code that runs on-demand on a server (Netlify), not in the
browser — so it can hold secrets and call privileged APIs, returning only safe, shaped data. This is
the control-plane/data-plane split made concrete: the function is the gatekeeper between the public
UI and the privileged Cloudinary Admin API.

## 2026-06-13 (cont.) — Cloudinary uploads live + Media Hub upload taxonomy (Asset Library step 1)

Image uploads now work end-to-end: unsigned Cloudinary preset `st_unsigned` (cloud sofcvmwa),
name committed in `netlify.toml [build.environment]` as `VITE_CLOUDINARY_UPLOAD_PRESET` (public by
design — ships in the bundle; kept in version control so it can't get lost). Commit 292651a.

First slice of the Asset Library (ASSET_LIBRARY_SPEC.md): the Media Hub upload now opens an
**"Asset details" dialog** — per-file Name + multi-select **Usage** tags — instead of silently
uploading filenames. Usage taxonomy (Rick, locked): Product Catalog · Hero · Story block ·
Lifestyle · Food styling · Social · Press/PR · Event · Brand asset. Name → Cloudinary caption;
usage → Cloudinary tags (alongside `draft`). `lib/media.js` owns the `USAGE` list + `PRODUCT_USAGE_ID`.
`uploadAsset` extended with `displayName` + `usage`. Usage shows as badges in the asset dialog.

Plus a **"Recent" tab** (first tab) so you can find what you just uploaded + tagged without digging
through folders — newest first, with usage badges on each tile. Interim bridge while the hub is
mock-backed: recent uploads are persisted in the browser (`localStorage`, per tenant, capped 60) so
they survive reloads. When the live Cloudinary backend lands, Recent becomes a `created_at`-sorted
view of real assets.

**Tabs now MIRROR the usage tags** (Rick): the Media Hub left tabs switched from storage folders
(products/brand/raw) to the usage taxonomy — Recent · All · Product Catalog · Hero · Story block ·
Lifestyle · Food styling · Social · Press/PR · Event · Brand asset. Each tab is a saved view that
filters the asset pool by tag (client-side, instant); the whole set is fetched once. Mock sample
assets were given `usage` tags so the tabs are populated in mock mode. Uploads now land in a neutral
`library` subfolder (tags, not folders, drive where an asset appears).

UI form (Rick chose): the views render as a **left vertical nav rail with a per-view count** —
chosen over a dropdown (keeps every view scannable at a glance; a dropdown hides them) and over the
wrapping horizontal row (busy at 11 items). File-explorer pattern; room to group later (Brand assets
▸ Logos/Vectors/GIFs). Design principle logged: match nav pattern to item count + mental model.

**Product Catalog exclusion (verified, no code needed):** the Catalog is a VIEW over the canonical
manifest (`lib/images.js`), not Media Hub uploads — so social/press/lifestyle/food-styling never
appear there. The tag-driven gate (only `product-catalog` enters the manifest) activates when the
unified library feeds the manifest.

**Still phase work:** uploads persisting in the Media Hub list across reloads, folder-as-usage
views, and the tag→manifest→catalog pipeline need the LIVE Cloudinary backend
(`VITE_MEDIA_BACKEND=cloudinary` + the `media-list` function + `CLOUDINARY_API_KEY/SECRET`
server-side). Today the hub is mock-backed; uploads save to Cloudinary but the list is sample data.

## 2026-06-13 (cont.) — Five-theme design session (Theme Engine completed)

Completed the "dedicated design session" the Theme Engine was gated behind (Scope §7.4, unblocked once
Rick answered Q1/Q2). Took the engine from **2 proof-of-concept registers to the full five**, each
mapped to a Monti channel + a flagship — all REGISTERS of the one brand kit, not new brands.

- **The five:** Heritage Editorial (provenance, exists), Fresh Market (retail/grocery, exists),
  **Chef's Table** (foodservice — dark Mountain-Ink, image-led, serif), **Trade Brief** (distributors —
  compact sans, dense range table, minimal imagery), **Alpine Gallery** (chains/flagship — Heritage
  Cream canvas, oversized serif, quiet gallery grid).
- **`themes.js`:** richer token vocab — `lead` now incl. `ink`/`cream`; `density` (airy/regular/compact);
  `typeRegister` incl. `grand`; `cover` incl. `minimal`; `product` incl. `grid-three-up`/`list-compact`.
  `themeColors()` now resolves an `onCanvas` legible color so a light (cream) lead keeps headings
  readable. New `themeSpec()` maps density+type → concrete classes (one place to tune the system).
- **`proposal-view.jsx`:** the renderer now actually **expresses** density (vertical rhythm, cover
  height, measure) and type register (heading voice, cover title), which it previously ignored. Added
  the `minimal` cover and the `grid-three-up` + `list-compact` product layouts. Existing two themes
  render unchanged. The builder's theme dropdown auto-populates from `THEMES`, so all five appear.
- **Verified:** `vite build` clean (1646 modules; isolated outDir to dodge the dist/.DS_Store EPERM).
- **Process note:** sandbox could not finalize the commit (mount blocked removing `.git/index.lock`);
  delivered as the `COMMIT THEME SESSION.command` easy-button — double-click, then DEPLOY as usual.

## 2026-06-13 (cont.) — Brand Kit + Theme Engine + Proposal v2 (the agency crown jewel)

Built the Brand Kit foundation and the Proposal Builder v2 on top of it (BRAND_KIT_AND_PROPOSAL_SPEC.md,
from MT ProposalBuilder Scope v2). **Business model encoded:** CheeseShop TECH owns brand orchestration
as the core value of the monthly fee — clients focus on product + sales.

- **Brand Kit (single source, "one mind one body"):** `src/data/<tenant>/brand-kit.json` — identity
  (logo/colors/type), imagery, voice, audience-tagged story blocks. Monti's PARSED from the existing
  Brand_Guide + Voice_and_Messaging (the "UI version of brand voice"). `_brand-kit-template.json` =
  onboarding worksheet. `lib/brandKit.js` reader + `lib/brand-kit-edits.js` overlay (commits f71766f).
- **Brand Management page** (house-admin, "Brand kits" nav): displays the kit + an EDIT-MODE worksheet
  — inline text, color pickers, list add/remove, story-block editing, logo/image upload (Cloudinary).
  Persists per-tenant in localStorage; Export commits JSON to source (commit ffbc4a1).
- **Single-source theming:** `resolveClient` derives brand colors + radius from the kit (commit ffbc4a1).
- **Theme Engine** (`lib/themes.js`): themes = composed layouts (lead color, density, type register,
  fixed cover + product image-placement zones) derived from the kit. Q1=both (CST demo + live per-tenant),
  Q2=placement zone is a fixed, well-composed image area. Two registers now; full five in a design session.
- **Proposal v2:** audience selector (filters story blocks), brand story-block multi-select, theme
  selector; themed render (cover, story blocks with image zones, product range, brand closing). Image
  zones always show a composed brand block as backdrop so composition holds before assets exist.
  Commits cfc8a6c, 2b43b9a, 9cc3fe9.
- **Process note / lesson:** cfc8a6c broke the Netlify build — `themes.js` was left untracked because
  the commit used `git commit -a` (stages modified-tracked only, NOT new files). Fixed in 2b43b9a.
  **Always `git add -A` (not `commit -a`) when a commit introduces new files.**

## 2026-06-13 (cont.) — Pricing tool UX pass (composition for live customer conversations)

Cosmetic/layout work on the Proforma (Pricing & Inventory), driven by Rick using it as a
customer-facing reference. Commits `d5f52b9`, `40af9c0`, `d05b8bb`.
- **Bill-to summary moved** from a 340px right rail to a full-width sticky top bar (bill-to +
  totals + Print/Record). The product table now runs the full width + length — product names
  fit on one line, more rows, no wrapping (was the core complaint).
- **Clickable product image → detail dialog** (`ProductDetailDialog`): large image, description/
  blurb, badge, live price at the selected class-of-trade, stock, lots, and full specs
  (milk/aging/net+gross per case/pieces/pallet/shelf). Built to answer buyer questions on the spot.
- **Dedicated "Inventory & lots" column** — lots were crammed under the product name; now spread
  into an aligned grid (lot # · cases · exp/ETA) with on-hand + on-the-water summary.
- **Larger thumbnails** (44→64px, sharper `card` preset; dialog uses `preview` w_1200).
- **Search moved** out of the controls row to a full-width bar directly above the product list.
- Note: codes not in the manifest (e.g. 02302) use the legacy `monti/<code>` packshot fallback and
  can show a blank thumb — `npm run sync:images` with Cloudinary creds folds in that folder.

## 2026-06-13 (cont.) — F5 SHIPPED: one canonical image source

**The SOURCE is now unified too** (commit `4b729af`), completing "one mind, one body": every surface
reads from ONE per-tenant manifest `src/data/<tenant>/images.json` (single shape), via the
`lib/images.js` reader, rendered by the single `cldImage` builder. Replaced the 3 mismatched
descriptions: `buyer-catalog.json` (deleted — Catalog is now a view over the manifest), `sku.image`
(Proposals/Pricing now use `codeImageUrl`, manifest-first + legacy packshot fallback so all 71 priced
SKUs render), and the media-list path. `scripts/sync-images.mjs` regenerates the manifest from the
Cloudinary Admin API; `npm run media:refresh` = sync + prewarm. Verified live (Catalog 103 images from
the manifest, codes intact). Optional follow-up: run `sync:images` with creds to fold in the
`monti/<code>` packshot folder + move masters to R2.

## 2026-06-13 — Image delivery unified ("one mind, one body") + Phase F shipped

**Big session.** Phase F (admin dashboards, roles, proposal engine) built end-to-end, then a deep
image-performance + unification pass. All on `phase-2-6-build`, deployed to staging.

**Phase F — shipped (commits 74f99fa, 494b7b1, 594a59c):**
- **F1** three-tier passcode roles (client / client-admin / admin) via `functions/gate.js`; storefront
  back-office is now Manage-gated. Passcodes set team-level in Netlify + deployed.
- **F2** Agency console on the house hub (admin-only): tenant management, integration health (live/mock
  per seam + gate ping), data pipelines with staleness flags.
- **F3** catalog metadata editing for client-admins (`lib/catalog-edits.js`, export/import JSON).
- **F4** proposal engine, both tiers (`components/proposals/*`, `lib/proposals.js`): builder + buyer
  share links that carry the proposal in the URL and quote prices LIVE via pricing-core (links never stale).

**Launch wiring (Rick, evening of 06-12):** `https://montitrentini.cheeseshoptech.com` LIVE (Cloudflare
CNAME DNS-only → platform; wildcard still serves coming-soon, specific records override). R2 bucket
`cheeseshoptech-media-archive` created. All three passcodes live.

**Image performance — root cause + fix (commits 7e7f719, 0d83cbe, 2cbbd01, 0de4d3a):**
- Symptom: Media hub + Catalog slow on first load, packshots misaligned.
- **Root cause:** thumbnails used `g_auto` (content-aware crop) → forces Cloudinary to decode the full
  ~45 MP master per image; and grids mounted the entire 100+ image folder at once.
- **Fix:** pad-on-white (no g_auto), 360 px thumbs, paginate 30/page, `npm run prewarm` to pre-build
  derivatives. Verified live via browser network inspection (cold multi-second → ~0.7 s median, warm ~16 ms).
- **Unification ("one mind, one body"):** the Catalog had its OWN URL code separate from the Media hub —
  which is why fixing one didn't fix the other. Consolidated EVERY image URL in the app through one
  builder `cldImage()` in `lib/cloudinary.js` (named presets = single source of truth). Catalog, Media
  hub, Proposals, Pricing tool all delegate; zero raw `res.cloudinary.com` URLs left in render code.

**Next — Phase F5 (designed, spec'd, NOT built):** `docs/IMAGE_PIPELINE_SPEC.md`. The render layer is
unified; the SOURCE isn't — the same images are still described in 3 mismatched files (buyer-catalog.json /
sku.image / media-list). Target = one sync job → one canonical `images.json` manifest per tenant → the
shared builder → every screen. Add a photo, run one command, it's everywhere, correctly sized.

## 2026-06-06 — Session checkpoint: Monti pilot portal is LIVE (passcode go-live)

**Milestone.** The Monti pilot portal is **live and accessible** on staging. Rick set
`VITE_AUTH_MODE=passcode` + `PORTAL_PASSCODE` (team-level Netlify env vars) and redeployed; the live
`/?client=montitrentini` URL now serves the green passcode gate → Operations Portal (verified by
screenshot). Hand Monti the URL + passcode and they're in. (Note: a stray trailing comma in the URL
falls back to the house view — copy it clean.)

**This session's arc (newest entries below):** Ledger design pass inc 2 → terracotta-as-house-signature →
Home hub (Operations-Portal composition becomes the standard landing) → house brand to its own
Terracotta + Cellar Olive → "At a glance" command center → all backend seams finished/ready-to-flip
(Shopify products+orders, campaigns fn) → **pilot passcode auth, then flipped LIVE**. CRM decided:
sample data for the pilot; wire HubSpot once it has deals (Salesforce dead).

**State.** Build feature-complete; `phase-2-6-build` clean + synced. Remaining = Phase 7 launch wiring,
which is mostly Rick feeding content/secrets into already-built seams. HANDOFF.md rewritten clean.

## 2026-06-06 — Pilot auth: shared passcode gate (Identity was too fiddly for one client)

**Decision (Rick).** Netlify Identity (invites, self-set passwords, free-form roles, deprecation
murk) was too much friction for a one-client pilot. Chose a **shared-passcode gate now, Clerk when
client #2 signs.** Match the auth to the stage — per-user roles/tenant isolation only matter with
multiple clients.

**Action.** Built an env-switchable passcode mode (`VITE_AUTH_MODE=passcode`):
- `netlify/functions/gate.js` — checks the passcode against server-side `PORTAL_PASSCODE` (secret).
- `src/components/auth/passcode-gate.jsx` — branded gate UI; POSTs to the function; DEV-only local
  check (`VITE_PORTAL_PASSCODE`) so `npm run dev` works without a functions server.
- `auth-context.jsx` — passcode mode grants a synthetic `client` session on unlock (localStorage),
  so nav/role-gated UI work; no tenant switcher, tenant from URL. `App.jsx` picks `Gate =
  PasscodeGate | RequireAuth` by env. Identity code untouched (the `identity` default is unchanged).

**Status.** validate + build clean; **browser-verified end-to-end** (passcode-mode dev): the
Monti-branded gate renders, correct passcode → lands in the green Operations Portal hub as a client
(no tenant switcher). **Default stays `identity`, so staging is unchanged until [Rick] sets two env
vars** (`VITE_AUTH_MODE=passcode` + `PORTAL_PASSCODE=…`) + redeploys — then Monti's in. Docs:
AUTH_AND_ROLES.md "Pilot auth" + .env.example. **Next:** Clerk swap at client #2 (closes the shared-
passcode limits: single code, client-side unlock flag, `?app=1` house reachable).

## 2026-06-06 — Finish the backend seams: campaigns fn, Shopify orders, admin hydration

**Action.** Completed the remaining ready-to-flip seams (all env-gated, mock default, secrets
server-side; code-complete like CRM — live verification awaits Rick's tokens):
- **Campaigns** — `netlify/functions/campaigns.js` (Make proxy, mirrors CRM; `MAKE_CAMPAIGNS_WEBHOOK_URL`).
  Client `getCampaigns()` already flipped on `VITE_CAMPAIGNS_BACKEND=make`, so this completes it.
- **Shopify web orders** — `netlify/functions/store-orders.js` (Admin API, `read_orders`; uses
  `SHOPIFY_ADMIN_TOKEN`, distinct from the Storefront token) + `fetchStoreOrders()` in `store.js`.
- **Storefront Admin hydration** — `storefront-admin.jsx` now hydrates products + orders on mount via
  `fetchStoreProducts()`/`fetchStoreOrders()` (Shopify in headless mode, seed otherwise). Theme/
  content/settings stay portal-owned.
- `.env.example` — `MAKE_CAMPAIGNS_WEBHOOK_URL` + `SHOPIFY_ADMIN_TOKEN`.

**Status.** validate + build clean; functions syntax-checked; **browser-verified the Storefront Admin
still renders** (Design/Products/Content/Orders/Settings, live hero preview) — mock path unchanged.
**Net:** every mock seam is now code-complete and flips on env. What remains is purely Rick's launch
wiring (build the Make scenarios, provision real Shopify Storefront+Admin tokens, set the env vars) +
Phase 7 ops. No more verifiable code to write until a real backend/token exists.

## 2026-06-06 — Storefront → Shopify headless: products read path built (ready to flip)

**Decision (Rick).** Storefront commerce engine = **Shopify (headless)** — Shopify owns products +
checkout/payments/tax/inventory; the portal owns the experience + admin content. Reuses Monti's
existing Shopify rather than rebuilding commerce.

**Action.** Built the products read path, code-complete + env-gated (mirrors the CRM function;
secrets server-side; mock default — no live verification possible without Rick's token, same as CRM):
- `netlify/functions/store.js` — Shopify **Storefront API** GraphQL products proxy; maps to the
  portal store-product shape; needs `SHOPIFY_STORE_DOMAIN` + `SHOPIFY_STOREFRONT_TOKEN`.
- `src/lib/store.js` — added `fetchStoreProducts()` (async; Shopify when `VITE_STORE_BACKEND=shopify`,
  else seed products, with fallback). `getStore()` stays sync (portal-owned theme/content/settings).
- `.env.example` — Shopify secrets + all backend switches documented. `STOREFRONT_STRATEGY.md` —
  wiring-status table (what Shopify owns vs the portal; what's built vs deferred).

**Status.** validate + build clean; **frontend bundle byte-identical** (helper tree-shaken until
consumed → zero regression); function syntax-checked. **To go live [Rick]:** a real Shopify store
with Storefront API enabled (current mt-e-comm shopify-store is a static mock) + set the 3 env vars.
**Remaining code (small, post-token):** hydrate the Storefront Admin product list via
`fetchStoreProducts()`; Admin-API orders read. Campaigns mirror this once a data source is chosen.

## 2026-06-06 — Home hub: "At a glance" command center + mock-seam audit

**Action.** Folded the (now-orphaned) `home-dashboard.jsx` content into the hub as an **"At a glance"**
section below the tool cards — new `components/home/command-center.jsx` (pipeline by stage, active
campaigns, recent activity, overdue invoices), rendered only for tenants with a CRM
(`hasCrm`), so the agency house hub stays clean. Deleted `home-dashboard.jsx` (superseded). The home
is now a true intro **and** command center. Verified: validate + build clean; browser-checked Monti
(full composition) — house unaffected.

**Mock-seam audit (the "off mock" reality).** Checked the three remaining mock seams — they're
already architected to flip to real via env flags, so "off mock" is mostly launch wiring + backend
choices, not new code:
- **CRM = code-complete.** `netlify/functions/crm.js` already proxies a Make webhook server-side;
  client flips on `VITE_CRM_BACKEND=make`. **Needs [Rick]: build the Make scenario + set
  `MAKE_WEBHOOK_URL` + `VITE_CRM_BACKEND=make` in Netlify.** No code left.
- **Storefront / Campaigns = stubbed real path, no backend yet.** `getStore`/`saveStore` +
  campaigns have the seam but the non-mock branch is a stub because there's no backend to point at.
  **Needs a decision first:** which commerce engine for the store (Shopify/Stripe/Medusa per
  STOREFRONT_STRATEGY) and where campaigns data lives — then the Netlify function mirrors the CRM one.

## 2026-06-06 — House brand → its own Terracotta + Cellar Olive (clients keep their color)

**Decision (Rick).** Swap the HOUSE brand back to the real CheeseShop TECH palette — **Terracotta
`#9A3B1B` primary + Cellar Olive `#5F6B2E` accent** (matching the wordmark) — so the agency reads
distinct from green clients like Monti. Supersedes the earlier "house → Forest Green" decision. The
green was only ever the *house* default; **tenants override their own color, so Monti stays fully
green** (montitrentini.json unchanged).

**Action.** Token-only: `src/lib/tokens.js` HOUSE.brand.colors + `src/index.css` :root house
fallback (primary `#9a3b1b`, accent `#5f6b2e`; on-primary/on-accent stay white, AA ✓). Updated
DESIGN_SYSTEM A (intro/A2/A5) to "warm artisanal house, tenants set their own." **Status.** validate
+ build clean; **browser-verified** — house hub now renders terracotta masthead/nav/figures
(Command Center); Monti hub still green. No per-client code touched.

## 2026-06-06 — Home hub: Operations-Portal composition becomes the standard landing

**Decision (Rick).** Adopt the Monti **Operations Portal** hub composition (the
`mt-e-comm.netlify.app/portal/` page he liked — green textured masthead + overlapping stat
rollup + tinted tool-launch cards) as the **standard home/landing for every client** in the
platform, CheeseShop-TECH-branded for the house. Hub **replaces** the old data-dashboard as the
home; tool cards click into the sidebar app. Solves the empty-house-dashboard gap at the same time.

**Action.** Ported it into the SHARED layer (no per-client code; differentiation = content + tokens):
- New `components/home/home-hub.jsx` — masthead (brand-primary gradient that darkens toward the
  corner so any tenant color works + cross-hatch + logo chip + italic motto eyebrow + display
  title/tagline), stat row pulled up to overlap the masthead, tinted tool cards w/ status-eyebrow tags.
- New `lib/hub-stats.js` — stat rollup: explicit config stats → house cross-tenant rollup
  (tenants/tools/modules) → tenant ops rollup (products / cases on hand / on the water / SKUs
  arriving / standing commitments, from the canonical `getPricingData` bundle — same logic as the
  static portal) → none.
- Content is config-driven: new `home` block (eyebrow/title/tagline/footer/optional stats) + tool
  `tag` field added to `client.schema.json`, `montitrentini.json` (Operations Portal copy), and
  `HOUSE` defaults in `tokens.js` (“Command Center”). Resolver surfaces `home` with house fallback.
- Extended the shared `ui/stat.jsx` with an `accent` prop (token-driven figure color) so the
  multi-color stat row stays on the ONE shared component. `App.jsx` lands on `dashboard` → `HomeHub`.

**Status.** validate + build clean; **browser-verified** both views — Monti renders the Operations
Portal faithfully inside the shell (34 / 3,921 / 1,908 / 18 / 6, real data); house renders a
CheeseShop-branded “Command Center” rollup (no longer empty). **Open:** house rollup is lightweight
(counts, not live cross-tenant metrics); old `home-dashboard.jsx` (pipeline/campaign cards) is now
unused — fold the best of it into the hub or a secondary section later if wanted.

## 2026-06-06 — Brand reconciliation: terracotta kept as the house wordmark signature

**Decision (Rick).** Spotted that the wordmark + favicon were still **Terracotta `#9A3B1B`** (the
original "warm artisanal" house primary) after the house was swapped to Forest Green — the running
app is green, but `cstech-wordmark.svg`, `cstech-favicon.svg`, and `DESIGN_SYSTEM` Part A still read
terracotta. Rather than finish recoloring everything green, Rick chose to **keep terracotta as the
deliberate house brand-mark signature** — warm wordmark over green chrome, a house-only identity cue
(doubles as an agency-vs-client distinguisher; tenants render their own color).

**Action.** Docs/comment only — **no asset or token change**, so the app is byte-identical (JS
bundle hash unchanged). Updated `DESIGN_SYSTEM` A (intro), A2 (primary→Forest Green, accent→Italia
Green, added a "Brand-mark signature: Terracotta — wordmark/favicon only, not a token" row), A5
(noted the terracotta wordmark is intentional, keep it); fixed the stale "warm artisanal" comment in
`tokens.js`. **Status.** validate + build clean. Closes the stale-brand-doc open thread.
**Open:** any external `CheeseShopTECH_Brand_Foundation.md` still needs the same green+terracotta update.

## 2026-06-06 — "Ledger" design pass increment 2 (shared Stat sweep + house signal)

**Action.** Completed the increment-1 follow-up. (1) **Stat sweep:** extended shared
`ui/stat.jsx` to absorb every variant — added optional `icon` (right slot, falls back from
`badge`), `onClick` (clickable deep-link tile w/ hover-border), and `tone="error"` props — then
deleted the **five** divergent local copies (`App.jsx` StatCard, `pricing-tool.jsx` Stat,
`crm-dashboard.jsx` Stat, `campaigns-page.jsx` Stat, `home-dashboard.jsx` KpiCard) and pointed all
consumers at the one component. Net −49 lines. The CRM/Campaigns/Home KPI tiles thereby **upgrade**
from plain `text-2xl` sans figures to the editorial italic-serif figure + uppercase eyebrow — the
whole point of the sweep. (Left Campaigns' tiny in-card `Metric` alone — different element.)
(2) **Agency-vs-client signal (Rick's pick: quietest option):** the shared `AppShell` now renders
a `cs-eyebrow` **"Agency Console"** tag under the wordmark **only when `resolved.isHouse`** — a
type/layout signal, NOT a color change (house stays Forest Green per the brand decision). Driven by
the existing tenant-resolver flag; no per-client code.

**Why.** Increment-1 left "sweep remaining stat tiles to shared Stat" + "add an agency-vs-client
distinguishing treatment (both green now)" open (see entry below). This closes both.
**Status.** `validate:clients` + `build` clean. **Verified in a real browser** (vite dev + headless
Chrome): house view shows the Agency Console tag + editorial Catalog tiles; Home KPI tiles render
the icon-variant editorial figure; tenant (montitrentini) view shows "Monti Trentini" wordmark with
**no** tag (gating confirmed: `hasAgencyTag:false`). Per-tenant green retained throughout.
**Unblocks:** Ledger pass effectively complete; remaining In-flight is code (CRM/store off mock) or ops (Phase 7).

## 2026-06-06 — Project tidy + Best-Practices Manual (cross-surface continuity)

**Action.** Operating-hygiene checkpoint. Created **`docs/BEST_PRACTICES.md`** — the manual for
keeping work coherent across the four Claude surfaces (Chat · Cowork · Claude Code · Claude Design):
the canonical-doc map (one home per fact), tool routing, the **checkpoint ritual** (build green →
commit → BUILD_LOG → rewrite HANDOFF), git/deploy discipline, and templates. **Rewrote `HANDOFF.md`**
to true current state (it was badly stale — predated all of today's work). **Tidied:** deleted 20
stray `vite.config.js.timestamp-*.mjs` + `.DS_Store`; archived the completed one-off
`CODE_HANDOFF.md` → `docs/archive/`; committed `CLAUDE_CODE_BRIEF.md` into the repo.
**Why.** The recurring drift (a surface re-deriving state from a rotted handoff) needed a system.
**Status.** Docs only; no code change.

## 2026-06-06 — "Ledger" design pass (house-wide, via shared layer)

**Action (Rick).** Bring the editorial "Ledger" feel Rick liked from the Monti portal into the
PLATFORM — applied through shared tokens/components so it cascades to every tenant + module, colors
stay per-tenant (no per-client forks; DESIGN_SYSTEM Part E).
- Type: load Fraunces **italic** axis; `h1,h2` + `CardTitle` render italic-serif (base layer).
  Tables get `tabular-nums`. New utilities `.cs-display`/`.cs-num`/`.cs-eyebrow` (index.css).
- Components: `ui/table.jsx` (finer tracked heads), `ui/badge.jsx` (uppercase tracked tags),
  `ui/card.jsx` (italic title, flatter shadow-sm), `layout/app-shell.jsx` (italic brand + eyebrow
  footer). New shared `ui/stat.jsx` (big italic-serif figure + eyebrow). Migrated inline stat tiles
  in App.jsx + pricing-tool.jsx. Documented in DESIGN_SYSTEM (A3 + B4 table).
- Verified: validate + build clean; rendered house catalog + Monti pricing — cohesive editorial look,
  per-tenant green retained. **Open:** sweep remaining module page headers/stat tiles to shared Stat
  in a follow-up; consider an agency-vs-client distinguishing treatment (both green now).

## 2026-06-06 — Pricing tool: fee line items + lot/expiry on the price list + Print/PDF

**Decision (Rick).** (1) Freight/handling are SEPARATE LINE ITEMS on the proforma, added at
proforma time, never folded into $/lb: **Trucking = $0.30/lb** on all delivered orders;
**Processing fee = $135** on delivered orders **under 1,500 lb**. Labels exactly "Trucking" /
"Processing fee". (Replaces the old flat-$300-below-threshold model.) Pickup = no fees.
(2) Show **lot # + expiration + in-transit ETA inline** on the price-list rows for a quick read
(editing/management stays on its own page). (3) **Print / PDF** the proforma.

**Changed:** `src/lib/pricing-core.js` `freightLines()` (trucking $/lb always + processing
below-threshold); `src/data/montitrentini/client.config.json` freight block; `pricing-tool.jsx`
(per-row lot/expiry list, `printProforma()` → clean branded proforma window with FIFO lot
allocation per line, "Print / PDF" button). Verified: freight math (1200lb→$360+$135; 1800lb→$540;
pickup→none), validate + build clean, rendered. Config-only %s still provisional pending Sales Management.

## 2026-06-06 — House brand → Forest Green (supersedes Brand Foundation cool-studio rec)

**Decision (Rick).** Swap the CheeseShop TECH HOUSE brand to Forest Green (primary `#064E22`,
accent `#009640`) — green-on-warm-cream, in the Monti family — extending the look Rick liked
across the agency portal itself. Changed `src/index.css` (locked house defaults) + `src/lib/tokens.js`
(HOUSE fallback). Locked warm-stone surfaces unchanged. Build clean; AA on-primary = white ✓.

**Note / open:** this REVERSES the cool/neutral-studio direction in `CheeseShopTECH_Brand_Foundation.md`
§5/§7 (which argued the agency should read distinct from warm client brands so it doesn't compete).
The house now resembles the Monti client palette. Intentional per Rick. **TODO:** update the Brand
Foundation + DESIGN_SYSTEM house-brand section to record the new decision; consider a distinguishing
treatment (type/layout) so agency ≠ client even though both are green.

## 2026-06-06 — Pricing & Inventory native tool (closes the price-list gap)

**Action.** Added a native Pricing & Inventory tool for the Monti tenant — the platform's first
real B2B pricing capability, replacing the `price-list` "coming-soon" stub. Branch `pricing-module`.

- **Engines** (`src/lib/pricing-core.js`, `src/lib/forecast-core.js`): portable, framework-free
  quote/freight/allocation + demand-vs-supply forecast logic (ESM ports of the engines proven
  19/19 in the storefront build). Verified here: 6/6 logic checks on real data.
- **Data seam** `src/lib/pricing.js` (`getPricingData(resolved)`, mock-bundled now via
  `src/data/montitrentini/*.json` — canonical catalog/inventory/commitments/config from the
  adapters; real Netlify-function backend deferred, same shape). Movement capture → localStorage
  ledger (`mt-movement-ledger`).
- **UI** `src/components/tools/pricing-tool.jsx`: token-themed (no hardcoded brand — inherits
  tenant theme), three tabs (Proforma live quoting + Record-sale capture · Movement report ·
  Commitments). Uses platform UI components.
- **Wiring**: `montitrentini.json` price-list tool → `type:internal, route:"pricing", featured`,
  status live; `App.jsx` dispatches featured `route:"pricing"` → `<PricingTool>`.

**Decision.** Class-of-trade reflects the real model: distributor 0% (HQ list) / direct-retail +15%
/ direct-consumer +35% — provisional, config-tunable, pending Sales Management.

**Status.** Config validates; all files parse clean; engine logic verified. **Full `npm run build`
NOT run** (this dev machine's node_modules is Linux-only / no native Mac node) — build + render
must be confirmed in a real env before merging `pricing-module` → `phase-2-6-build`. **Not deployed.**

## 2026-06-06 — 🟢 MEDIA HUB LIVE ON REAL CLOUDINARY (first real backend)

**Verified working in production.** Direct call to the deployed function
`GET /.netlify/functions/media-list?folder=monti-trentini` returns **103 real Monti Trentini assets**
from the Cloudinary `monti-trentini` folder (Apericheese, Asiago Antico Maso/Casetta/di Alpeggio, …),
with titles from Cloudinary captions, mapped to the `products` tab, `approvalState: draft`.

**Chain confirmed end to end:** function authenticated to Cloudinary Admin API (server-side
key/secret env vars work) → correct folder → delivery via cloud `sofcvmwa`. Mock is off
(`VITE_MEDIA_BACKEND=cloudinary`). This is the platform's **first real (non-mock) backend**.

**Config that made it work (commit `9197234` on `phase-2-6-build`):** `montitrentini.json`
`cloudinaryFolder` → `monti-trentini`; `media-list` default folder → `products`. Netlify env set:
`CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET`, `VITE_CLOUDINARY_CLOUD=sofcvmwa`,
`VITE_CLOUDINARY_UPLOAD_PRESET=cstech_unsigned`, `VITE_MEDIA_BACKEND=cloudinary`.

**Note.** All 103 assets are `draft` (untagged) → admin/client see all; PR/influencer see none until
tagged `approved-for-press` / `approved-for-influencers`. Tagging workflow is the next media refinement.

**Process note.** Git from the Cowork sandbox is unreliable (stray `.git/*.lock`, no push creds) —
commit/push done from the native terminal (needed `sudo rm -f .git/HEAD.lock`). Going forward, do git
in Claude Code per `TOOL_ROUTING.md`.

---

## 2026-06-06 — Real media backend (Cloudinary read + upload)

**Built (first real backend).** Media is now wired for live Cloudinary, not just mock:
- **Read:** `media-list` Netlify function hardened with `next_cursor` pagination (≤5 pages) — server-side
  Admin API, secret never in the browser. Maps folder/sku/approval-tag/title.
- **Upload:** `uploadAsset()` in `cloudinary.js` does a direct browser→Cloudinary POST via an **unsigned
  upload preset** (no secret), into `clients/<id>/<subfolder>`, tagged `draft`. Media Hub upload button
  now opens a real file picker, uploads (multi-file), shows progress, and prepends results to the grid.

**To flip from mock to live (Rick — config only):** create Cloudinary folders + an unsigned preset,
set Netlify env (`CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` server; `VITE_CLOUDINARY_CLOUD`,
`VITE_CLOUDINARY_UPLOAD_PRESET`, `VITE_MEDIA_BACKEND=cloudinary` build), redeploy. Steps in
`docs/MEDIA_HUB.md` + LAUNCH §4. Secrets entered by Rick (Claude never enters credentials).

`node --check` passes on the function; `vite build` clean. Not pushed yet.

---

## 2026-06-06 — Home dashboard (cross-module command center)

**Built.** The `Dashboard` tab now renders a new `HomeDashboard`
(`src/components/home/home-dashboard.jsx`) that aggregates all modules: greeting + store-status badge,
KPI grid (pipeline value, active campaigns, campaign reach, open orders, overdue invoices, media
assets — each deep-links to its module), pipeline-by-stage, active-campaigns list, recent activity,
and an overdue-invoices "needs attention" panel. Pulls in parallel from crm/campaigns/media/store
libs (all mock for now). Replaced the old `dashboard`→CrmDashboard route; `OrdersPage` still wired.
`CrmDashboard` component retained in the file but no longer routed (pipeline/invoices now surface on Home).

`npm run validate:clients` passes; `vite build` clean. Built autonomously while Rick was away. Not pushed.

---

## 2026-06-06 — Campaigns module (the sales + social engine)

**Built.** `Campaigns` nav tab (after Dashboard, admin/client) — the core POSITIONING pillar.
`src/lib/campaigns.js` (mock + `getCampaigns()` seam, `canViewCampaigns`, status/channel helpers) +
`src/components/campaigns/campaigns-page.jsx`: stat cards (active/scheduled/reach/attributed revenue),
campaign cards with channel chips (retail/DTC/social), status, date range, asset count, and live-KPI
row for active campaigns, plus a New-campaign dialog (scaffold). Enabled `campaigns` in Monti's
`modules`. Mock data (4 Monti campaigns); real backend (Make/CRM/social analytics) swaps behind the seam.

`npm run validate:clients` passes; `vite build` clean. Not pushed yet.

---

## 2026-06-06 — STRATEGY LOCKED — headless storefront rebuild

**Decision (Rick + Claude).** When a client's storefront moves into the portal, we **rebuild the
experience layer natively and run headless** — a commerce engine (their Shopify, or Stripe/Medusa)
keeps checkout/payments/tax/fraud/fulfillment; the portal owns design, merchandising, content, admin,
and the conversion data. We do NOT rebuild commerce (that's rebuilding Shopify badly + owning a
client's revenue/uptime). This is the moat + the productized value-add ("we rebuild, improve, and run
your store"). Offering tiers: Connected (link-out) → **Headless rebuild** (paid value-add) → Fully
native (high liability, avoid). The Storefront Admin's `saveStore()` seam will target the commerce
API via a Netlify function (secrets server-side) when a real client signs.

**Captured in:** `docs/STOREFRONT_STRATEGY.md` (canonical), `POSITIONING.md` (pointer),
`PRICING_AND_ENGAGEMENT_MODEL.md` (build-fee tier note).

---

## 2026-06-06 — Storefront Admin (Live/Admin toggle + back-office)

**Built.** The featured Storefront page now has a **Live site | Admin** toggle (shown when
`tool.admin: true`; the Storefront tab is already admin/client-gated, so it reuses the portal login —
no separate auth). Admin = a tabbed store back-office (`src/components/tools/storefront-admin.jsx`):
- **Design** — primary/accent colors, logo, fonts, layout, hero headline/subhead + live preview.
- **Products** — table + Add-product dialog with **price & description**.
- **Content** — announcement bar, banners + pages with publish toggles.
- **Orders** — store order history.
- **Settings** — store status (live/maintenance), currency, flat shipping, payment provider.
A "Publish changes" action saves via the `saveStore()` seam (mock now; pushes to the live store later).

**Data.** `src/lib/store.js` mock store model + `getStore()/saveStore()` seam (`VITE_STORE_BACKEND`).
Schema gained `tool.admin`; set on Monti shopify. Scope per Rick: design, products (price+desc),
content, orders, settings — all under the existing admin/client login.

`npm run validate:clients` passes; `vite build` clean. Not pushed yet.

---

## 2026-06-06 — Storefront promoted to a featured tab (embedded)

**Change.** A tool can now be `featured: true` → it gets its own top-level nav tab (placed right after
Dashboard) with a full page (`src/components/tools/featured-tool.jsx`): hero header, prominent
"Open full store" button, and — when `embed: true` — a **live in-portal iframe preview** of the tool
(with a framing fallback note + full-screen link). Featured tools are excluded from the Tools grid.
Shared icon map added (`src/lib/icons.js`). Schema gained `featured` + `embed` booleans.

**Monti.** Shopify tool → `featured:true, embed:true, icon:store, label:"Storefront"` → it's now a
"Storefront" tab embedding `mt-e-comm.netlify.app` live in the portal. Per Rick: make the store feel
like a first-class feature, not a tile.

`npm run validate:clients` passes; `vite build` clean. Not pushed yet.

---

## 2026-06-06 — Tools module — surface a client's existing tools (launch tiles)

**Built.** Config-driven "Tools" page: each client lists existing tools in a `tools[]` array; the
portal renders branded launch tiles. `external` → opens a new tab (noopener); `internal` →
navigates within the portal; `coming-soon` → disabled tile. Added `tools` to `client.schema.json`
+ `_template.json`, carried through the resolver, and new `src/components/tools/tools-page.jsx`.
Nav item "Tools" (admin/client). Per the white-label rule, a new client's tools = config only.

**Monti seed.** Shopify storefront (external, **URL is a placeholder** `REPLACE-ME.myshopify.com`),
Image catalog (internal → the native Media Hub), Price list calculator (external, `coming-soon`
— the local Custom Price List Creator isn't hosted yet). Decisions this session: launch-tiles style,
tools are mixed/some-local.

**ACTION (Rick):** provide the real Shopify URL; host the price-list calculator (then set its URL +
flip status to `live`). Tracked on the launch list.

`npm run validate:clients` passes; `vite build` clean.

---

## 2026-06-06 — Identity enabled + invite/recovery handling added

**Netlify (driven via browser).** Enabled Netlify Identity on the `cheeseshoptech-platform` site
(API endpoint `…/.netlify/identity`), set registration to **Invite only** (email confirmation
required), invited **Rick.posada@outlook.com**, and set their role to **admin**.

**Code.** Our custom login (not the Netlify widget) now handles Identity hash-token links —
`getHashToken()` + `acceptInvite` / `completeRecovery` / `confirmSignup` in `auth.js`, and a
`SetPassword` screen wired into `App.jsx` BEFORE routing (invite links land on the apex). Post-accept
redirects admins to `/?app=1` (the house portal) so they don't bounce to coming-soon.

**Tenant assignment via roles.** Netlify's dashboard only edits ROLES (not arbitrary app_metadata),
so `tenantOf()` now also reads a `tenant:<id>` role. Assign a Monti client `client` + `tenant:montitrentini`.

**Also staged (not yet pushed):** Monti placeholder-logo fix (tenant logo → brand name fallback).

**ACTION (Rick):** push so staging redeploys, THEN click the invite email:
`rm -f .git/index.lock && git add -A && git commit -m "Auth: invite/recovery handling, tenant-role, logo fix" && git push`
(Sandbox still can't push — stale lock perms.) After redeploy, the invite link will work.

`vite build` clean (build verified).

---

## 2026-06-05 — Git-connected staging site live (cheeseshoptech-platform)

**Done.** Created a NEW git-connected Netlify site **`cheeseshoptech-platform`**
(https://cheeseshoptech-platform.netlify.app) from the repo. Production branch = `phase-2-6-build`,
build `npm run build` → `dist`, functions dir `netlify/functions` (auto-detected from netlify.toml).
First deploy published in ~20s; verified live — the Monti tenant login screen renders
(`?client=montitrentini`), burgundy-skinned with the co-brand footer. CI now works:
pushes to `phase-2-6-build` auto-publish. `cheeseshoptech.com` (Drop coming-soon) left untouched.

**This is the staging/preview site.** At launch: merge to `main`, set production branch = `main`,
point the `cheeseshoptech.com` domain + `*` wildcard at this site.

**Next:** enable Netlify Identity on THIS site (login renders but can't auth yet). Minor cleanup:
`montitrentini.json` logo is a placeholder `<cloud>` URL → broken image on login; set real or clear.

---

## 2026-06-05 — CORRECTION — cheeseshoptech.com is a Netlify Drop site, not git-connected

**Finding (verified in the Netlify dashboard).** The live `cheeseshoptech.com` project shows
"Last deployed from Netlify Drop" — a manual drag-and-drop deploy, **NOT connected to the GitHub
repo.** Therefore git pushes/PRs trigger no build and produce no deploy preview (PR #1 has 0 checks).
This **corrects** the assumption (from the walkthrough/OM) that "commit + push → Netlify auto-deploys"
— that's the intended design, not the current wiring. Implication: earlier deploy-risk warnings about
pushing to `main` replacing the apex were moot — the site isn't linked.

**Other Netlify projects present:** `monti-trentini-catalog`, `mt-e-comm` (both "Deploys from GitHub"),
`super-platypus-…` (Drop). Likely earlier experiments — flagged for cleanup.

**Decision pending (Rick).** How to host/CI the platform: connect cheeseshoptech.com to the repo, or
a new git-connected site, or keep local dev + Drop for now. Tracked in LAUNCH_AND_MAINTENANCE.md §1b.

---

## 2026-06-05 — Netlify functions built (media-list, crm)

**Built.** `netlify/functions/media-list.js` (Cloudinary Admin API → asset list, approvalState from
tags, secrets server-side) and `netlify/functions/crm.js` (proxies the Make webhook). Added
`[functions]` to `netlify.toml` (esbuild bundler) and extended `.env.example` with the frontend
`VITE_*` flags (cloud name, upload preset, backend switches, gotrue url, dev bypass). Both pass
`node --check`; app build clean.

**Activation (Rick, on launch list).** Set the server env vars (Cloudinary keys / `MAKE_WEBHOOK_URL`),
then flip `VITE_MEDIA_BACKEND=cloudinary` / `VITE_CRM_BACKEND=make`. Until then the app stays on mock
data. Can't be tested here without live accounts — code is complete and wired.

---

## 2026-06-05 — Apex coming-soon route — deploy risk resolved

**Built.** `src/components/marketing/coming-soon.jsx` (house-branded public landing). `App.jsx` now
serves it at the **apex/house view** (no tenant subdomain) and only renders the portal at
`<client>.cheeseshoptech.com`. **This removes the deploy blocker:** pushing to `main` no longer
replaces the public page — `cheeseshoptech.com` stays a landing page while subdomains serve the app.

**Routing rules.** Apex (isHouse, no `?app`/`?client`) → ComingSoon. Staff reach the house portal at
the apex with `?app=1`; `?client=<sub>` previews a tenant (dev). Admin tenant switcher → House now
sets `?app=1` so admins land on the house portal, not the public page. Dev (`npm run dev`) shows
coming-soon by default; use `?app=1` or `?client=montitrentini` to preview the portal.

**Note.** Monti Trentini is confirmed tenant #1 / first test account (already in `config/clients/montitrentini.json`).

`vite build` clean (1,614 modules).

---

## 2026-06-05 — PHASE 6 — CRM dashboard built (mock backend; Make wiring deferred)

**Built.** CRM data layer `src/lib/crm.js` with a `getCrmData()` seam (mock now; real later via
`/.netlify/functions/crm` → Make webhook, secrets server-side; `VITE_CRM_BACKEND=make`). Pages
`src/components/crm/crm-dashboard.jsx`: **Dashboard** (stat cards — pipeline value, open orders,
overdue invoices, contacts; pipeline-by-stage bars; activity feed; invoice table) and **Orders**
(order history table). Data shape per OM §7 (contacts/pipeline/orders/invoices/activity). Wired into
the nav for the `dashboard` + `orders` pages.

**Access control.** `canViewCrm` = admin/client only. Added **role-based nav filtering** in `App.jsx`:
external roles (pr/influencer/creator) now see only the Media hub; admin/client see all pages. Invalid
page for a role falls back to the first allowed page. `crm: none` → "connect a CRM" empty state, no error.

**Deferred to launch.** Make scenario (client CRM → data shape), CRM tokens + webhook URL in Netlify
env, then build the `crm` function. Tracked in LAUNCH_AND_MAINTENANCE.md §6. Detail in docs/CRM_CONNECTOR.md.

`vite build` compiles clean (1,613 modules).

---

## 2026-06-05 — PHASE 5 — Media hub built (mock backend; real Cloudinary sync deferred)

**Built.** Cloudinary delivery layer `src/lib/cloudinary.js` (named transforms thumb/card/hero/original,
applied at delivery per OM §6; cloud name account-global via `VITE_CLOUDINARY_CLOUD`, defaults to the
public `demo` cloud in dev). Media data layer `src/lib/media.js` with a `listAssets()` seam: mock
backend now (food sample images on the demo cloud so the gallery renders), real backend later via a
`/.netlify/functions/media-list` Cloudinary Admin API proxy (`VITE_MEDIA_BACKEND=cloudinary`). Media
Hub UI `src/components/media/media-hub.jsx`: folder tabs (products/brand/raw), gallery grid (card
transform), asset dialog (hero + copy delivery URL + approval control), upload affordance (env-gated
on an unsigned preset). Wired into the nav (the `media` page). `resolved` now carries `cloudinaryFolder`.

**Roles & approval.** States `draft → approved-for-press → approved-for-influencers`. Role visibility
(least privilege): admin/client = all + manage; creator = drafts; pr = press; influencer = influencer
assets. Maps the POSITIONING content-studio → media-hub → campaigns chain. Full detail in
`docs/MEDIA_HUB.md`.

**Deferred to launch (account/secrets — not buildable in code).** Create Cloudinary client folders,
set cloud name + API key + unsigned preset in Netlify env, then build the `media-list` function.
Tracked in the new `docs/LAUNCH_AND_MAINTENANCE.md` (consolidated launch + recurring ops checklist).

**Phasing.** Walkthrough Phases 2–5 now built in code (design system, auth, shell/tenant resolution,
media). Operational go-live for auth + media lives on the launch list. Next build phase: 6 (CRM via Make).

`vite build` compiles clean (1,611 modules).

---

## 2026-06-05 — PHASE 3 — Auth (Netlify Identity) built; needs Netlify enablement

**Verified first.** Netlify Identity is NOT deprecated — Netlify reversed the deprecation on
2026-02-19 (confirmed via search). Safe to build on.

**Built.** Custom house-branded auth on Netlify Identity via `gotrue-js` (chose custom over the
Netlify widget so login renders in the design system and can be tenant-skinned). Added:
`src/lib/auth.js` (GoTrue client + role/tenant helpers), `src/lib/auth-context.jsx`
(`AuthProvider` / `useAuth`), `src/components/auth/login-screen.jsx`,
`src/components/auth/require-auth.jsx` (`RequireAuth` tenant-scope gate + `RoleGate`). Portal now
sits behind auth; topbar has a user menu (avatar/role/logout); tenant switcher is admin-only.

**Model (lightweight v1, per POSITIONING).** Roles `admin|client|pr|influencer|creator` + a
`tenant` field, both in `app_metadata` (server-controlled). Tenant scoping: non-admin can load a
portal only if `app_metadata.tenant === subdomain` (admins any) — satisfies the no-cross-tenant DoD.
Full model + Rick's Netlify setup steps in `docs/AUTH_AND_ROLES.md`.

**Dev note.** Identity has no local endpoint, so `AuthProvider` injects a mock admin on `npm run dev`,
guarded by `import.meta.env.DEV` (cannot run in a production build). `VITE_DEV_BYPASS_AUTH=false`
to preview the real login.

**Phasing note.** This is walkthrough Phase 3 (auth). Walkthrough Phase 4 (shell + tenant
resolution) was already done early in our Phase 2, so its checklist is effectively met too.

**Still needed for DoD (Rick actions).** Enable Identity on the site, invite a test user + set
their metadata, deploy, then verify login + tenant scoping over HTTPS.

`vite build` compiles clean (1,608 modules).

---

## 2026-06-05 — DECISION — two-surface branding model locked

**Decision.** Storefront (customer-facing) = **100% client brand, always**, no platform mark.
Internal portal (operator-facing) = **co-branded**: client logo + tokens dominant with a subtle,
persistent "powered by CheeseShop TECH" mark (AppShell sidebar footer). Rationale: services-brokerage
retention — keep platform value visible without competing with the client's brand. Buyout fork drops
the mark. The mark is NOT a client-overridable token. Logged in `DESIGN_SYSTEM.md` B0. Already
matches the shipped shell.

---

## 2026-06-05 — PHASE 2 COMPLETE — full component catalogue shipped

**Status.** Phase 2 done. Full B4 catalogue built on the shadcn pattern (Radix + cva +
tailwind-merge), all token-themed and AA-accessible. `vite build` compiles clean (1,603 modules,
CSS 16.9 kB / JS 306 kB gzip ~98 kB).

**Added.** `@radix-ui` primitives (dialog, tabs, select, checkbox, switch, radio-group, label,
toast, slot). Components in `src/components/ui/`: button (now ref-forwarding + asChild), card,
input/textarea, label, select, checkbox, radio-group, switch, badge, table, tabs, dialog, toast
(+ `ToastProvider`/`useToast`), breadcrumb, empty-state, skeleton. Layout `app-shell.jsx`
(sidebar + topbar). `App.jsx` rebuilt into a real portal page (nav, stat cards, tabbed table /
form / empty / loading, dialog, toasts) with the live tenant switcher preserved. Catalogue table
documented in `docs/DESIGN_SYSTEM.md` B4.

**Env note (not a code issue).** Local `vite build` can't empty the stale `dist/` from a prior
session — those files are host-locked (EPERM on `.DS_Store`). Compile succeeds every run; verified
via a clean `--outDir`. Delete the old `dist/` folder in Finder if a local build is wanted; it's
gitignored and irrelevant to Netlify CI builds.

**Unblocks.** Phase 3 — auth + tenant routing (production subdomain→tenant load, lightweight roles).

---

## 2026-06-05 — PHASE 2 — Design system locked + white-label shell scaffolded

**Status.** Phase 2 DoD (decisions + scaffold) met. `npm run build` compiles clean (44 modules);
`npm run validate:clients` passes.

**Decisions locked** (`docs/DESIGN_SYSTEM.md` — supersedes the `>>> DECIDE:` prompts in DESIGN_GUIDE_STARTER):
- **House brand direction = warm artisanal.** Primary "Terracotta" `#9A3B1B`, accent "Cellar Olive"
  `#5F6B2E`, warm stone neutrals, espresso text `#221C14`, paper bg `#FAF6F0`. Headings Fraunces,
  body Inter, mono JetBrains Mono. Distinct from tenant #1 Monti Trentini (burgundy + gold).
- **Overridable tokens (client):** `color.brand.primary`, `color.brand.accent`, `logo`,
  `font.heading`, `font.body`, `radius`. Everything else (neutrals, semantic, spacing, type scale,
  elevation) is **locked/structural**.
- **Theming mechanic:** CSS custom properties (`--cs-*`) + Tailwind theme extension (not CSS-in-JS).
- **AA contrast guardrail:** runtime resolver computes on-color by luminance, warns + falls back if a
  client color can't reach 4.5:1. Same check gates `validate:clients`.

**Built.** Vite + React 18 + Tailwind 3 toolchain (none existed before). Token defaults in
`src/index.css`; `src/lib/{tokens,contrast,theme,clientConfig}.js` resolve a tenant from subdomain
(or `?client=` in dev) and inject its tokens. shadcn-pattern `Button` + `Card` reference components
(cva + tailwind-merge). Demonstrator `App.jsx` with a live tenant switcher proves one codebase
re-skins from config alone. Config schema formalized: `config/clients/client.schema.json` +
updated `_template.json`. Placeholder house wordmark/favicon in `public/brand/`.

**Watch-out (not done on purpose).** Deploying this build replaces the live coming-soon page at the
apex (Vite publishes the app to `dist/`). Hold the deploy until the portal is ready (Phase 4), or
keep a coming-soon route — decide before next `git push` + Netlify build.

**Unblocks.** Phase 2 remainder (full B4 component catalogue) and Phase 3 (auth/tenant routing).

---

## 2026-06-05 — PHASE 1 COMPLETE — URL live over HTTPS, wildcard working

**Status.** Phase 1 (Domain & hosting, Option C) DoD met. Verified externally:
- `https://cheeseshoptech.com` → 200, serves coming-soon page.
- `https://www.cheeseshoptech.com` → 301 redirect (healthy).
- `https://montitrentini.cheeseshoptech.com` (wildcard test) → resolves over HTTPS, 404 (expected — no tenant app yet; Phase 4). Confirms zero-per-client-DNS routing works.

**Setup.** Coming-soon deployed to Netlify at `cheeseshoptech.netlify.app`. Three proxied CNAMEs
in Cloudflare (`@`, `www`, `*`) → `cheeseshoptech.netlify.app`. TXT google-site-verification retained.

**Open hardening item.** Confirm Cloudflare SSL/TLS mode = Full (strict) and (optional) upload
Origin Certificate. Site serves fine on Universal SSL edge cert today; Full (strict) is the
chosen secure config.

**Gotchas hit (logged so we never repeat them).**
1. Adding the domain in Netlify dumps you on an "Activate Netlify DNS / update nameservers"
   screen offering `dns#.p08.nsone.net`. That is Option B — do NOT use it; click Done and ignore.
   It nearly got pasted into the CNAME targets.
2. CNAME target is the `*.netlify.app` site address (`cheeseshoptech.netlify.app`), NOT a
   nameserver. Watch spelling: n-e-t-l-i-f-y dot app.
3. Deploy the Netlify site BEFORE wiring DNS (the CNAME target doesn't exist until then).

**Unblocks.** Phase 2 — Design system & white-label shell.

---

## 2026-06-05 — PHASE 0 COMPLETE — repo pushed to GitHub

**Status.** Phase 0 DoD passed. Repo `cheeseshoptech-platform` is live and **private** at
github.com/cheeseshop-tech; `main` pushed and tracking `origin/main` (commits `491792c` scaffold
+ `885b371` build-log). `.env` gitignored and absent from history — verified.

**Accounts.** Cloudflare, Netlify, GitHub, Cloudinary, Make.com, HubSpot — all set up.
**Netlify plan tier = PRO** — unlocks automatic wildcard preview subdomains (OM §5) for per-client UAT previews.

**Note.** GitHub normalizes the org to `Cheeseshop-tech` (capital C); the lowercase remote redirects
fine but prints a "repository moved" notice each push. Optional: repoint remote to the capitalized URL.

**Unblocks.** Phase 1 — Domain & hosting (Option C: Cloudflare wildcard + proxy → Netlify).

---

## 2026-06-05 — Project repository & docs scaffolded

**Action.** Created the `cheeseshoptech-platform` project folder with:

- `/docs` — Cowork Brief (v1.1), this Build Log, and the Operations Manual
- `/config/clients` — per-client JSON config (`montitrentini.json` + `_template.json`)
- `/public/coming-soon` — deployable placeholder page to claim the URL
- `/src` — React shell, components, and the per-client config loader

**Why.** The brief calls for all docs to be versioned in GitHub alongside the codebase.
Single repo, single source of truth.

**Unblocks.** Architecture is now documented; coding can begin against a known structure.

---

## 2026-06-05 — Client exit model + pricing structure added

**Action.** Added Operations Manual **§12 — Client Exit & Ownership Transfer (Buyout)** and a
new doc **`PRICING_AND_ENGAGEMENT_MODEL.md`**.

**Model.** Three revenue moments + clean exit: **Build** (one-time, tiered) → **Operate**
(monthly retainer + per-task menu) → **Buyout** (one-time exit, single-tenant fork only).

**Buyout pricing principle.** `buyout = migration labor + (N months × monthly operate fee)`,
N ≈ 12–24, so a buyout compensates lost recurring revenue and isn't a way to dodge the monthly.

**Strategic note.** A documented exit path is a **sales asset** (removes lock-in fear) AND a
revenue event. Reinforces the IP boundary: clients get a single-tenant fork, never the
CheeseShop TECH platform core.

**Next.** Set real numbers + buyout multiplier N in the new Project; brief legal on MSA + SOW
+ exit terms in the original contract.

---

## 2026-06-05 — Design Guide starter created (consult stage)

**Action.** Added `DESIGN_GUIDE_STARTER.md` — outline + decision prompts for the Best
Practices / Design Guide. Centers on a **white-label design-token system**: shared React
shell rendered from tokens, each client overriding only an approved subset (color, logo,
fonts, radius) with safe fallbacks to house defaults.

**Why.** Differentiation must come from **config + content, not bespoke code/layouts** —
this is the lever that lets onboarding scale to 10–20 clients without design debt.

**Next.** Develop in the new Project. Kickoff order: house brand → token set + config schema
→ component catalogue → photography/content → QA bar (wired into onboarding UAT).

---

## 2026-06-05 — DECISION: Domain & hosting = Option C (Cloudflare wildcard + proxy)

**Decision.** Run `cheeseshoptech.com` as: **Cloudflare** (registrar + DNS + proxy) →
**Netlify** (host), using a single **proxied wildcard** `*.cheeseshoptech.com` and a
**Cloudflare Origin Certificate** uploaded to Netlify, with SSL/TLS mode **Full (strict)**.

**Options considered.**

- **A — Cloudflare DNS, basic:** rejected. Requires a manual per-subdomain cert on every client onboarding.
- **B — Delegate DNS to Netlify:** rejected. Auto wildcard cert, but surrenders Cloudflare proxy/WAF/DDoS/analytics.
- **C — Cloudflare wildcard + proxy:** **selected.** One wildcard covers all clients (no per-client work) AND keeps the full Cloudflare stack.
- **C+ — Cloudflare for SaaS:** deferred to parking lot; revisit when a client wants their own vanity domain.

**Why.** Best of both: zero per-client cert/DNS steps + retained edge security. Standard
pattern for multi-tenant subdomain platforms.

**Constraints captured.**

- Universal SSL free wildcard is **one level deep** → keep subdomains flat (`client.cheeseshoptech.com`).
- Use a **Cloudflare Origin Cert** (long-lived) to avoid Let's-Encrypt-ACME-behind-proxy renewal failures.

**Unblocks.** URL can be claimed today by deploying the coming-soon page and pointing the
wildcard. Per-client subdomains then require no DNS work.

**Reference.** Wiring steps → Operations Manual §2.

---

## 2026-06-05 — FINDING: Netlify Identity is staying (auth choice safe)

**Finding.** Netlify **reversed** the planned deprecation of Netlify Identity on
**Feb 19, 2026**. It remains a supported authentication option — no migration required.

**Impact.** v1 plan to use Netlify Identity for per-client portal login is **confirmed safe**.
Auth0 remains an option later for enterprise clients but is not needed for v1.

**Source.** Netlify Support — "Netlify Identity is staying (Feb 2026 reversal)."

---

## 2026-06-05 — Strategic direction confirmed: multi-tenant platform (not one-off)

**Decision.** Build a **multi-tenant client portal**, not a single Monti Trentini site.
CheeseShop TECH owns/operates the infra; each client gets isolated content, data, and
branding on a shared codebase. Monti Trentini is the **pilot** — every decision must also
serve client #2 and #3.

**Stack locked (v1):** Netlify (host) · GitHub (single repo + per-client JSON config) ·
Cloudinary (per-client media folders) · Netlify Identity (auth) · React (frontend) ·
Make (CRM middleware v1) → Merge.dev/Unified.to (CRM v2).

**Sequencing discipline.** Ship first, iterate after. Strict definition-of-done per phase
before adding new workstreams.

---

## Open items / next actions

- [ ] Deploy `coming-soon` page to Netlify and wire Option C (claim the URL)
- [ ] Confirm Netlify plan tier (affects automatic deploy-subdomain wildcards)
- [ ] Lock Platform Architecture document v1 (Agenda item 1)
- [ ] Scope Client Onboarding Playbook — definition of done (Agenda item 2)
- [ ] Formalize Best Practices Manual from existing work (Agenda item 3)
- [ ] Scope Build & Maintenance Manual + ownership (Agenda item 4)
- [ ] Set up Cloudinary account + per-client folder convention
- [ ] Build Make scenario: HubSpot + Monti Trentini CRM → dashboard
