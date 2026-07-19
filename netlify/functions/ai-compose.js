// Netlify Function: Stage 2 of the Studio Director (CONTENT_ENGINE_WIRING_SPEC.md §3,
// AI_TOOL_EMBED_SPEC.md, AGENT_A1_BUILD_SPEC.md Part C). Takes the Stage 0/1 deterministic
// draft (from src/lib/studio-director.js's directDraft(), as edited so far in the Studio) +
// kit voice rules + the opportunity, and asks Claude to make it eloquent: rewritten copy per
// text slot (in brand voice), an optional slide-order suggestion, and an optional image
// re-pick — but ONLY from the real candidate ids Stage 0/1 already scored (`slots.__candidates`,
// see studio-director.js). Same secret-safe server-side shape as the Cloudinary functions:
// browser → this function (holds ANTHROPIC_API_KEY) → Claude API → JSON back to the UI.
//
// Hard rules (enforced server-side below, not just prompted — never trust the model alone):
//   - No image generation, ever. An image edit is accepted ONLY if it's a member of that
//     slot's `__candidates` list. Anything else (a new id, a hallucinated id) is silently
//     dropped and the deterministic pick stands.
//   - Copy only. `contact` (deliberately blanked per-tenant, see studio-director.js) and any
//     `__`/`$`-prefixed key (metadata / brand-token locks) are never accepted from the model,
//     even if it tries.
//   - No pricing/fact invention — the prompt tells Claude to rewrite tone/phrasing only, never
//     add numbers, claims, or product facts not already present in the brief.
//
// Guardrails against runaway cost (the real risk per AI_TOOL_EMBED_SPEC — composing is cents,
// an ungated loop isn't): deck/slide/text size caps below, a hard max_tokens on the Claude
// call, and Rick's $25/mo spend cap set at the Anthropic account level (2026-07-19,
// AGENT_A1_BUILD_SPEC.md Part C). A per-session/day call counter is the natural v2 guardrail —
// deferred; not needed at solo-operator volume.

import { requireReadAuth, jsonUnauthorized } from "./_write-guard.js";
import { logWrite } from "./_write-log.js";

const MAX_SLIDES = 20;
const MAX_BRIEF_CHARS = 24_000; // rough token-cost guard on the outbound prompt
const MAX_TEXT_LEN = 2000;
const MAX_HEADLINE_LEN = 300;

const IMAGE_KEY = /image/i;
const IMG_N_KEY = /^img\d*$/i;

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Bad JSON" }); }

  // Any unlocked portal tier may run a compose pass (mirrors listAssets()/media-list.js —
  // this doesn't write anything to Cloudinary; "Save to Library" is a separate, later action).
  const tenant = (body.tenant || "").toString().replace(/[^a-z0-9-]/gi, "");
  const auth = requireReadAuth(event, tenant);
  if (!auth.ok) {
    await logWrite(event, { fn: "ai-compose", ok: false, status: auth.status });
    return jsonUnauthorized(auth);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json(500, { error: "ANTHROPIC_API_KEY not configured" });

  const deck = Array.isArray(body.deck) ? body.deck : null;
  if (!deck || !deck.length) return json(400, { error: "Missing deck" });
  if (deck.length > MAX_SLIDES) return json(400, { error: `Deck too large (max ${MAX_SLIDES} slides)` });

  const brief = deck.map((sl, i) => briefSlide(sl, i));
  const briefJson = JSON.stringify(brief);
  if (briefJson.length > MAX_BRIEF_CHARS) return json(413, { error: "Deck too large for an AI pass — trim slides first" });

  const voice = sanitizeVoice(body.voice);
  const opportunity = sanitizeOpportunity(body.opportunity);
  const brandName = clean(body.brandName, 120);

  const userContent = [
    `Brand: ${brandName || "(unnamed)"}`,
    `Voice rules: ${JSON.stringify(voice)}`,
    opportunity ? `Opportunity seed: ${JSON.stringify(opportunity)}` : null,
    `Current deck (0-based index, template id, editable text, and image slots with their allowed candidate ids):`,
    briefJson,
  ].filter(Boolean).join("\n\n");

  // Pinned default; override via the ANTHROPIC_MODEL Netlify env var (no code change/redeploy
  // needed) if this snapshot is ever retired — check platform.claude.com/docs for the current
  // list before changing this. Fixed 2026-07-19: the original default
  // (claude-3-5-sonnet-20241022) 404'd — that snapshot is no longer available on Rick's account.
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  let data;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        temperature: 0.5,
        system: SYSTEM_PROMPT,
        tools: [RETURN_TOOL],
        tool_choice: { type: "tool", name: "return_compose" },
        messages: [{ role: "user", content: userContent }],
      }),
    });
    data = await res.json().catch(() => ({}));
    if (!res.ok) {
      await logWrite(event, { fn: "ai-compose", ok: false, status: res.status, role: auth.role, tenant: tenant || null });
      return json(res.status === 401 || res.status === 403 ? 502 : res.status, { error: "Claude API error", detail: data });
    }
  } catch (err) {
    await logWrite(event, { fn: "ai-compose", ok: false, status: 502, role: auth.role, tenant: tenant || null });
    return json(502, { error: String(err?.message || err) });
  } finally {
    clearTimeout(timeout);
  }

  const toolBlock = (data.content || []).find((b) => b.type === "tool_use" && b.name === "return_compose");
  if (!toolBlock || !toolBlock.input) {
    return json(502, { error: "Claude did not return a compose result" });
  }

  const merged = mergeDeck(deck, toolBlock.input);
  await logWrite(event, {
    fn: "ai-compose", ok: true, status: 200, role: auth.role,
    action: `ai-polish ${merged.appliedSlides} slide(s), ${merged.appliedFields} field(s)`,
    tenant: tenant || null,
  });

  return json(200, {
    ok: true,
    deck: merged.deck,
    order: merged.order,
    notes: merged.notes,
    appliedSlides: merged.appliedSlides,
    appliedFields: merged.appliedFields,
  });
};

