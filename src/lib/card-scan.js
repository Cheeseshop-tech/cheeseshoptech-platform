// Business-card capture for Booth to Meeting (Rick, 2026-08-07: "the whole hook is speed — I
// don't want to be typing in info. I want to take a photo of the business card and auto load and
// search the database to determine new or existing").
//
// The shape of the problem, and why this file looks the way it does:
//
//   1. The CAMERA is the input, not the keyboard. A plain <input type="file" capture> opens the
//      native camera on iPadOS/Android — no getUserMedia permission dance, no video element, no
//      custom shutter. Fewer moving parts is the point when the rep has ten seconds.
//   2. OCR NEEDS NETWORK. The booth may not have any. So the photo is persisted FIRST and the
//      read is queued — the rep never waits on a request, and a scan taken in a dead room is
//      still a scan. This is the same write-local-first posture as the rest of the tool.
//   3. PHOTOS DON'T FIT IN localStorage. A compressed card is ~120-200KB and localStorage is a
//      ~5MB budget shared with the account book; thirty cards would blow it and take the day's
//      captures down with them. Images therefore live in IndexedDB, which is quota-generous and
//      asynchronous, while the small stuff stays in localStorage where it's synchronous and
//      simple to reason about.
//
// The image is downscaled before it ever leaves the device: a card is legible to a vision model
// at ~1400px on the long edge, and shipping a 12MP original over booth wifi would be slow and
// needlessly expensive against the account's spend cap.

import { writeAuthHeader } from "./auth-context.jsx";

const DB_NAME = "cst-booth-cards";
const STORE = "cards";
const DB_VERSION = 1;

// Long-edge target. Big enough that 6pt small print on a card still resolves; small enough that
// a scan uploads in a second on bad wifi.
const MAX_EDGE = 1400;
const JPEG_QUALITY = 0.75;

// ---- IndexedDB (images only) --------------------------------------------------------------

function openDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) return reject(new Error("IndexedDB unavailable"));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(mode, fn) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.onerror = () => reject(tx.error);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

/** Persist a card image against its capture id. Resolves false rather than throwing — a failed
 *  image write must never take down the capture it belongs to. */
export async function putCardImage(captureId, dataUrl) {
  try { await withStore("readwrite", (s) => s.put(dataUrl, captureId)); return true; }
  catch { return false; }
}

export async function getCardImage(captureId) {
  try { return (await withStore("readonly", (s) => s.get(captureId))) || null; }
  catch { return null; }
}

export async function deleteCardImage(captureId) {
  try { await withStore("readwrite", (s) => s.delete(captureId)); return true; }
  catch { return false; }
}

/** Ids of every stored card image — used to sweep images whose captures were discarded. */
export async function listCardImageIds() {
  try { return (await withStore("readonly", (s) => s.getAllKeys())) || []; }
  catch { return []; }
}

// ---- Capture + compress -------------------------------------------------------------------

// ---- Auto-crop -------------------------------------------------------------------------------
//
// A webcam frame is mostly desk. Cropping to the card before downscaling does two things at once:
// it removes background the model would otherwise have to reason past, and it spends the whole
// 1400px budget on the card instead of the room — so the small print gets meaningfully sharper.
//
// The method is an EDGE-ENERGY PROJECTION, not document-scanner perspective correction. A card
// is dense with ink; a desk is flat. Compute per-pixel gradient, sum it along rows and along
// columns, and the card is the band where that sum stays high. Cheap (runs on a 320px thumbnail),
// no dependencies, and it degrades safely.
//
// It is deliberately conservative: any implausible result — too small, too thin, a crop that ate
// most of the frame — is DISCARDED in favour of the full frame. A bad auto-crop that slices off
// the email line is far worse than no crop at all, so the failure mode is "did nothing".

const CROP_WORK_W = 320;      // analysis thumbnail width — enough signal, trivial cost
const CROP_ENERGY_FLOOR = 0.12; // fraction of peak row/col energy that still counts as "card"
const CROP_PAD = 0.02;        // keep a 2% margin so we never shave a glyph

