// Per-recipient email drafts — the campaign's approved copy, addressed to one person, with the
// campaign's approved documents carried as links.
//
// Rick, 2026-09-22: "Once the rep list for the campaign is selected I will want to send an email
// that includes the documents individually addressed to each rep. so send email will draft the
// email from the script addressed to each rep or recipient depending on the campaign and load the
// loaded documents."
//
// THREE CONSTRAINTS SHAPE THIS, and they are worth stating because none is obvious:
//
// 1. ONE DRAFT PER PERSON, never a group send. A single compose with twelve addresses in `to`
//    shows every rep who else got it, and it cannot say "Hi Michael". Addressing is the whole
//    point of the request, so the merge produces N separate drafts.
//
// 2. LINKS, NOT ATTACHMENTS. A Gmail compose URL (and mailto:) carries only to/subject/body —
//    neither has an attachment parameter. The documents already live at Cloudinary delivery URLs,
//    so the body carries named links. Real attachments would need an ESP or the Gmail API, which
//    is a different build with its own OAuth.
//
// 3. NOTHING IS SENT. Every draft opens in the composer for a human to read and send. That is the
//    house rule (Rick sends everything himself) and the only safe default for something that
//    fires N times.
//
// Documents are filtered to APPROVED only. A pending or rejected document is one nobody has
// signed off, and a mail merge is the worst possible place to discover that — the caller is told
// how many were withheld, so the omission is visible rather than silent.

/** Tokens a template may use. Kept small on purpose: every token here must resolve from data the
 *  campaign already has, or a draft could go out with a literal {{placeholder}} in it. */
export const MERGE_TOKENS = [
  { token: "{{first_name}}", what: "Recipient's first name (falls back to “there”)" },
  { token: "{{name}}", what: "Recipient's full name" },
  { token: "{{company}}", what: "Recipient's company" },
  { token: "{{campaign}}", what: "This campaign's name" },
  { token: "{{documents}}", what: "The approved documents, as a named link per line" },
  { token: "{{sender}}", what: "The sending identity (your calendar address)" },
];

const str = (v) => String(v ?? "").trim();

/** First word of a name. "there" rather than an empty string, so a greeting never reads "Hi ,". */
export function firstNameOf(name, fallback = "there") {
  const first = str(name).split(/\s+/)[0];
  return first || fallback;
}

/** Only documents someone has approved — see the note above on why this is not "all documents". */
export function sendableDocuments(documents = []) {
  return documents.filter((d) => d?.url && d.approvalStatus === "approved");
}

/** The document block pasted into a body, one named link per line. Empty string when there are
 *  none, so a template referencing {{documents}} degrades to a blank rather than a stray header
 *  with nothing under it. */
export function documentBlock(documents = []) {
  const ok = sendableDocuments(documents);
  if (!ok.length) return "";
  return ok.map((d) => `• ${d.name}${d.format ? ` (${String(d.format).toUpperCase()})` : ""}\n  ${d.url}`).join("\n");
}

/**
 * Resolve every token for one recipient. Unknown {{tokens}} are left ALONE deliberately: silently
 * blanking one would hide a typo in the template, and a visible {{tpyo}} in the preview is what
 * gets it fixed before anything is sent.
 */
export function resolveTemplate(text, { recipient = {}, campaign = {}, documents = [], sender = "" } = {}) {
  const map = {
    // Name only — never the email. Falling back to the address produces "Hi mcannillo@ace...,"
    // which reads worse than the generic greeting it was meant to avoid.
    "{{first_name}}": firstNameOf(recipient.name),
    "{{name}}": str(recipient.name) || str(recipient.email),
    "{{company}}": str(recipient.company) || str(campaign.audience?.repsFrom) || "",
    "{{campaign}}": str(campaign.name),
    "{{documents}}": documentBlock(documents),
    "{{sender}}": str(sender),
  };
  return String(text || "").replace(/\{\{[a-z_]+\}\}/gi, (m) => (m.toLowerCase() in map ? map[m.toLowerCase()] : m));
}

/**
 * The fallback body, used when the campaign has no posted email copy yet.
 *
 * Deliberately plain and obviously a starting point rather than polished prose: copy that reads
 * finished is copy nobody edits, and this one is NOT the approved script. The real body should
 * come from a posted `email-campaign` piece in Content & approvals.
 */
export const DEFAULT_TEMPLATE = {
  subject: "{{campaign}}",
  body: [
    "Hi {{first_name}},",
    "",
    "",
    "",
    "{{documents}}",
    "",
    "Best,",
    "{{sender}}",
  ].join("\n"),
};

/** Posted email copy this campaign owns — the script the merge draws from. The category/status
 *  readers are injected rather than imported so this module stays free of the content store. */
export function emailScripts(contentItems = [], { entryCategory, entryStatus }) {
  return (contentItems || []).filter((s) =>
    entryCategory(s) === "email-campaign" && entryStatus(s) === "posted" && str(s.body));
}

/**
 * Build one draft. Returns the resolved subject/body plus what was withheld, so the UI can say
 * "3 documents, 1 not approved" instead of quietly sending fewer than the campaign holds.
 */
export function buildDraft({ recipient, campaign, documents = [], template = DEFAULT_TEMPLATE, sender = "" }) {
  const ctx = { recipient, campaign, documents, sender };
  const approved = sendableDocuments(documents);
  return {
    to: str(recipient?.email),
    subject: resolveTemplate(template.subject || "", ctx),
    body: resolveTemplate(template.body || "", ctx),
    documentCount: approved.length,
    withheldCount: documents.filter((d) => d?.url).length - approved.length,
  };
}