// ---------------------------------------------------------------------------------------------
// Briefing: reduce a slide's slots to only what Claude is allowed to touch. Anything not
// classified below (an unrecognized shape, __-meta, $-tokens, contact) never leaves this
// function — Claude never even sees it, let alone edits it.
function slotKind(key, value) {
  if (!key || key === "contact" || key.startsWith("__") || key.startsWith("$")) return null;
  if (IMAGE_KEY.test(key) || IMG_N_KEY.test(key)) return "image";
  if (typeof value === "string") return "text";
  if (value && typeof value === "object" && (typeof value.headline === "string" || typeof value.narrative === "string")) return "story";
  return null;
}

function briefSlide(sl, i) {
  const slots = sl?.slots || {};
  const cand = slots.__candidates || {};
  const text = {};
  const images = {};
  for (const [k, v] of Object.entries(slots)) {
    const kind = slotKind(k, v);
    if (kind === "text") text[k] = v;
    else if (kind === "story") text[k] = { headline: v.headline || "", narrative: v.narrative || "" };
    else if (kind === "image") {
      const list = Array.isArray(cand[k]) ? cand[k] : (v ? [v] : []);
      images[k] = { current: v || null, candidates: list };
    }
  }
  return { index: i, template: sl?.t || "", text, images };
}

function sanitizeVoice(v) {
  if (!v || typeof v !== "object") return {};
  const pick = (k, max = 400) => (typeof v[k] === "string" ? v[k].slice(0, max) : undefined);
  const pickList = (k, max = 12) => (Array.isArray(v[k]) ? v[k].filter((x) => typeof x === "string").slice(0, max) : undefined);
  return clean_undefined({
    positioningHook: pick("positioningHook"),
    motto: pick("motto", 200),
    mantra: pick("mantra", 200),
    heritage: pick("heritage", 200),
    mission: pick("mission"),
    coreValues: pickList("coreValues"),
    attributes: pickList("attributes"),
    avoid: pickList("avoid"),
    readyPhrases: pickList("readyPhrases", 20),
  });
}

function sanitizeOpportunity(o) {
  if (!o || typeof o !== "object") return null;
  const out = clean_undefined({
    headline: typeof o.headline === "string" ? o.headline.slice(0, 200) : undefined,
    intro: typeof o.intro === "string" ? o.intro.slice(0, 400) : undefined,
    audience: typeof o.audience === "string" ? o.audience.slice(0, 60) : undefined,
    who: typeof o.who === "string" ? o.who.slice(0, 200) : undefined,
  });
  return Object.keys(out).length ? out : null;
}

function clean_undefined(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out;
}

function clean(s, max) {
  return typeof s === "string" ? s.slice(0, max) : "";
}

