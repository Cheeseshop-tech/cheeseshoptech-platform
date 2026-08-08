import { useEffect, useMemo, useRef, useState } from "react";
import { getCrmData, regionOf, stateOf, crmIsSample } from "@/lib/crm.js";
import {
  FOLLOW_UP_TYPES, FOLLOW_UP_WINDOWS, TEMPERATURES, loadBooth, addCapture, updateCapture,
  removeCapture, newCapture, cacheAccounts, readCachedAccounts, boothStats, downloadIcs,
  recapMailto, buildRecap, buildInternalNote, buildShowDigest, prettyWhen, suggestTemperature,
  suggestedFollowUp, splitPushable, pushToHubspot, googleCalendarUrl, boothCatalog,
  searchCatalog, productSpec, activeDeals, nextStepText, indexContacts, contactsForCompany, cityOf,
  phoneText,
} from "@/lib/booth.js";
import { openCamera, closeCamera, grabFrame, listCameras } from "@/lib/card-scan.js";
import { compressCardImage, readCard, matchCard, putCardImage, deleteCardImage } from "@/lib/card-scan.js";

// Booth-to-Meeting (BOOTH_TO_MEETING_HANDOFF.md + Rick 2026-08-07).
//
// Two entry triggers, ONE capture sheet — §5's architectural note taken literally: Territory and
// Booth differ only in how a capture gets seeded.
//
// Every capture produces a TWO-SIDED note (Rick's framing): the buyer gets a recap carrying real
// product info and whatever was offered; the house gets the same interaction as a record for Rick
// and the rep, which is also the note that rides into HubSpot. Both are generated from one
// capture and share nextStepText(), so the two sides cannot drift apart.
//
// Sized for a tablet held at a 6-foot table: 56px tap targets, 16px+ type (smaller makes iOS
// Safari zoom on focus, fatal mid-conversation), no hover-only affordances. Scoped CSS on the
// tenant's --cs-* vars, matching crm-page.jsx.

