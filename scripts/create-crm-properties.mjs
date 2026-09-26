/* Create the five people-spine properties in HubSpot.
 *
 * Contract: docs/PEOPLE_DATA_OWNERSHIP.md. Run via "CREATE CRM PROPERTIES.command".
 *
 * WHY A SCRIPT AND NOT THE HUBSPOT UI. HubSpot derives a property's INTERNAL NAME from the label
 * you type, and the app's code reads internal names. Creating these by hand once already went
 * wrong — the Channel property was built with all five values collapsed into ONE option and had
 * to be rebuilt (2026-06-15). This sets `name` explicitly, so what the code expects and what
 * HubSpot stores cannot drift apart.
 *
 * SAFE TO RE-RUN. Every property is checked first; existing ones are reported and skipped, never
 * overwritten. It creates fields — it never touches a record.
 *
 * REQUIRES two scopes the private app does not have by default:
 *   crm.schemas.companies.write   crm.schemas.contacts.write
 * Add them in HubSpot → Settings → Integrations → Private Apps → Scopes → Commit changes.
 */
const TOKEN = process.env.HUBSPOT_TOKEN;
if (!TOKEN) { console.error("\n  No token supplied. Aborting — nothing was changed.\n"); process.exit(1); }

const HS = "https://api.hubapi.com";
const opts = (labels) => labels.map((label, i) => ({ label, value: label, displayOrder: i, hidden: false }));

// Territory vocabulary. The SAME list must exist on Company and Contact — the rep→account join is
// a string match, so "New England" on a rep and "New England " on an account will not join.
// Ten values, matching what was actually built in HubSpot on 2026-09-25 and verified by API.
// Philadelphia/PA and Southeast/FL are SEPARATE options, not compound ones.
const TERRITORIES = [
  "NY Metro", "New Jersey", "Philadelphia", "PA", "New England",
  "Upstate NY", "Mid-Atlantic", "Southeast", "FL", "National",
];

const PLAN = [
  {
    object: "companies", group: "companyinformation",
    name: "relationship", label: "Relationship", type: "enumeration", fieldType: "select",
    description: "What this account is to us RIGHT NOW. Distinct from Outreach stage, which is where a sales process got to. An account can be Won in the funnel and Active customer here. This field decides whether its email traffic is operational or CRM-relevant.",
    options: opts(["Prospect", "Active customer", "Dormant", "Lost"]),
  },
  {
    object: "companies", group: "companyinformation",
    name: "outreach_stage", label: "Outreach stage", type: "enumeration", fieldType: "select",
    description: "Prospecting funnel position. Same seven values the app has used since the CRM console was built, so existing values migrate unchanged.",
    options: opts(["New", "Emailed", "Replied", "Meeting", "Won", "Lost", "Not a fit"]),
  },
  {
    object: "companies", group: "companyinformation",
    name: "territory", label: "Territory", type: "enumeration", fieldType: "checkbox",
    description: "Which named area(s) this account sits in. Multi-select because crossover is normal (ADR-002) — an account can be covered by reps in two territories.",
    options: opts(TERRITORIES),
  },
  {
    object: "contacts", group: "contactinformation",
    name: "contact_role", label: "Contact role", type: "enumeration", fieldType: "select",
    description: "What this person does in the relationship. 'Rep' means a distributor's salesperson who sells on Monti's behalf — the distinction Campaign Manager routing depends on.",
    options: opts(["Buyer", "Rep", "Owner", "Operations", "Other"]),
  },
  {
    object: "contacts", group: "contactinformation",
    name: "territory", label: "Territory", type: "enumeration", fieldType: "checkbox",
    description: "For Reps: which area(s) they cover. Same vocabulary as the Company Territory property — the join is a string match.",
    options: opts(TERRITORIES),
  },
];

const hs = async (path, init = {}) => {
  const r = await fetch(HS + path, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, "content-type": "application/json", ...(init.headers || {}) },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  });
  const text = await r.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: r.status, ok: r.ok, body };
};

console.log("\n  Contract: docs/PEOPLE_DATA_OWNERSHIP.md");
console.log("  Creating 5 properties. Existing ones are skipped, never overwritten.\n");

let created = 0, existed = 0, failed = 0;

for (const p of PLAN) {
  const tag = `${p.object.padEnd(9)} ${p.name}`;
  const check = await hs(`/crm/v3/properties/${p.object}/${p.name}`);

  if (check.status === 200) {
    const live = (check.body.options || []).map((o) => o.label);
    const want = p.options.map((o) => o.label);
    const same = live.length === want.length && live.every((l, i) => l === want[i]);
    console.log(`  = ${tag}  already exists${same ? "" : `  ⚠ OPTIONS DIFFER — live: ${live.join(" / ") || "(none)"}`}`);
    existed++;
    continue;
  }
  if (check.status !== 404) {
    // 403 here is the scope problem, and it is worth naming precisely rather than retrying.
    console.log(`  x ${tag}  cannot read property (${check.status}) — ${JSON.stringify(check.body).slice(0, 160)}`);
    if (check.status === 403) {
      console.log("      -> the token lacks crm.schemas.*.read/write. Add both scopes and Commit changes.");
    }
    failed++;
    continue;
  }

  const res = await hs(`/crm/v3/properties/${p.object}`, {
    method: "POST",
    body: {
      name: p.name, label: p.label, description: p.description,
      groupName: p.group, type: p.type, fieldType: p.fieldType,
      options: p.options, formField: false,
    },
  });
  if (res.ok) {
    console.log(`  + ${tag}  CREATED  (${p.fieldType}, ${p.options.length} options)`);
    created++;
  } else {
    console.log(`  x ${tag}  FAILED ${res.status} — ${JSON.stringify(res.body).slice(0, 220)}`);
    failed++;
  }
}

console.log(`\n  created ${created} · already existed ${existed} · failed ${failed}\n`);

if (!failed) {
  console.log("  Verifying what HubSpot actually stored:\n");
  for (const p of PLAN) {
    const v = await hs(`/crm/v3/properties/${p.object}/${p.name}`);
    if (v.status === 200) {
      console.log(`    ${p.object.padEnd(9)} ${v.body.name.padEnd(15)} ${String(v.body.fieldType).padEnd(9)} ${(v.body.options || []).map((o) => o.label).join(" · ")}`);
    }
  }
  console.log("\n  Next: mark Relationship on the ~20 accounts that generate email traffic.");
  console.log("  Ask Claude for the ranked shortlist — do not do all 748.\n");
}
process.exit(failed ? 1 : 0);