// ---------------------------------------------------------------------------------------------
// Merge: apply Claude's proposed edits back onto a fresh copy of the ORIGINAL deck, re-validating
// every field against the same rules the briefing enforced — never trust the tool-call input by
// itself (a compromised/odd model response should degrade to "no-op", not to "leaked contact
// field" or "invented image id").
function mergeDeck(deck, aiResult) {
  const result = deck.map((sl) => ({ t: sl?.t, slots: { ...(sl?.slots || {}) } }));
  const notes = typeof aiResult.notes === "string" ? aiResult.notes.slice(0, 500) : "";
  let appliedSlides = 0, appliedFields = 0;

  for (const edit of Array.isArray(aiResult.slides) ? aiResult.slides : []) {
    const i = edit?.index;
    if (!Number.isInteger(i) || i < 0 || i >= deck.length) continue;
    const original = deck[i]?.slots || {};
    const target = result[i].slots;
    let touched = false;

    for (const [k, v] of Object.entries(edit?.text || {})) {
      const kind = slotKind(k, original[k]);
      if (kind === "text" && typeof v === "string") {
        target[k] = v.slice(0, MAX_TEXT_LEN);
        touched = true; appliedFields++;
      } else if (kind === "story" && v && typeof v === "object") {
        target[k] = {
          headline: typeof v.headline === "string" ? v.headline.slice(0, MAX_HEADLINE_LEN) : (original[k]?.headline || ""),
          narrative: typeof v.narrative === "string" ? v.narrative.slice(0, MAX_TEXT_LEN) : (original[k]?.narrative || ""),
        };
        touched = true; appliedFields++;
      }
      // any other kind (image-shaped key, __/$-meta, contact, unrecognized) — silently dropped
    }

    for (const [k, v] of Object.entries(edit?.image || {})) {
      const list = (original.__candidates || {})[k];
      if (Array.isArray(list) && typeof v === "string" && list.includes(v)) {
        target[k] = v;
        touched = true; appliedFields++;
      }
      // not in the deterministic pass's own candidate list → dropped, never a new/invented id
    }

    if (touched) appliedSlides++;
  }

  let order = null;
  if (Array.isArray(aiResult.order) && aiResult.order.length === deck.length) {
    const seen = new Set(aiResult.order);
    const valid = seen.size === deck.length && aiResult.order.every((n) => Number.isInteger(n) && n >= 0 && n < deck.length);
    if (valid) order = aiResult.order.slice();
  }

  return { deck: result, order, notes, appliedSlides, appliedFields };
}

// ---------------------------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are the copy-polish pass inside CheeseShop TECH's Content Studio, a
tool that composes marketing decks for specialty food brands from their own brand kit and real
product photography. A deterministic pass already filled every slide with real copy and real
photo ids — your job is to make the COPY more eloquent and on-brand, not to invent content.

Hard rules — follow exactly, no exceptions:
1. Never invent a fact, price, claim, or product detail that isn't already present in the brief.
   You are tightening tone and phrasing, not writing new claims.
2. For image slots, you may ONLY return a publicId that already appears in that slot's own
   "candidates" list. If you don't want to change an image, omit it entirely — do not repeat the
   current id back. Never return an id that isn't in the candidates list for that exact slot.
3. Never touch a slot that isn't listed under "text" or "images" for a slide — anything else
   (metadata, contact info, brand tokens) is out of scope and isn't shown to you for a reason.
4. Match the brand's voice rules: use the given attributes, avoid the given "avoid" words/tones,
   and prefer the brand's own ready phrases where they fit naturally.
5. Keep each field roughly the same length category as the original (a one-line headline stays
   one line; a short caption stays short) unless tightening it shorter improves it.
6. Only include a slide in your "slides" output if you're actually changing something on it.
7. The "order" field is optional — only include it if reordering genuinely improves the deck's
   narrative flow (e.g. cover → story → range → CTA); omit it to keep the current order.
8. Always call the return_compose tool with your result. Do not respond in plain text.`;

const RETURN_TOOL = {
  name: "return_compose",
  description: "Return the AI polish pass: rewritten copy per slide, an optional slide-order suggestion, and optional image re-picks (candidates only).",
  input_schema: {
    type: "object",
    properties: {
      order: {
        type: "array",
        items: { type: "integer" },
        description: "Optional: a full permutation of the original 0-based slide indices representing a better order. Omit if the current order is already good.",
      },
      slides: {
        type: "array",
        description: "Only the slides you're changing.",
        items: {
          type: "object",
          properties: {
            index: { type: "integer", description: "The original 0-based slide index this applies to." },
            text: {
              type: "object",
              description: "Slot id → new value. Plain text slots take a string; story slots take {headline, narrative}. Only include slots you're changing.",
              additionalProperties: true,
            },
            image: {
              type: "object",
              description: "Slot id → chosen publicId, which MUST be a member of that slot's provided candidates array. Omit a slot to leave its image unchanged.",
              additionalProperties: { type: "string" },
            },
          },
          required: ["index"],
        },
      },
      notes: { type: "string", description: "One short sentence for the human reviewer on what you changed and why." },
    },
    required: ["slides"],
  },
};

function json(statusCode, body) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}