/** Bounding box of the busiest region, in 0..1 fractions of the source. Null when unconvincing. */
function detectCardBox(img) {
  const w = CROP_WORK_W;
  const h = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * w));
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);

  let data;
  try { data = ctx.getImageData(0, 0, w, h).data; }
  catch { return null; } // tainted canvas (cross-origin) — skip cropping rather than throw
  // Luminance plane.
  const lum = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    lum[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  // Gradient magnitude, accumulated per row and per column.
  const rowE = new Float32Array(h), colE = new Float32Array(w);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const e = Math.abs(lum[p + 1] - lum[p - 1]) + Math.abs(lum[p + w] - lum[p - w]);
      rowE[y] += e; colE[x] += e;
    }
  }
  const span = (arr) => {
    let peak = 0;
    for (const v of arr) if (v > peak) peak = v;
    if (peak <= 0) return null;
    const floor = peak * CROP_ENERGY_FLOOR;
    let a = 0, b = arr.length - 1;
    while (a < arr.length && arr[a] < floor) a++;
    while (b > a && arr[b] < floor) b--;
    return b > a ? [a / arr.length, (b + 1) / arr.length] : null;
  };
  const ys = span(rowE), xs = span(colE);
  if (!ys || !xs) return null;

  const [x0, x1] = xs, [y0, y1] = ys;
  const bw = x1 - x0, bh = y1 - y0;
  // Sanity gates — reject anything that doesn't look like a card sitting in a frame.
  if (bw < 0.25 || bh < 0.15) return null;        // too small to be the subject
  if (bw > 0.97 && bh > 0.97) return null;        // found the whole frame: nothing gained
  const aspect = bw / bh;
  if (aspect < 0.5 || aspect > 4.5) return null;  // a card is ~1.75:1; allow rotation and slack
  return {
    x: Math.max(0, x0 - CROP_PAD),
    y: Math.max(0, y0 - CROP_PAD),
    w: Math.min(1, bw + CROP_PAD * 2),
    h: Math.min(1, bh + CROP_PAD * 2),
  };
}

/** Downscale and re-encode a camera file to a JPEG data URI, cropping to the card first when one
 *  can be found confidently. Returns { dataUrl, width, height, bytes, cropped }. Runs entirely
 *  on-device — the original never leaves. */
export function compressCardImage(file, { maxEdge = MAX_EDGE, quality = JPEG_QUALITY, autoCrop = true } = {}) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);

      const box = autoCrop ? detectCardBox(img) : null;
      const sx = box ? Math.round(box.x * img.naturalWidth) : 0;
      const sy = box ? Math.round(box.y * img.naturalHeight) : 0;
      const sw = box ? Math.round(box.w * img.naturalWidth) : img.naturalWidth;
      const sh = box ? Math.round(box.h * img.naturalHeight) : img.naturalHeight;

      const scale = Math.min(1, maxEdge / Math.max(sw, sh));
      const w = Math.max(1, Math.round(sw * scale));
      const h = Math.max(1, Math.round(sh * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      // White underlay: a card photographed against a dark table encodes better as JPEG with a
      // known background than with whatever the alpha channel would otherwise become.
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve({ dataUrl, width: w, height: h, bytes: Math.round((dataUrl.length - 23) * 0.75), cropped: !!box });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read that photo")); };
    img.src = url;
  });
}

// ---- Live webcam capture (desktop) ----------------------------------------------------------
//
// The `<input capture="environment">` path above is the right one on a tablet — it opens the OS
// camera, which is faster and better-exposed than anything we'd build. But `capture` is IGNORED
// on desktop browsers: on a Mac the same button just opens a file picker, which is a poor answer
// to a button labelled "Scan a card". This is the desktop path — a live preview and a shutter —
// and it hands off to exactly the same compress → persist → read pipeline.

/** Open the default camera. Resolves a MediaStream, or rejects with a human-readable reason.
 *  `facingMode` is a soft preference (`ideal`), not a requirement — a laptop has no environment
 *  camera and a hard constraint would fail outright there. */
export async function openCamera(deviceId) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser can't open a camera. Use the file picker instead.");
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        // An explicit device wins; otherwise prefer a rear camera on mobile and accept whatever
        // the desktop's default is. `exact` on the id is right — if the chosen camera is gone,
        // failing loudly beats silently recording from a different one.
        ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: "environment" } }),
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    });
  } catch (err) {
    const name = err?.name || "";
    if (name === "NotAllowedError") throw new Error("Camera access was blocked. Allow it in the browser's address bar, then try again.");
    if (name === "NotFoundError") throw new Error("No camera found on this device.");
    if (name === "NotReadableError") throw new Error("The camera is already in use by another app.");
    throw new Error(err?.message || "Couldn't open the camera.");
  }
}

/** Cameras available to pick from — [{ deviceId, label }].
 *
 *  Only useful AFTER permission has been granted: before that, browsers return entries with empty
 *  labels (a privacy measure — an unpermitted page shouldn't learn you own a particular camera).
 *  So call this once the stream is live, not before. On a Mac this typically surfaces the built-in
 *  "FaceTime HD Camera" alongside an iPhone via Continuity Camera — and the iPhone is markedly
 *  better for small print, which is the whole job here. */