const CSS = `
.bth{max-width:1100px;margin:0 auto;color:var(--cs-color-fg);font-size:16px;line-height:1.45;}
.bth .hdr{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;border-bottom:2px solid var(--cs-color-brand-primary);padding-bottom:12px;}
.bth .hdr h1{font-size:20px;margin:0;color:var(--cs-color-brand-primary);font-weight:700;}
.bth .hdr .sub{font-size:13px;color:var(--cs-color-fg-muted);margin-top:2px;}
.bth .net{font-size:13px;border-radius:6px;padding:6px 11px;border:1px solid var(--cs-color-border);background:var(--cs-color-bg);color:var(--cs-color-fg-muted);white-space:nowrap;}
.bth .net.live{color:var(--cs-color-success);border-color:var(--cs-color-success);}
.bth .net.off{color:var(--cs-color-warning);border-color:var(--cs-color-warning);font-weight:600;}
.bth .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0;}
.bth .kpi{background:var(--cs-color-bg);border:1px solid var(--cs-color-border);border-radius:10px;padding:12px;}
.bth .kpi .n{font-size:28px;font-weight:700;color:var(--cs-color-brand-primary);line-height:1.1;}
.bth .kpi .l{font-size:11px;color:var(--cs-color-fg-muted);text-transform:uppercase;letter-spacing:.5px;margin-top:4px;}
.bth .kpi.head{border-color:var(--cs-color-brand-accent);}
.bth .kpi.head .n{color:var(--cs-color-brand-accent);}
.bth .modes{display:flex;gap:8px;margin:6px 0 14px;flex-wrap:wrap;}
.bth .mode{flex:1;min-width:140px;min-height:56px;border-radius:10px;border:1px solid var(--cs-color-border);background:var(--cs-color-surface);color:var(--cs-color-fg);font-size:15px;font-weight:600;cursor:pointer;padding:10px 14px;font-family:inherit;}
.bth .mode.on{border-color:var(--cs-color-brand-primary);background:var(--cs-color-brand-primary);color:var(--cs-color-on-primary);}
.bth .mode.cta{border-color:var(--cs-color-brand-accent);background:var(--cs-color-brand-accent);color:var(--cs-color-on-accent);}
.bth .crumbs{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:14px;color:var(--cs-color-fg-muted);margin-bottom:12px;}
.bth .crumbs button{background:none;border:none;color:var(--cs-color-brand-primary);font-weight:600;cursor:pointer;font-size:14px;padding:4px 2px;font-family:inherit;}
.bth .tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;}
.bth .tile{min-height:84px;text-align:left;border:1px solid var(--cs-color-border);border-radius:10px;background:var(--cs-color-surface);padding:14px;cursor:pointer;font-family:inherit;color:var(--cs-color-fg);}
.bth .tile:active{border-color:var(--cs-color-brand-primary);}
.bth .tile .tn{font-weight:700;font-size:16px;}
.bth .tile .tm{font-size:13px;color:var(--cs-color-fg-muted);margin-top:4px;}
.bth .tile .tc{display:inline-block;margin-top:8px;font-size:12px;background:var(--cs-color-brand-primary);color:var(--cs-color-on-primary);padding:2px 9px;border-radius:20px;}
.bth .row{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid var(--cs-color-border);border-radius:10px;padding:12px 14px;margin-bottom:8px;background:var(--cs-color-surface);flex-wrap:wrap;}
.bth .row .rn{font-weight:700;font-size:16px;}
.bth .row .rm{font-size:13px;color:var(--cs-color-fg-muted);margin-top:2px;}
.bth .btn{min-height:48px;border:none;border-radius:8px;padding:10px 18px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;background:var(--cs-color-brand-primary);color:var(--cs-color-on-primary);}
.bth .btn.ghost{background:var(--cs-color-surface);color:var(--cs-color-brand-primary);border:1px solid var(--cs-color-brand-primary);}
.bth .btn.sm{min-height:40px;padding:7px 13px;font-size:14px;}
.bth .btn:disabled{opacity:.45;cursor:default;}
.bth .pill{display:inline-block;font-size:12px;padding:3px 10px;border-radius:20px;border:1px solid var(--cs-color-border);white-space:nowrap;}
.bth .pill.hot{background:#fdecea;border-color:#f0c2b6;color:var(--cs-color-error);font-weight:700;}
.bth .pill.warm{background:#fff6e0;border-color:#f0d68a;}
.bth .pill.cold{background:var(--cs-color-bg);color:var(--cs-color-fg-muted);}
.bth .pill.bkd{background:#e3f6e9;border-color:#9ed8b3;color:var(--cs-color-success);font-weight:700;}
.bth .pill.win{background:#eef3ff;border-color:#c3d4ff;font-weight:600;}
.bth .pill.req{background:#fdf1e2;border-color:#f0d68a;color:var(--cs-color-warning);font-weight:600;}
.bth .muted{color:var(--cs-color-fg-muted);font-size:13px;}
.bth .empty{text-align:center;padding:34px 16px;color:var(--cs-color-fg-muted);border:1px dashed var(--cs-color-border);border-radius:10px;}
.bth .sync{display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:var(--cs-color-bg);border:1px solid var(--cs-color-border);border-radius:10px;padding:12px 14px;margin:14px 0;}
.bth .foot{font-size:12px;color:var(--cs-color-fg-muted);margin-top:20px;border-top:1px solid var(--cs-color-border);padding-top:10px;}
.bth pre.digest{background:var(--cs-color-bg);border:1px solid var(--cs-color-border);border-radius:10px;padding:14px;font-size:13px;line-height:1.5;white-space:pre-wrap;overflow-x:auto;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;}
.bth-back{position:fixed;inset:0;background:rgba(20,20,15,.5);display:flex;align-items:flex-start;justify-content:center;z-index:60;padding:16px;overflow-y:auto;}
.bth-sheet{background:var(--cs-color-surface);border-radius:14px;padding:20px;width:100%;max-width:580px;margin:auto;color:var(--cs-color-fg);}
.bth-sheet h2{margin:0 0 2px;font-size:19px;color:var(--cs-color-brand-primary);}
.bth-sheet .sh-sub{font-size:13px;color:var(--cs-color-fg-muted);margin:0 0 14px;}
.bth-sheet label{display:block;font-size:13px;font-weight:600;margin:14px 0 5px;}
.bth-sheet input,.bth-sheet select,.bth-sheet textarea{width:100%;font-family:inherit;font-size:16px;padding:11px 12px;border:1px solid var(--cs-color-border);border-radius:8px;background:var(--cs-color-bg);color:var(--cs-color-fg);}
.bth-sheet textarea{min-height:64px;resize:vertical;}
.bth-sheet .two{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.bth-sheet .temps,.bth-sheet .stepmodes{display:flex;gap:8px;}
.bth-sheet .temps button,.bth-sheet .stepmodes button{flex:1;min-height:48px;border-radius:8px;border:1px solid var(--cs-color-border);background:var(--cs-color-bg);font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;color:var(--cs-color-fg);padding:6px 8px;}
.bth-sheet .temps button{text-transform:capitalize;font-size:15px;}
.bth-sheet .temps button.on,.bth-sheet .stepmodes button.on{border-color:var(--cs-color-brand-primary);background:var(--cs-color-brand-primary);color:var(--cs-color-on-primary);}
.bth-sheet .check{display:flex;align-items:flex-start;gap:10px;margin-top:12px;font-size:15px;font-weight:600;cursor:pointer;line-height:1.35;}
.bth-sheet .check input{width:22px;height:22px;flex:0 0 auto;margin-top:1px;}
.bth-sheet .check .dt{display:block;font-weight:400;font-size:13px;color:var(--cs-color-fg-muted);}
.bth-sheet .hint{font-size:13px;color:var(--cs-color-fg-muted);background:var(--cs-color-bg);border-radius:8px;padding:10px 12px;margin-top:10px;}
.bth-sheet .acts{display:flex;gap:10px;margin-top:20px;flex-wrap:wrap;}
.bth-sheet .acts .btn{flex:1;min-width:130px;}
.bth-sheet .chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;}
.bth-sheet .chip{display:inline-flex;align-items:center;gap:8px;background:var(--cs-color-brand-primary);color:var(--cs-color-on-primary);border-radius:20px;padding:6px 8px 6px 13px;font-size:14px;font-weight:600;}
.bth-sheet .chip button{background:rgba(255,255,255,.25);border:none;color:inherit;border-radius:50%;width:24px;height:24px;font-size:14px;cursor:pointer;line-height:1;font-family:inherit;}
.bth-sheet .results{border:1px solid var(--cs-color-border);border-radius:8px;margin-top:6px;overflow:hidden;}
.bth-sheet .results button{display:block;width:100%;text-align:left;background:var(--cs-color-bg);border:none;border-bottom:1px solid var(--cs-color-border);padding:11px 13px;cursor:pointer;font-family:inherit;color:var(--cs-color-fg);min-height:52px;}
.bth-sheet .results button:last-child{border-bottom:none;}
.bth-sheet .results button:active{background:var(--cs-color-surface);}
.bth-sheet .results .rn{font-weight:700;font-size:15px;}
.bth-sheet .results .rs{font-size:12.5px;color:var(--cs-color-fg-muted);margin-top:2px;}
.bth-sheet .shot{position:relative;border-radius:10px;overflow:hidden;background:#111;aspect-ratio:4/3;margin-top:6px;}
.bth-sheet .shot video{width:100%;height:100%;object-fit:cover;display:block;}
.bth-sheet .shot-wait{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;}
.bth-sheet .shot-guide{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:82%;aspect-ratio:1.75/1;border:2px dashed rgba(255,255,255,.85);border-radius:8px;box-shadow:0 0 0 9999px rgba(0,0,0,.28);pointer-events:none;}
.bth-sheet .cardshot{display:block;width:100%;max-height:190px;object-fit:contain;background:#f4f1e6;border:1px solid var(--cs-color-border);border-radius:10px;margin-top:6px;cursor:zoom-in;}
.bth-sheet .cardshot-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;}
.bth-sheet .cardshot-row .lbl{font-size:13px;font-weight:600;}
.bth .pill.shot{background:#eef3ff;border-color:#c3d4ff;}
.bth-sheet .verdict{border-radius:10px;padding:11px 13px;margin:0 0 14px;font-size:15px;font-weight:700;border:1px solid var(--cs-color-border);background:var(--cs-color-bg);}
.bth-sheet .verdict .vd{display:block;font-weight:400;font-size:13px;color:var(--cs-color-fg-muted);margin-top:3px;}
.bth-sheet .verdict.existing-contact{background:#e3f6e9;border-color:#9ed8b3;color:var(--cs-color-success);}
.bth-sheet .verdict.new-at-known{background:#eef3ff;border-color:#c3d4ff;}
.bth-sheet .verdict.new{background:#fdf1e2;border-color:#f0d68a;color:var(--cs-color-warning);}
.bth-sheet .verdict.pending{background:#fdf1e2;border-color:#f0d68a;color:var(--cs-color-warning);}
.bth-sheet .verdict.illegible{background:#fdecea;border-color:#f0c2b6;color:var(--cs-color-error);}
.bth .pill.scan{background:#fdf1e2;border-color:#f0d68a;color:var(--cs-color-warning);font-weight:600;}
.bth-sheet .noteTabs{display:flex;gap:6px;margin-top:16px;}
.bth-sheet .noteTabs button{flex:1;min-height:42px;border-radius:8px 8px 0 0;border:1px solid var(--cs-color-border);border-bottom:none;background:var(--cs-color-bg);font-size:13.5px;font-weight:600;cursor:pointer;font-family:inherit;color:var(--cs-color-fg-muted);}
.bth-sheet .noteTabs button.on{background:var(--cs-color-brand-primary);color:var(--cs-color-on-primary);border-color:var(--cs-color-brand-primary);}
.bth-sheet .notebody{border:1px solid var(--cs-color-border);border-radius:0 0 8px 8px;padding:12px 14px;background:var(--cs-color-bg);font-size:13.5px;white-space:pre-wrap;line-height:1.5;max-height:260px;overflow-y:auto;}
@media(max-width:760px){.bth .kpis{grid-template-columns:repeat(2,1fr);}.bth-sheet .two{grid-template-columns:1fr;}.bth-sheet .stepmodes{flex-direction:column;}}
`;

