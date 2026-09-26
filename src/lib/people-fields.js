/* The people-spine vocabularies — ONE definition, shared by the UI and the HubSpot push.
 *
 * WHY THIS FILE EXISTS. These five properties live in HubSpot (docs/PEOPLE_DATA_OWNERSHIP.md:
 * "HubSpot is the organizer"). The app captures them at the point of work and promotes them.
 * That means the option strings appear in at least two places — the picker Rick clicks and the
 * payload crm-push sends — and if those two ever disagree, HubSpot rejects the write or, worse,
 * accepts a value nothing can filter on.
 *
 * They were retyped by hand once already. On 2026-09-25 the five properties were built in the
 * HubSpot UI and FOUR option strings drifted on the first attempt: `FLorida`, `South East`, `REP`,
 * and an option stored as `Not a fit` while displaying as `Lost`. All four had to be deleted and
 * rebuilt, because a HubSpot option's internal value is WRITE-ONCE. Defining the lists twice in
 * code would reintroduce exactly that failure, so they are defined here and imported everywhere.
 *
 * THE VALUES BELOW ARE THE AS-BUILT ONES, verified against the live portal by API on 2026-09-26.
 * They are not the values in the original spec — Rick split `Philadelphia / PA` and
 * `Southeast / FL` while building, which is better, and used `Mid-Atlantic` and `FL`. What is
 * here is what HubSpot actually stores. If you "correct" a spelling here without changing the
 * HubSpot option, you break the write. Canonical record: docs/HUBSPOT_PROPERTY_SPEC.md.
 *
 * scripts/test-people-fields.mjs asserts the two TERRITORY lists are identical, which is the one
 * mismatch that fails silently rather than loudly (see the note on TERRITORY below).
 */

/** Company.relationship — what this account is to us RIGHT NOW.
 *  Distinct from OUTREACH_STAGE: an account can be `Won` in the funnel and `Active customer`
 *  here. This is the field that decides whether an account's email traffic is operational or
 *  CRM-relevant. Never inferred from touch counts (guardrail 2). */
export const RELATIONSHIP = ["Prospect", "Active customer", "Dormant", "Lost"];

/** Company.outreach_stage — position in the prospecting funnel.
 *  `Lost` and `Not a fit` are SEPARATE: a deal you lost is not an account that was never a fit.
 *  Collapsing them is why this property had to be rebuilt on 2026-09-25. */
export const OUTREACH_STAGE = ["New", "Emailed", "Replied", "Meeting", "Won", "Lost", "Not a fit"];

/** Contact.contact_role — what this person does in the relationship.
 *  `Rep` means a distributor's salesperson who sells on Monti's behalf. Campaign Manager routing
 *  depends on that distinction. Note the capitalization: `Rep`, not `REP`. */
export const CONTACT_ROLE = ["Buyer", "Rep", "Owner", "Operations", "Other"];

/** territory — on BOTH Company and Contact, and the two lists must stay identical.
 *
 *  THIS IS THE ONE THAT FAILS SILENTLY. The rep-to-account join is a plain string match: if a
 *  Company says `Southeast` and a Contact says `South East`, nothing errors. The join simply
 *  returns nothing, forever, and the Move List looks empty rather than broken. That exact typo
 *  (`Southeas`, missing its final t) was caught by API verification mid-rebuild on 2026-09-25.
 *
 *  Multi-select on both objects, because crossover is normal (ADR-002) — an account can be
 *  covered by reps in two territories. */
export const TERRITORY = [
  "NY Metro",
  "New Jersey",
  "Philadelphia",
  "PA",
  "New England",
  "Upstate NY",
  "Mid-Atlantic",
  "Southeast",
  "FL",
  "National",
];

/** HubSpot internal property names. Kept here so a rename is one edit, not a grep.
 *  crm-hubspot.js:24 already has its own CONTACT_ROLE_PROPERTY constant predating this file;
 *  they must agree. The test asserts it. */
export const PROPERTY = {
  relationship: "relationship",
  outreachStage: "outreach_stage",
  contactRole: "contact_role",
  territory: "territory",
};

/** HubSpot serialises a multiple-checkbox property as a SEMICOLON-separated string, not an array
 *  and not a comma list. Values containing a semicolon would corrupt the field, so they are
 *  dropped rather than silently mangled — none of the ten contain one, and a future value that
 *  does is a bug to catch at the source. */
export function serializeMulti(values) {
  if (!Array.isArray(values)) return "";
  return values
    .filter((v) => typeof v === "string" && v && !v.includes(";"))
    .join(";");
}

/** Parse HubSpot's semicolon string back to an array. Tolerates the empty/absent case. */
export function parseMulti(value) {
  if (typeof value !== "string" || !value) return [];
  return value.split(";").map((v) => v.trim()).filter(Boolean);
}

/** True when every value is in the allowed list. Used to refuse a write rather than let HubSpot
 *  reject it downstream with a less legible error. */
export function allValid(values, allowed) {
  if (!Array.isArray(values)) return false;
  return values.every((v) => allowed.includes(v));
}
