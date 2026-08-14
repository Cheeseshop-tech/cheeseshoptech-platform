// Netlify Function: read a business card photo into structured contact fields (Booth to Meeting,
// BOOTH_TO_MEETING_HANDOFF.md §5a step 1 / §8 item 1).
//
// Rick, 2026-08-07: "the whole hook is speed — I don't want to be typing in info." A rep typing
// at a table is a rep not talking, and the conversation is the thing that expires. So the camera
// replaces the keyboard: photo in, fields out, matched against the CRM before the buyer walks.
//
// Same secret-safe shape as ai-compose.js: browser → this function (holds ANTHROPIC_API_KEY) →
// Claude API → JSON back. The key never reaches the tablet.
//
// HARD RULES, enforced here rather than only prompted (same posture as ai-compose.js — never
// trust the model alone):
//   · TRANSCRIPTION ONLY. Every returned field must be text visibly printed on the card. The
//     model is told never to infer, complete, or correct — a guessed email address is worse than
//     a blank one, because the rep will send to it.
//   · Nothing is auto-committed. The parsed fields land in an editable sheet the rep confirms.
//   · No CRM lookup here. Matching happens client-side against the already-cached account book,
//     so it still works at a booth with no signal (see src/lib/booth.js matchCard()).
//
// COST (the real risk per AI_TOOL_EMBED_SPEC, against Rick's $25/mo account cap): images are
// downscaled to ~1400px client-side before upload, hard-capped below, max_tokens is small, and
// one call = one card. A show is dozens of cards, not thousands.

import { requireReadAuth, jsonUnauthorized } from "./_write-guard.js";
import { withMonitoring } from "./_sentry.js";

// ~1.5MB of base64 ≈ a 1400px JPEG at q0.75 with generous headroom. Anthropic's own per-image
// ceiling is higher; this cap exists to stop an un-downscaled 12MP phone photo becoming a
// surprise bill, and to fail fast rather than time out on booth wifi.
const MAX_IMAGE_B64 = 1_500_000;
const ALLOWED_MEDIA = new Set(["image/jpeg", "image/png", "image/webp"]);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  // `Authorization` must be listed or the browser's preflight fails and the fetch THROWS —
  // which surfaces as a network error, not a 401, and sends you hunting for a connection problem
  // that doesn't exist. Added when the Identity bearer token started being sent.
  "Access-Control-Allow-Headers": "Content-Type, x-portal-passcode, Authorization",
};
const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS },
  body: JSON.stringify(body),
});

const SYSTEM_PROMPT = `You transcribe business cards for a food-sales rep at a trade show.

Return ONLY what is actually printed on the card. This is transcription, not interpretation.

Rules:
- Never guess, infer, complete, or correct a value. If a field is not legible or not present, leave it empty.
- Never construct an email address from a name and a company domain. Only return an email that is printed in full.
- Keep the company name as printed, minus legal suffixes (Inc, LLC, Corp, S.p.A.) unless the suffix is clearly part of how the brand is written.
- Phone: return digits and separators as printed. If the card shows a main line and an extension, put the main line in "phone" and the extension digits alone in "phoneExt".
- If the card shows several phone numbers, prefer a direct/mobile line for "phone" and put the switchboard in "officePhone".
- "title" is the job title only, not the company.
- Set "legible" to false when the photo is too blurred, dark, or cropped to read with confidence — a rep would rather retake it than chase a wrong address.`;