// `many` covers the irregulars — "3 citys" shipped once already.
const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;

export function BoothTool({ resolved }) {
  const tenantId = resolved.id;
  const [captures, setCaptures] = useState(() => loadBooth(tenantId).captures);
  const [accounts, setAccounts] = useState([]);
  const [people, setPeople] = useState([]);
  const [cachedAt, setCachedAt] = useState(null);
  const [loadState, setLoadState] = useState("loading"); // loading | live | cached | empty
  const [online, setOnline] = useState(() => navigator.onLine);
  const [mode, setMode] = useState("territory");          // territory | captured | digest
  const [nav, setNav] = useState({ region: null, state: null, city: null });
  const [sheet, setSheet] = useState(null);
  const [syncMsg, setSyncMsg] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [flash, setFlash] = useState("");
  const [scanning, setScanning] = useState(false);
  const [shutter, setShutter] = useState(false);
  const cameraRef = useRef(null);
  // A webcam shutter only earns its place where `<input capture>` DOESN'T open the OS camera —
  // i.e. desktop. On a tablet the native camera is faster and better exposed, so don't offer two.
  const canWebcam = typeof navigator !== "undefined"
    && !!navigator.mediaDevices?.getUserMedia
    && !matchMedia("(pointer: coarse)").matches;
  const calendar = resolved.calendar || null;

  // Product catalog + deals both come from the BUNDLE (items-seed.json / tenant config), so they
  // need no network and are available on the first tap in a dead room.
  const catalog = useMemo(() => boothCatalog(resolved.cloudinaryFolder), [resolved.cloudinaryFolder]);
  const deals = useMemo(() => activeDeals(resolved), [resolved]);

  useEffect(() => { setCaptures(loadBooth(tenantId).captures); }, [tenantId]);

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // Live read → snapshot. The snapshot is what the drill-down renders from in every case, so
  // there is exactly one code path whether or not the network answered.
  useEffect(() => {
    let alive = true;
    const cached = readCachedAccounts(tenantId);
    if (cached.companies.length) {
      setAccounts(cached.companies); setPeople(cached.people); setCachedAt(cached.at); setLoadState("cached");
    }

    getCrmData(resolved)
      .then((crm) => {
        if (!alive) return;
        const companies = crm?.companies || [];
        if (companies.length) {
          cacheAccounts(tenantId, companies, crm?.people || []);
          const fresh = readCachedAccounts(tenantId);
          setAccounts(fresh.companies); setPeople(fresh.people); setCachedAt(fresh.at); setLoadState("live");
        } else if (!cached.companies.length) {
          setLoadState("empty");
        }
      })
      .catch(() => { if (alive && !cached.companies.length) setLoadState("empty"); });

    return () => { alive = false; };
  }, [tenantId]);

  // Built once per account-book load. Doing this per-account inside the render would walk the
  // full contact list for every company on screen.
  const contactIndex = useMemo(() => indexContacts(people), [people]);

  const stats = useMemo(() => boothStats(captures), [captures]);

  // Region → state → account, counted at every level so the rep can say the number out loud
  // before drilling ("we've got eleven accounts in Jersey") — the §5b conversation opener.
  const byRegion = useMemo(() => {
    const m = new Map();
    for (const a of accounts) {
      const r = regionOf(a);
      if (r === "—") continue;
      if (!m.has(r)) m.set(r, []);
      m.get(r).push(a);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [accounts]);

  const statesIn = useMemo(() => {
    if (!nav.region) return [];
    const list = byRegion.find(([r]) => r === nav.region)?.[1] || [];
    const m = new Map();
    for (const a of list) { const s = stateOf(a) || "—"; if (!m.has(s)) m.set(s, []); m.get(s).push(a); }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [byRegion, nav.region]);

  // Cities within the chosen state. Accounts with no city land in one "City not set" bucket
  // rather than vanishing — an unmapped account still has to be reachable.
  const citiesIn = useMemo(() => {
    if (!nav.state) return [];
    const list = statesIn.find(([s]) => s === nav.state)?.[1] || [];
    const m = new Map();
    for (const a of list) {
      const city = cityOf(a) || "City not set";
      if (!m.has(city)) m.set(city, []);
      m.get(city).push(a);
    }
    return [...m.entries()].sort((a, b) => {
      if (a[0] === "City not set") return 1;
      if (b[0] === "City not set") return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [statesIn, nav.state]);

  const accountsIn = useMemo(() => {
    if (!nav.city) return [];
    return (citiesIn.find(([c]) => c === nav.city)?.[1] || [])
      .slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [citiesIn, nav.city]);

  const capturedCompanyIds = useMemo(
    () => new Set(captures.map((c) => c.companyId).filter(Boolean)),
    [captures]
  );

  function persist(next) { setCaptures(next.captures); }

  // `person` is optional: tapping the account seeds its primary contact, tapping a named contact
  // seeds that person.
  //
  // When a person IS given, their fields are used WHOLESALE — never field-by-field with a
  // fallback to the account's primary. A per-field fallback silently mixed identities: a contact
  // with no phone inherited the primary contact's number, so the rep would dial Jim while the
  // sheet said Kurt. A blank is correct; another person's number is not.
  function openForAccount(account, person) {
    const who = person
      ? { name: person.name || "", email: person.email || "", phone: person.phone || "" }
      : { name: account.owner || "", email: account.ownerEmail || "", phone: account.ownerPhone || "" };
    setSheet(newCapture({
      source: "territory",
      company: account.name,
      companyId: account.id,
      ...who,
      // The account's own switchboard, offered to whoever the rep picked. Separate from `phone`
      // so it reads as the office line, not as this person's direct number.
      officePhone: account.phone || "",
      city: account.city || "",
      state: account.state || "",
    }));
  }

  function openBlank() { setSheet(newCapture({ source: "booth" })); }

  // ---- Card scan ---------------------------------------------------------------------------
  // The speed path (Rick: "I don't want to be typing in info"). Order matters and is deliberate:
  // compress → PERSIST → open the sheet → then read. The rep is looking at an open sheet with a
  // saved photo before any request is made, so a slow or dead network costs a field, never a
  // conversation.
  function onCardPicked(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same card be re-shot without the input going inert
    if (file) ingestCardFile(file);
  }

  /** The one path every card image travels, however it was captured — OS camera, file picker, or
   *  the desktop webcam shutter. Keeping it single means the offline queue, the CRM match, and the
   *  failure handling can't drift apart between entry points. */
  async function ingestCardFile(file) {
    setScanning(true);
    setFlash("");
    let capture = newCapture({ source: "booth", scanState: "pending" });

    try {
      const { dataUrl } = await compressCardImage(file);
      await putCardImage(capture.id, dataUrl);
      persist(addCapture(tenantId, capture));
      setSheet(capture);

      if (!navigator.onLine) {
        setFlash("Card saved. No signal — it'll be read automatically once you're back online. Keep going.");
        return;
      }

      const res = await readCard(dataUrl, { tenant: tenantId });
      capture = applyScanResult(capture, res);
    } catch (err) {
      capture = { ...capture, scanState: "failed" };
      persist(updateCapture(tenantId, capture.id, { scanState: "failed" }));
      setSheet(capture);
      setFlash(`Couldn't read that photo (${String(err?.message || err)}). Type what you need — the photo is saved.`);
    } finally {
      setScanning(false);
    }
  }

  /** Fold an OCR result into a capture: fields, CRM verdict, and the state the UI reads. */
  function applyScanResult(capture, res) {
    if (!res.ok) {
      persist(updateCapture(tenantId, capture.id, { scanState: "pending" }));
      setFlash(
        res.status === 401 ? "Card reading needs an admin passcode. Type the details for now — the photo is saved."
        : "Couldn't reach the card reader. It stays queued and retries when the signal is better."
      );
      return { ...capture, scanState: "pending" };
    }

    const card = res.card || {};
    if (!card.legible) {
      persist(updateCapture(tenantId, capture.id, { scanState: "illegible" }));
      setFlash("That photo was too blurry to read. Retake it, or type the details — nothing is lost.");
      const next = { ...capture, scanState: "illegible" };
      setSheet(next);
      return next;
    }

    const m = matchCard(card, { people, companies: accounts });
    const patch = {
      name: card.name || "",
      title: card.title || "",
      company: m.account?.name || card.company || "",
      companyId: m.account?.id || null,
      email: card.email || m.contact?.email || "",
      phone: card.phone || "",
      officePhone: card.officePhone || m.account?.phone || "",
      phoneExt: card.phoneExt || "",
      city: m.account?.city || "",
      state: m.account?.state || "",
      notes: card.notes || "",
      scanState: "read",
      scannedAt: new Date().toISOString(),
      scanMatch: m.verdict,
    };
    persist(updateCapture(tenantId, capture.id, patch));
    const next = { ...capture, ...patch };
    setSheet(next);
    setFlash(
      m.verdict === "existing-contact" ? `Already in the CRM — ${m.why} Check the details and go.`
      : m.verdict === "new-at-known" ? `${m.why} It'll be added on sync.`
      : "New contact and new account — both get created on sync."
    );
    return next;
  }

  // Any scan taken with no signal is read the moment one returns. This is what makes the offline
  // path a real path rather than a consolation prize: the rep shoots cards all afternoon and the
  // details fill themselves in on the drive home.
  useEffect(() => {
    if (!online) return;
    const pending = captures.filter((c) => c.scanState === "pending");
    if (!pending.length) return;
    let cancelled = false;
    (async () => {
      const { getCardImage } = await import("@/lib/card-scan.js");
      for (const c of pending) {
        if (cancelled) return;
        const dataUrl = await getCardImage(c.id);
        if (!dataUrl) { persist(updateCapture(tenantId, c.id, { scanState: "failed" })); continue; }
        const res = await readCard(dataUrl, { tenant: tenantId });
        if (cancelled || !res.ok) return; // still no good connection — leave the rest queued
        const card = res.card || {};
        if (!card.legible) { persist(updateCapture(tenantId, c.id, { scanState: "illegible" })); continue; }
        const m = matchCard(card, { people, companies: accounts });
        persist(updateCapture(tenantId, c.id, {
          name: c.name || card.name || "",
          title: c.title || card.title || "",
          company: c.company || m.account?.name || card.company || "",
          companyId: c.companyId || m.account?.id || null,
          email: c.email || card.email || "",
          phone: c.phone || card.phone || "",
          officePhone: c.officePhone || card.officePhone || m.account?.phone || "",
          phoneExt: c.phoneExt || card.phoneExt || "",
          scanState: "read", scannedAt: new Date().toISOString(), scanMatch: m.verdict,
        }));
      }
    })();
    return () => { cancelled = true; };
  }, [online, captures.length, accounts.length, people.length]);

  function saveSheet(capture) {
    const exists = captures.some((c) => c.id === capture.id);
    persist(exists ? updateCapture(tenantId, capture.id, capture) : addCapture(tenantId, capture));
    setSheet(null);
  }

  // Take a confirmed-time capture into Google Calendar. Opening the prefilled event is the LAST
  // step — the capture is written first, so a blocked popup can never cost the record.
  function openCalendar(capture) {
    const url = googleCalendarUrl(capture, { brandName: resolved.brand.name, calendar });
    if (!url) return;
    persist(updateCapture(tenantId, capture.id, { calendarAddedAt: new Date().toISOString() }));
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // A mailto: via synthetic anchor, NOT window.open/location.href — handing a mailto: to either
  // can unload this SPA on some browsers, throwing away the capture the rep just took.
  function openMail(capture) {
    const a = document.createElement("a");
    a.href = recapMailto(capture, { brandName: resolved.brand.name, deals });
    a.rel = "noopener";
    a.click();
  }

  // The commit action, branching on how the next step was left. Each branch WRITES FIRST and
  // reaches the network last, so an offline booth degrades to "saved, do it later" rather than
  // losing the conversation.
  function commitFrom(capture) {
    const stamp = new Date().toISOString();

    if (capture.nextStepMode === "request") {
      saveSheet({ ...capture, booked: false, requestedAt: stamp, recapSentAt: stamp });
      openMail({ ...capture, requestedAt: stamp });
      setFlash(`Request drafted to ${capture.name || "them"} — send it from your mail app.`);
      return;
    }

    if (capture.nextStepMode === "window") {
      saveSheet({ ...capture, booked: true });
      setFlash(`Window agreed — ${nextStepText(capture, { voice: "house" })}. Send the recap from Captured, and set a time once they confirm.`);
      return;
    }

    // Confirmed time.
    const saved = { ...capture, booked: true };
    saveSheet(online ? { ...saved, calendarAddedAt: stamp } : saved);
    if (online) {
      const url = googleCalendarUrl(saved, { brandName: resolved.brand.name, calendar });
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      setFlash(`Confirmed. Google Calendar opened — tap Save there and ${capture.name || "they"} get the invite.`);
    } else {
      setFlash("Confirmed and saved on this device. No signal — add it to Google Calendar from Captured once you're back online.");
    }
  }

  function discard(id) {
    persist(removeCapture(tenantId, id));
    deleteCardImage(id); // don't orphan the photo in IndexedDB
  }

  async function runSync(commit) {
    setSyncing(true); setSyncMsg("");
    const res = await pushToHubspot(resolved, captures, { commit });
    if (!res.ok) {
      setSyncMsg(
        res.status === 0 ? "No connection — captures stay on this device. Sync when you have signal."
        : res.status === 401 ? "Admin passcode required to write to HubSpot."
        : `HubSpot refused the push (${res.status}). Captures are safe on this device.`
      );
    } else if (res.dryRun) {
      const n = (res.planned || []).length;
      setSyncMsg(`Dry run OK — ${n} contact${n === 1 ? "" : "s"} ready to write. Nothing sent yet.`);
    } else {
      const stamped = new Date().toISOString();
      let doc = loadBooth(tenantId);
      for (const id of res.pushedIds || []) doc = updateCapture(tenantId, id, { pushedAt: stamped });
      persist(doc);
      setSyncMsg(`Pushed ${(res.pushedIds || []).length} contact(s) to HubSpot.`);
    }
    setSyncing(false);
  }

  const { ready, blocked } = useMemo(() => splitPushable(captures), [captures]);
  const digest = useMemo(
    () => buildShowDigest(captures, { brandName: resolved.brand.name, deals }),
    [captures, resolved.brand.name, deals]
  );

  const net = !online ? { cls: "off", text: "Offline — capturing to this device" }
    : loadState === "live" ? { cls: "live", text: `Live ✓ ${accounts.length.toLocaleString()} accounts` }
    : loadState === "cached" ? { cls: "", text: `Offline copy · ${accounts.length.toLocaleString()} accounts` }
    : loadState === "loading" ? { cls: "", text: "Loading accounts…" }
    : { cls: "off", text: "No account book cached" };

  return (
    <div className="bth">
      <style>{CSS}</style>

      <div className="hdr">
        <div>
          <h1>{resolved.brand.name} — Booth to Meeting</h1>
          <div className="sub">Capture the conversation, agree the next step before they walk away.</div>
        </div>
        <div className={`net ${net.cls}`}>{net.text}</div>
      </div>

      <div className="kpis">
        <div className="kpi"><div className="n">{stats.conversations}</div><div className="l">Conversations</div></div>
        <div className="kpi"><div className="n">{stats.committed}<span style={{ fontSize: 16, opacity: .6 }}> / {stats.timed} timed</span></div><div className="l">Next step agreed</div></div>
        <div className="kpi head"><div className="n">{stats.committedRate}%</div><div className="l">Ended with a next step</div></div>
        <div className="kpi"><div className="n">{stats.requested}</div><div className="l">Requests out</div></div>
      </div>

      <div className="modes">
        <button className={`mode ${mode === "territory" ? "on" : ""}`} onClick={() => setMode("territory")}>
          Territory — who do you cover?
        </button>
        <button className={`mode ${mode === "captured" ? "on" : ""}`} onClick={() => setMode("captured")}>
          Captured{captures.length ? ` (${captures.length})` : ""}
        </button>
        <button className={`mode ${mode === "digest" ? "on" : ""}`} onClick={() => setMode("digest")}>
          Show report
        </button>
        {/* THE fast path — first among the actions because it's the one the rep should reach for
            by default. `capture="environment"` opens the rear camera straight into the card. */}
        <button
          className="mode cta"
          onClick={() => (canWebcam ? setShutter(true) : cameraRef.current?.click())}
          disabled={scanning}
        >
          {scanning ? "Reading card…" : "📷 Scan a card"}
        </button>
        {/* On desktop the primary button opens the webcam, so keep the file picker reachable for
            a photo that's already on disk. On a tablet the primary button IS the picker. */}
        {canWebcam && (
          <button className="mode" onClick={() => cameraRef.current?.click()} disabled={scanning}>
            Choose a photo
          </button>
        )}
        <button className="mode" onClick={openBlank}>Type it instead</button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onCardPicked}
          style={{ display: "none" }}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {flash && (
        <div className="sync" style={{ marginTop: 0 }}>
          <div style={{ flex: 1, minWidth: 220 }}>{flash}</div>
          <button className="btn ghost sm" onClick={() => setFlash("")}>Dismiss</button>
        </div>
      )}

      {/* The queue that builds while the booth has no signal. Loud on purpose — a confirmed time
          that never reached the calendar is the one failure this tool exists to prevent. */}
      {stats.awaitingCalendar > 0 && (
        <div className="sync" style={{ borderColor: "var(--cs-color-warning)" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <strong>{stats.awaitingCalendar}</strong> confirmed {stats.awaitingCalendar === 1 ? "visit is" : "visits are"} not on
            the calendar yet{online ? "" : " — no signal right now"}. Clear {stats.awaitingCalendar === 1 ? "it" : "them"} from
            Captured before you leave the show.
          </div>
          <button className="btn ghost" onClick={() => setMode("captured")}>Show me</button>
        </div>
      )}

      {mode === "territory" ? (
        <>
          <div className="crumbs">
            <button onClick={() => setNav({ region: null, state: null, city: null })}>All regions</button>
            {nav.region && <><span>›</span><button onClick={() => setNav({ region: nav.region, state: null, city: null })}>{nav.region}</button></>}
            {nav.state && <><span>›</span><button onClick={() => setNav({ region: nav.region, state: nav.state, city: null })}>{nav.state}</button></>}
            {nav.city && <><span>›</span><span>{nav.city}</span></>}
            {cachedAt && (
              <span className="muted" style={{ marginLeft: "auto" }}>
                {people.length ? `${people.length.toLocaleString()} contacts · ` : ""}synced {new Date(cachedAt).toLocaleString()}
              </span>
            )}
          </div>

          {loadState === "empty" ? (
            <div className="empty">
              No account book cached yet. Open this page once with a signal — the accounts are saved
              to this device and stay available at the show.
            </div>
          ) : !nav.region ? (
            <div className="tiles">
              {byRegion.map(([region, list]) => (
                <button key={region} className="tile" onClick={() => setNav({ region, state: null, city: null })}>
                  <div className="tn">{region}</div>
                  <div className="tm">{plural(new Set(list.map((a) => stateOf(a)).filter(Boolean)).size, "state")}</div>
                  <div className="tc">{plural(list.length, "account")}</div>
                </button>
              ))}
            </div>
          ) : !nav.state ? (
            <div className="tiles">
              {statesIn.map(([st, list]) => (
                <button key={st} className="tile" onClick={() => setNav({ region: nav.region, state: st, city: null })}>
                  <div className="tn">{st}</div>
                  <div className="tm">{plural(new Set(list.map((a) => cityOf(a)).filter(Boolean)).size, "city", "cities")}</div>
                  <div className="tc">{plural(list.length, "account")}</div>
                </button>
              ))}
            </div>
          ) : !nav.city ? (
            <div className="tiles">
              {citiesIn.map(([city, list]) => (
                <button key={city} className="tile" onClick={() => setNav({ region: nav.region, state: nav.state, city })}>
                  <div className="tn">{city}</div>
                  <div className="tm">{list.filter((a) => capturedCompanyIds.has(a.id)).length} worked today</div>
                  <div className="tc">{plural(list.length, "account")}</div>
                </button>
              ))}
            </div>
          ) : (
            <>
              <p className="muted" style={{ margin: "0 0 10px" }}>
                “Do you service this account?” — tap anyone to capture the conversation and agree a next step.
              </p>
              {accountsIn.map((a) => {
                const contacts = contactsForCompany(a, contactIndex);
                return (
                  <div key={a.id} style={{ marginBottom: 14 }}>
                    <div className="row" style={{ marginBottom: contacts.length ? 4 : 8 }}>
                      <div>
                        <div className="rn">{a.name}</div>
                        <div className="rm">
                          {[a.city, a.state].filter(Boolean).join(", ") || "—"}
                          {a.channel ? ` · ${a.channel}` : ""}
                          {` · ${plural(contacts.length, "contact")}`}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {capturedCompanyIds.has(a.id) && <span className="pill bkd">Worked today</span>}
                        <button className="btn" onClick={() => openForAccount(a)}>Open account</button>
                      </div>
                    </div>
                    {/* Every contact on the account, not just the primary — a distributor has a
                        buyer AND a category manager AND a chef, and the rep needs the one who's
                        actually standing there. */}
                    {contacts.map((p, i) => (
                      <div
                        className="row"
                        key={`${a.id}-${p.email || p.name || i}`}
                        style={{ marginLeft: 22, marginBottom: 4, background: "var(--cs-color-bg)" }}
                      >
                        <div>
                          <div className="rn" style={{ fontSize: 15 }}>{p.name || <span className="muted">unnamed contact</span>}</div>
                          <div className="rm">
                            {p.email || "no email"}
                            {p.phone ? ` · ${p.phone}` : a.phone ? ` · ${a.phone} (office)` : ""}
                          </div>
                        </div>
                        <button className="btn ghost sm" onClick={() => openForAccount(a, p)}>Capture</button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          )}
        </>
      ) : mode === "digest" ? (
        <>
          <p className="muted" style={{ margin: "0 0 10px" }}>
            The house side of every conversation today, ordered by how firm the next step is. Copy it
            into an email — nothing sends on its own.
          </p>
          {captures.length === 0 ? (
            <div className="empty">Nothing captured yet, so there's no report to write.</div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <button className="btn" onClick={() => navigator.clipboard?.writeText(digest)}>Copy report</button>
                <a
                  className="btn ghost"
                  style={{ display: "inline-block", textDecoration: "none", lineHeight: "28px" }}
                  href={`mailto:?subject=${encodeURIComponent(`${resolved.brand.name} — show report (${captures.length} conversations)`)}&body=${encodeURIComponent(digest)}`}
                >Open in mail</a>
              </div>
              <pre className="digest">{digest}</pre>
            </>
          )}
        </>
      ) : (
        <>
          {captures.length === 0 ? (
            <div className="empty">Nothing captured yet. Tap “+ New conversation” when someone steps up to the table.</div>
          ) : (
            captures.map((c) => (
              <div className="row" key={c.id}>
                <div style={{ minWidth: 200, flex: 1 }}>
                  <div className="rn">{c.name || <span className="muted">no name yet</span>}</div>
                  <div className="rm">
                    {c.company || "—"}
                    {c.products?.length ? ` · ${c.products.map((p) => p.name).join(", ")}` : ""}
                    {nextStepText(c, { voice: "house" }) ? ` · ${nextStepText(c, { voice: "house" })}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span className={`pill ${c.temperature}`}>{c.temperature}</span>
                  {c.nextStepMode === "time" && <span className="pill bkd">Confirmed</span>}
                  {c.nextStepMode === "window" && <span className="pill win">Window</span>}
                  {c.nextStepMode === "request" && <span className="pill req">Requested</span>}
                  {c.scanState === "pending" && <span className="pill scan">Card unread</span>}
                  {c.pushedAt && <span className="pill">Synced</span>}
                  {c.nextStepMode === "time" && c.whenISO && !c.calendarAddedAt && (
                    <button className="btn sm" onClick={() => openCalendar(c)} disabled={!online}>
                      Add to Google Calendar
                    </button>
                  )}
                  {c.email && <button className="btn ghost sm" onClick={() => { openMail(c); persist(updateCapture(tenantId, c.id, { recapSentAt: new Date().toISOString() })); }}>Recap</button>}
                  <button className="btn ghost sm" onClick={() => setSheet(c)}>Open</button>
                  <button className="btn ghost sm" onClick={() => discard(c.id)} aria-label={`Discard ${c.name || "capture"}`}>✕</button>
                </div>
              </div>
            ))
          )}

          {captures.length > 0 && (
            <div className="sync">
              <div style={{ flex: 1, minWidth: 220 }}>
                <strong>{ready.length}</strong> ready to sync to HubSpot
                {blocked.length > 0 && <span className="muted"> · {blocked.length} held back (need a name and an email)</span>}
              </div>
              <button className="btn ghost" onClick={() => runSync(false)} disabled={syncing || !ready.length || !online}>Dry run</button>
              <button className="btn" onClick={() => runSync(true)} disabled={syncing || !ready.length || !online}>Sync to HubSpot</button>
            </div>
          )}
          {syncMsg && <p className="muted" style={{ margin: "0 0 8px" }}>{syncMsg}</p>}
        </>
      )}

      {shutter && (
        <WebcamShutter
          onClose={() => setShutter(false)}
          onCapture={(file) => { setShutter(false); ingestCardFile(file); }}
        />
      )}

      {sheet && (
        <CaptureSheet
          capture={sheet}
          brandName={resolved.brand.name}
          calendarAddress={calendar?.address}
          durationMinutes={calendar?.defaultDurationMinutes || 45}
          catalog={catalog}
          deals={deals}
          onSave={saveSheet}
          onCommit={commitFrom}
          onClose={() => setSheet(null)}
        />
      )}

      <div className="foot">
        Captures are written to this device first and survive a reload with no signal. Accounts read live
        from HubSpot (read-only) and are snapshotted here for offline use{crmIsSample ? " — currently SAMPLE data, set VITE_CRM_BACKEND=hubspot" : ""}.
        Products come from the {resolved.brand.name} item list bundled in the app ({catalog.length} SKUs), so search works with no signal.
        Confirmed times open prefilled in Google Calendar{calendar?.address ? ` (${calendar.address})` : ""} with the buyer as a guest.
        Sync writes the house note to HubSpot through crm-push (admin passcode; dry run first). Nothing sends without your tap.
      </div>
    </div>
  );
}

// Desktop webcam shutter. The tablet uses the OS camera via `<input capture>`; this exists so the
// same button does something sensible on a laptop, where `capture` is silently ignored and the
// picker opens instead.
//
// The whole component is really about ONE invariant: the stream must be released on every exit
// path — capture, cancel, backdrop click, unmount, or a failed start. A leaked MediaStream leaves
// the recording light on and holds the camera against every other app on the machine, which reads
// as a bug in the app and is invisible from inside it.
function WebcamShutter({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [deviceId, setDeviceId] = useState("");

  // Re-runs when the rep picks a different camera — the old stream is torn down by the cleanup
  // below before the new one opens, so two cameras are never live at once.
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError("");
    (async () => {
      try {
        const stream = await openCamera(deviceId || undefined);
        // The dialog can close (or the device change again) while getUserMedia is still
        // resolving; without this the stream starts after unmount and never gets stopped.
        if (cancelled) { closeCamera(stream); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
        // Labels are only populated once permission is granted, so enumerate now, not earlier.
        const found = await listCameras();
        if (!cancelled && found.length > 1) setCameras(found);
      } catch (err) {
        if (!cancelled) setError(String(err?.message || err));
      }
    })();
    return () => {
      cancelled = true;
      closeCamera(streamRef.current);
      streamRef.current = null;
    };
  }, [deviceId]);

  async function shoot() {
    setBusy(true);
    try {
      const file = await grabFrame(videoRef.current);
      closeCamera(streamRef.current);   // release before handing off — don't hold it through OCR
      streamRef.current = null;
      onCapture(file);
    } catch (err) {
      setError(String(err?.message || err));
      setBusy(false);
    }
  }

  return (
    <div className="bth-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bth-sheet" role="dialog" aria-modal="true" aria-label="Scan a card with the camera">
        <h2>Scan a card</h2>
        <p className="sh-sub">Fill the frame with the card, then Capture. Flat and well-lit reads best.</p>

        {error ? (
          <div className="verdict illegible">
            ⚠ {error}
            <span className="vd">Use “Type it instead”, or pick a photo file.</span>
          </div>
        ) : (
          <div className="shot">
            <video ref={videoRef} playsInline muted autoPlay />
            {/* Framing guide at a business card's ~1.75:1. Auto-crop does the real work, but a
                rep who fills this box gives it an easy job — and a card shot edge-to-edge needs
                no crop at all. */}
            {ready && <div className="shot-guide" aria-hidden="true" />}
            {!ready && <div className="shot-wait">Starting camera…</div>}
          </div>
        )}

        {/* Only shown when there's an actual choice. On a Mac this is usually the built-in
            FaceTime camera vs an iPhone over Continuity — pick the iPhone for small print. */}
        {cameras.length > 1 && !error && (
          <>
            <label htmlFor="bf-cam">Camera</label>
            <select id="bf-cam" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
              <option value="">Default camera</option>
              {cameras.map((c) => <option key={c.deviceId} value={c.deviceId}>{c.label}</option>)}
            </select>
          </>
        )}

        <div className="acts">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={shoot} disabled={!ready || busy || !!error}>
            {busy ? "Reading…" : "Capture"}
          </button>
        </div>
      </div>
    </div>
  );
}

// The one capture sheet both entry triggers land on (§5b step 3), now producing both sides of
// the note from a single pass of data entry.
function CaptureSheet({ capture, brandName, calendarAddress, durationMinutes, catalog, deals, onSave, onCommit, onClose }) {
  const [c, setC] = useState(capture);
  const [touchedTemp, setTouchedTemp] = useState(false);
  const [q, setQ] = useState("");
  const [noteSide, setNoteSide] = useState("buyer"); // buyer | house
  const [shot, setShot] = useState(null);
  const firstField = useRef(null);

  useEffect(() => { firstField.current?.focus(); }, []);

  // Pull the card photo back out of IndexedDB. Showing it matters most in exactly the case where
  // OCR failed: the rep can read the card on screen and type from it, instead of hunting for the
  // physical card that's already in a pocket. It's also the only proof the shutter actually fired.
  useEffect(() => {
    let alive = true;
    (async () => {
      const { getCardImage } = await import("@/lib/card-scan.js");
      const url = await getCardImage(capture.id);
      if (alive) setShot(url);
    })();
    return () => { alive = false; };
  }, [capture.id]);

  // Re-run the §3 escalation ladder as the signal fields change, until the rep overrides it.
  useEffect(() => {
    if (touchedTemp) return;
    const t = suggestTemperature(c);
    if (t !== c.temperature) {
      const ask = suggestedFollowUp(t);
      setC((p) => ({ ...p, temperature: t, followUpType: p.followUpType || ask || "" }));
    }
  }, [c.products, c.useCase, c.priceQuestion, touchedTemp]);

  const set = (part) => setC((p) => ({ ...p, ...part }));
  const results = useMemo(() => searchCatalog(catalog, q), [catalog, q]);
  const picked = new Set((c.products || []).map((p) => p.sku));
  const opts = { brandName, deals };

  function addProduct(p) {
    if (picked.has(p.sku)) return;
    set({ products: [...(c.products || []), p] });
    setQ("");
  }
  function dropProduct(sku) { set({ products: (c.products || []).filter((p) => p.sku !== sku) }); }
  function toggleDeal(key) {
    const on = (c.dealKeys || []).includes(key);
    set({ dealKeys: on ? c.dealKeys.filter((k) => k !== key) : [...(c.dealKeys || []), key] });
  }

  // What "commit" needs, per mode. A request needs only a follow-up type and an email; a window
  // needs a window; a time needs a datetime.
  const canCommit =
    c.nextStepMode === "time" ? Boolean(c.followUpType && c.whenISO)
    : c.nextStepMode === "window" ? Boolean(c.followUpType && c.windowKey)
    : c.nextStepMode === "request" ? Boolean(c.followUpType && c.email)
    : false;

  const commitLabel =
    c.nextStepMode === "time" ? (c.whenISO ? `Confirm — ${prettyWhen(c.whenISO)}` : "Pick a date and time")
    : c.nextStepMode === "window" ? (c.windowKey ? `Agree — ${FOLLOW_UP_WINDOWS.find((w) => w.key === c.windowKey)?.label}` : "Pick a window")
    : c.nextStepMode === "request" ? (c.email ? "Send the request" : "Needs an email address")
    : "Choose how you left it";

  return (
    <div className="bth-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bth-sheet" role="dialog" aria-modal="true" aria-label="Capture and agree a next step">
        <h2>{c.company || c.name || "New conversation"}</h2>
        <p className="sh-sub">
          {c.source === "territory" ? "From the account book — confirm who you spoke to." : "Capture it now, agree the next step before they walk away."}
        </p>

        {/* The answer to "new or existing?", stated before the rep reads a single field. */}
        {c.scanState === "read" && c.scanMatch && (
          <div className={`verdict ${c.scanMatch}`}>
            {c.scanMatch === "existing-contact" ? "✓ Already in the CRM"
              : c.scanMatch === "new-at-known" ? "＋ New person at an account you know"
              : "＋ New contact and new account"}
            <span className="vd">Scanned from their card — check it before you commit.</span>
          </div>
        )}
        {c.scanState === "pending" && (
          <div className="verdict pending">
            ⏳ Card saved, not read yet
            <span className="vd">No signal. It reads itself when you're back online — keep going.</span>
          </div>
        )}
        {c.scanState === "illegible" && (
          <div className="verdict illegible">
            ⚠ Couldn't read that photo
            <span className="vd">Too blurry or cropped. Retake it, or type the details.</span>
          </div>
        )}

        {shot && (
          <>
            <div className="cardshot-row">
              <span className="lbl">The card you shot</span>
              <a className="muted" href={shot} download={`card-${capture.id}.jpg`}>Download</a>
            </div>
            <img
              className="cardshot"
              src={shot}
              alt="The scanned business card"
              onClick={() => window.open(shot, "_blank", "noopener,noreferrer")}
              title="Click to open full size"
            />
          </>
        )}

        <div className="two">
          <div>
            <label htmlFor="bf-name">Who you talked to</label>
            <input id="bf-name" ref={firstField} value={c.name} onChange={(e) => set({ name: e.target.value })} placeholder="Name" />
          </div>
          <div>
            <label htmlFor="bf-title">Title</label>
            <input id="bf-title" value={c.title} onChange={(e) => set({ title: e.target.value })} placeholder="Chef, buyer…" />
          </div>
        </div>

        <label htmlFor="bf-company">Company / account</label>
        <input id="bf-company" value={c.company} onChange={(e) => set({ company: e.target.value })} />

        <div className="two">
          <div>
            <label htmlFor="bf-email">Email</label>
            <input id="bf-email" type="email" inputMode="email" value={c.email} onChange={(e) => set({ email: e.target.value })} />
          </div>
          <div>
            <label htmlFor="bf-phone">Direct phone</label>
            <input id="bf-phone" type="tel" inputMode="tel" value={c.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="if they have one" />
          </div>
        </div>

        {/* Most foodservice buyers are reached on the house line plus an extension, not a direct
            number. The office line is the account's, shown as the account's — never silently
            pasted into the direct-phone field as if it were this person's. */}
        <label htmlFor="bf-ext">Office line{c.officePhone ? "" : " (none on the account)"}</label>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 10 }}>
          <input
            id="bf-office"
            type="tel"
            inputMode="tel"
            value={c.officePhone}
            onChange={(e) => set({ officePhone: e.target.value })}
            placeholder="Main number"
            aria-label="Office line"
          />
          <input
            id="bf-ext"
            inputMode="numeric"
            value={c.phoneExt}
            onChange={(e) => set({ phoneExt: e.target.value })}
            placeholder="ext."
          />
        </div>
        {phoneText(c) && <p className="muted" style={{ margin: "6px 0 0" }}>Reach them on: {phoneText(c)}</p>}

        {/* Real SKUs, not free text — this is what makes the recap able to carry product info and
            the report able to tally what actually moved at the show. */}
        <label htmlFor="bf-prod">What did they taste?</label>
        {c.products?.length > 0 && (
          <div className="chips">
            {c.products.map((p) => (
              <span className="chip" key={p.sku}>
                {p.name}
                <button onClick={() => dropProduct(p.sku)} aria-label={`Remove ${p.name}`}>✕</button>
              </span>
            ))}
          </div>
        )}
        <input
          id="bf-prod"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${catalog.length} products — "asiago", "piave"…`}
          style={{ marginTop: c.products?.length ? 8 : 0 }}
        />
        {results.length > 0 && (
          <div className="results">
            {results.map((p) => (
              <button key={p.sku} onClick={() => addProduct(p)} disabled={picked.has(p.sku)}>
                <div className="rn">{p.name}{picked.has(p.sku) ? " ✓" : ""}</div>
                <div className="rs">{p.sku}{productSpec(p) ? ` · ${productSpec(p)}` : ""}</div>
              </button>
            ))}
          </div>
        )}
        {q && results.length === 0 && <p className="muted" style={{ marginTop: 6 }}>Nothing matches “{q}”.</p>}

        <label htmlFor="bf-use">Their words — what would they do with it?</label>
        <input id="bf-use" value={c.useCase} onChange={(e) => set({ useCase: e.target.value })} placeholder="“shaved over the fall risotto”" />

        <label className="check" htmlFor="bf-price">
          <input id="bf-price" type="checkbox" checked={c.priceQuestion} onChange={(e) => set({ priceQuestion: e.target.checked })} />
          They asked about price or minimums
        </label>

        {/* Deals: configured offers first, free text for whatever got offered off the cuff. */}
        <label>What did you put on the table?</label>
        {deals.length === 0 ? (
          <p className="muted" style={{ margin: "0 0 6px" }}>
            No deals set up yet — type what you offered below and it lands in both the recap and the report.
          </p>
        ) : (
          deals.map((d) => (
            <label className="check" key={d.key} htmlFor={`bf-deal-${d.key}`}>
              <input
                id={`bf-deal-${d.key}`}
                type="checkbox"
                checked={(c.dealKeys || []).includes(d.key)}
                onChange={() => toggleDeal(d.key)}
              />
              <span>{d.label}{d.detail && <span className="dt">{d.detail}</span>}</span>
            </label>
          ))
        )}
        <input
          value={c.dealNote}
          onChange={(e) => set({ dealNote: e.target.value })}
          placeholder="Anything else you offered"
          style={{ marginTop: 8 }}
          aria-label="Other offer"
        />

        <label>How hot is it?</label>
        <div className="temps">
          {TEMPERATURES.map((t) => (
            <button
              key={t}
              className={c.temperature === t ? "on" : ""}
              onClick={() => { setTouchedTemp(true); set({ temperature: t, followUpType: c.followUpType || suggestedFollowUp(t) || "" }); }}
            >{t}</button>
          ))}
        </div>
        {c.temperature === "cold" && (
          <div className="hint">
            Cold — don't push for a date. Save the notes and let it nurture; the record is here next time.
          </div>
        )}

        <label htmlFor="bf-type">Next step</label>
        <select id="bf-type" value={c.followUpType} onChange={(e) => set({ followUpType: e.target.value })}>
          <option value="">Choose a next step…</option>
          {FOLLOW_UP_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>

        <label>How did you leave it?</label>
        <div className="stepmodes">
          <button className={c.nextStepMode === "time" ? "on" : ""} onClick={() => set({ nextStepMode: "time" })}>Confirmed a time</button>
          <button className={c.nextStepMode === "window" ? "on" : ""} onClick={() => set({ nextStepMode: "window" })}>Agreed a window</button>
          <button className={c.nextStepMode === "request" ? "on" : ""} onClick={() => set({ nextStepMode: "request" })}>Ask them to pick</button>
        </div>

        {c.nextStepMode === "time" && (
          <>
            <label htmlFor="bf-when">When</label>
            <input id="bf-when" type="datetime-local" value={c.whenISO} onChange={(e) => set({ whenISO: e.target.value })} />
          </>
        )}
        {c.nextStepMode === "window" && (
          <>
            <label htmlFor="bf-window">Which window did they agree to?</label>
            <select id="bf-window" value={c.windowKey} onChange={(e) => set({ windowKey: e.target.value })}>
              <option value="">Choose a window…</option>
              {FOLLOW_UP_WINDOWS.map((w) => <option key={w.key} value={w.key}>{w.label}</option>)}
            </select>
            <div className="hint">A window still counts as a next step. Set the exact time later, once they confirm.</div>
          </>
        )}
        {c.nextStepMode === "request" && (
          <div className="hint">
            Drafts an email asking them to pick a time. Weaker than an agreement made at the table — reach for
            this only when they genuinely can't commit standing there.
          </div>
        )}

        <label htmlFor="bf-notes">Notes</label>
        <textarea id="bf-notes" value={c.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Anything else worth remembering" />

        {/* Both sides of the note, from the one capture. Showing them together is the point:
            the rep can see exactly what the buyer reads AND what the house records. */}
        <div className="noteTabs">
          <button className={noteSide === "buyer" ? "on" : ""} onClick={() => setNoteSide("buyer")}>What they get</button>
          <button className={noteSide === "house" ? "on" : ""} onClick={() => setNoteSide("house")}>What Rick gets</button>
        </div>
        <div className="notebody">
          {noteSide === "buyer" ? buildRecap(c, opts) : buildInternalNote(c, opts)}
        </div>

        <div className="acts">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn ghost" onClick={() => onSave(c)}>Save only</button>
          <button className="btn" onClick={() => onCommit(c)} disabled={!canCommit}>{commitLabel}</button>
        </div>

        {c.nextStepMode === "time" && c.whenISO && (
          <p className="muted" style={{ margin: "10px 0 0", fontSize: 13 }}>
            Opens Google Calendar ({calendarAddress || "no calendar configured"}) with
            {c.email ? ` ${c.email} as a guest` : " no guest — add an email to invite them"}. One tap on Save books it.
            {" "}
            <button
              className="btn ghost sm"
              style={{ minHeight: 34, padding: "4px 10px", marginTop: 6 }}
              onClick={() => downloadIcs({ ...c, booked: true }, { brandName, durationMinutes })}
            >Download .ics instead</button>
          </p>
        )}
      </div>
    </div>
  );
}