export async function listCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === "videoinput")
      .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` }));
  } catch {
    return [];
  }
}

/** Release the camera. MUST be called when the shutter UI closes — otherwise the recording light
 *  stays on and the device keeps the camera locked against every other app. */
export function closeCamera(stream) {
  for (const track of stream?.getTracks?.() || []) track.stop();
}

/** Grab the current video frame as a File, so it enters the identical path as a picked photo. */
export function grabFrame(videoEl) {
  const w = videoEl?.videoWidth, h = videoEl?.videoHeight;
  if (!w || !h) throw new Error("The camera hasn't warmed up yet — give it a second and try again.");
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d").drawImage(videoEl, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(new File([blob], "card.jpg", { type: "image/jpeg" })) : reject(new Error("Couldn't read that frame."))),
      "image/jpeg",
      0.92, // near-lossless here; compressCardImage does the real downscale next
    );
  });
}

// ---- OCR ------------------------------------------------------------------------------------

/** Send a compressed card to the server-side reader. Resolves { ok, card, status, error } and
 *  never throws — offline is the expected path here, not an exception. */
export async function readCard(dataUrl, { tenant = "" } = {}) {
  try {
    const res = await fetch("/.netlify/functions/card-ocr", {
      method: "POST",
      headers: { "content-type": "application/json", ...writeAuthHeader() },
      body: JSON.stringify({ tenant, image: dataUrl, mediaType: "image/jpeg" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, error: data?.error || `Read failed (${res.status})` };
    return { ok: true, status: 200, card: data.card };
  } catch (e) {
    return { ok: false, status: 0, error: String(e?.message || e) };
  }
}

// ---- Matching against the account book ------------------------------------------------------
//
// Runs entirely against the CACHED book, so "new or existing?" is answered at the table with no
// signal — the question a rep actually needs answered in the moment.

const normCompany = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const domainOf = (v) => String(v || "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];

const FREEMAIL = new Set(["gmail.com", "yahoo.com", "hotmail.com", "aol.com", "outlook.com", "icloud.com", "me.com", "msn.com", "live.com", "comcast.net", "verizon.net", "sbcglobal.net", "att.net", "earthlink.net", "protonmail.com", "ymail.com"]);

/**
 * Decide what this card is, against the cached CRM.
 *
 * Returns { verdict, contact, account, why } where verdict is one of:
 *   "existing-contact"  — this person is already in the CRM (email match, or name at a known account)
 *   "new-at-known"      — we know the company, but not this person: the expand case
 *   "new"               — neither is on file
 *
 * Ordered strongest-key-first. Email is exact and unambiguous; a name match is only trusted
 * INSIDE an already-identified account, because "John Smith" alone is not an identity.
 */
export function matchCard(card, { people = [], companies = [] } = {}) {
  const email = String(card?.email || "").toLowerCase().trim();
  const cardDomain = email.includes("@") ? email.split("@")[1] : domainOf(card?.website);
  const usableDomain = cardDomain && !FREEMAIL.has(cardDomain) ? cardDomain : "";

  // 1. Exact email — the only key that identifies a person on its own.
  if (email) {
    const hit = people.find((p) => String(p.email || "").toLowerCase() === email);
    if (hit) {
      return {
        verdict: "existing-contact",
        contact: hit,
        account: findAccount(hit.company, usableDomain, companies),
        why: "Matched on email address.",
      };
    }
  }

  // 2. Identify the ACCOUNT: company name first, then the card's email/web domain.
  const account = findAccount(card?.company, usableDomain, companies);

  // 3. Name match, but only within that identified account — never globally.
  if (account && card?.name) {
    const target = String(card.name).toLowerCase().replace(/\s+/g, " ").trim();
    const hit = people.find((p) => {
      if (String(p.name || "").toLowerCase().replace(/\s+/g, " ").trim() !== target) return false;
      const sameCompany = normCompany(p.company) && normCompany(p.company) === normCompany(account.name);
      const sameDomain = usableDomain && String(p.email || "").toLowerCase().endsWith(`@${usableDomain}`);
      return sameCompany || sameDomain;
    });
    if (hit) {
      return { verdict: "existing-contact", contact: hit, account, why: `Matched by name at ${account.name}.` };
    }
  }

  if (account) {
    return { verdict: "new-at-known", contact: null, account, why: `${account.name} is already an account — this is a new person there.` };
  }
  return { verdict: "new", contact: null, account: null, why: "No matching account or contact on file." };
}

function findAccount(companyName, domain, companies) {
  const key = normCompany(companyName);
  if (key) {
    const byName = companies.find((c) => normCompany(c.name) === key);
    if (byName) return byName;
    // A card printed "ACE Endico Corp" against a CRM row of "ACE Endico" (or vice versa) — one
    // containing the other is a strong enough signal once both are normalized, and materially
    // better than declaring a known distributor a brand-new account in front of the buyer.
    const loose = companies.find((c) => {
      const n = normCompany(c.name);
      return n && key && n.length > 3 && key.length > 3 && (n.includes(key) || key.includes(n));
    });
    if (loose) return loose;
  }
  if (domain) {
    const byDomain = companies.find((c) => domainOf(c.domain) === domain);
    if (byDomain) return byDomain;
  }
  return null;
}