const RETURN_TOOL = {
  name: "return_card",
  description: "Return the fields transcribed from the business card.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Person's full name exactly as printed, or empty." },
      title: { type: "string", description: "Job title only, or empty." },
      company: { type: "string", description: "Company name as printed, or empty." },
      email: { type: "string", description: "Full email address printed on the card, or empty. Never constructed." },
      phone: { type: "string", description: "Direct or mobile line as printed, or empty." },
      officePhone: { type: "string", description: "Main/switchboard line as printed, or empty." },
      phoneExt: { type: "string", description: "Extension digits only, or empty." },
      website: { type: "string", description: "Website or domain as printed, or empty." },
      legible: { type: "boolean", description: "False when the image is too poor to transcribe confidently." },
      notes: { type: "string", description: "Anything else printed that a rep would want (e.g. 'Northeast region'), or empty." },
    },
    required: ["name", "title", "company", "email", "phone", "officePhone", "phoneExt", "website", "legible", "notes"],
  },
};

const str = (v, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function rawHandler(event, context) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return json(405, { error: "POST only" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Invalid JSON" }); }

  // TWO ACCEPTED CREDENTIALS, because the app has two auth systems.
  //
  // Everything server-side in this codebase guards on the portal PASSCODE, but the portal itself
  // signs users in with NETLIFY IDENTITY. A logged-in rep therefore held no passcode to send, so
  // every scan 401'd and the UI reported it as "couldn't reach the card reader" — the bug that
  // made card scanning look broken while the API was working fine.
  //
  // `context.clientContext.user` is populated by Netlify itself when the request carries a valid
  // Identity JWT in `Authorization: Bearer …`. Netlify verifies the signature; we never see the
  // secret and can't get it wrong. Being signed in to the portal is exactly the bar this endpoint
  // needs — it reads a photo the user just took and spends about a cent.
  const identityUser = context?.clientContext?.user || null;
  if (!identityUser) {
    const auth = requireReadAuth(event, body.tenant || "");
    if (!auth.ok) return jsonUnauthorized(auth);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json(500, { error: "ANTHROPIC_API_KEY not configured" });

  const mediaType = ALLOWED_MEDIA.has(body.mediaType) ? body.mediaType : "image/jpeg";
  // Accept a bare base64 payload or a full data: URI, whichever the client sends.
  const b64 = String(body.image || "").replace(/^data:[^;]+;base64,/, "");
  if (!b64) return json(400, { error: "No image supplied" });
  if (b64.length > MAX_IMAGE_B64) {
    return json(413, { error: "Image too large — downscale before upload (the app does this client-side)." });
  }

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
        // Same env override + default as ai-compose.js, so the whole app moves models together.
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        tools: [RETURN_TOOL],
        tool_choice: { type: "tool", name: "return_card" },
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: b64 } },
            { type: "text", text: "Transcribe this business card. Leave anything you cannot read clearly as an empty string." },
          ],
        }],
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return json(502, { error: `Claude API ${res.status}`, detail: detail.slice(0, 500) });
    }
    data = await res.json();
  } catch (err) {
    // AbortError on a slow booth connection is the expected failure, not an exception worth
    // surfacing raw — the client queues the scan and retries when the signal is better.
    const aborted = err?.name === "AbortError";
    return json(aborted ? 504 : 502, { error: aborted ? "Card read timed out" : String(err?.message || err) });
  } finally {
    clearTimeout(timeout);
  }

  const block = (data?.content || []).find((c) => c.type === "tool_use" && c.name === "return_card");
  if (!block?.input) return json(502, { error: "No card data returned" });
  const r = block.input;

  // Re-clamp every field server-side — the model's echo is never trusted to be well-formed.
  return json(200, {
    card: {
      name: str(r.name, 120),
      title: str(r.title, 120),
      company: str(r.company, 160),
      // An email that doesn't look like one is dropped rather than passed to the rep to send to.
      email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(str(r.email, 160)) ? str(r.email, 160).toLowerCase() : "",
      phone: str(r.phone, 40),
      officePhone: str(r.officePhone, 40),
      phoneExt: str(r.phoneExt, 12).replace(/[^\d]/g, ""),
      website: str(r.website, 160),
      legible: r.legible !== false,
      notes: str(r.notes, 400),
    },
  });
}

export const handler = withMonitoring("card-ocr", rawHandler);
