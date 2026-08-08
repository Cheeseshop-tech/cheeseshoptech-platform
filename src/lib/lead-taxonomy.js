// Lead & account classification — THE canonical vocabulary.
// Rationale, term standardization, and the HubSpot setup steps: docs/LEAD_TAXONOMY.md
//
// Three fields across two objects, because a single "lead class" list conflates three questions:
//
//   COMPANY  Channel        coarse route to market (exists in HubSpot, 189 records tagged)
//   COMPANY  Business Type  what the business IS            <- new
//   CONTACT  Contact Role   what the PERSON does            <- new
//
// A Distributor Sales Rep is a PERSON at a Distributor — both facts are true at once and they
// belong on different objects. Flattening them into one dropdown makes "every supermarket in NJ"
// unanswerable, because half the records carry a job role instead of a business.
//
// ⚠️ "Class of trade" is NOT this. That term is already load-bearing: it's the pricing tier in
// client.config.json (Wholesale +0% / Direct to Retail +15% / DTC +35%) and it prints on every
// proforma. Keep the vocabularies apart or a business type will eventually reach a price
// calculation. A Cheese Shop is USUALLY quoted Direct to Retail — usually, not always, which is
// exactly why they are separate fields.

/** Company `channel` — the existing HubSpot property. First five are already populated; the last
 *  two are additions. Every business type below rolls up to exactly one of these. */
export const CHANNELS = [
  "Retail chain",
  "Specialty grocer",
  "Restaurant / Chef",
  "Distributor",
  "Partner / Producer",
  "E-commerce",      // new
  "Media / Press",   // new
];

/**
 * Company `business_type`, grouped by the channel it belongs to.
 *
 * "Foodservice" is deliberately NOT here: it isn't a business type, it's the channel group
 * covering Restaurant, Hotel and Institutional. As a type it would overlap four others and
 * become the bucket everything gets dumped into. Filter foodservice by CHANNEL instead.
 */
export const BUSINESS_TYPES = [
  { key: "supermarket",        label: "Supermarket / Grocery Chain", channel: "Retail chain",       note: "Multi-store banner" },
  { key: "club-mass",          label: "Club / Mass Retailer",        channel: "Retail chain",       note: "Costco, BJ's — different buying cycle" },
  { key: "independent-grocer", label: "Independent Grocer",          channel: "Specialty grocer",   note: "Single-store, full-line" },
  { key: "gourmet-market",     label: "Gourmet / Specialty Market",  channel: "Specialty grocer",   note: "“Boutique grocery” in standard terms" },
  { key: "cheese-shop",        label: "Cheese Shop",                 channel: "Specialty grocer",   note: "Cheesemonger — the core account" },
  { key: "delicatessen",       label: "Delicatessen",                channel: "Specialty grocer",   note: "Deli counter / prepared foods" },
  { key: "restaurant-ind",     label: "Restaurant — Independent",    channel: "Restaurant / Chef",  note: "Chef-driven, 1–2 units" },
  { key: "restaurant-chain",   label: "Restaurant — Chain / Group",  channel: "Restaurant / Chef",  note: "Multi-unit; different decision path" },
  { key: "hotel-caterer",      label: "Hotel / Resort / Caterer",    channel: "Restaurant / Chef",  note: "Banquet and event volume" },
  { key: "institutional",      label: "Institutional",               channel: "Restaurant / Chef",  note: "School, healthcare, corporate dining" },
  { key: "broadline",          label: "Broadline Distributor",       channel: "Distributor",        note: "Full-line (Sysco, US Foods, ACE Endico)" },
  { key: "specialty-dist",     label: "Specialty / Gourmet Distributor", channel: "Distributor",    note: "Cheese and specialty focused" },
  { key: "importer",           label: "Importer / Wholesaler",       channel: "Distributor",        note: "Brings product in, sells on" },
  { key: "brokerage",          label: "Brokerage",                   channel: "Distributor",        note: "Represents brands; doesn't take title" },
  { key: "dtc-retailer",       label: "Online Retailer / DTC",       channel: "E-commerce",         note: "Sells direct to consumers online" },
  { key: "marketplace",        label: "Marketplace",                 channel: "E-commerce",         note: "Amazon, Goldbelly — platform, not merchant" },
  { key: "media-outlet",       label: "Media Outlet",                channel: "Media / Press",      note: "Publication, blog, podcast, TV" },
  { key: "producer",           label: "Producer / Supplier",         channel: "Partner / Producer", note: "Upstream partner, not a customer" },
];

/**
 * Contact `contact_role` — what the PERSON does.
 *
 * `multiplier: true` marks someone who sells *your* product to *their* customers rather than
 * buying it themselves. One DSR or broker relationship can open dozens of accounts, so they are
 * reported separately: counting them as leads inflates the number and hides the better one.
 */
export const CONTACT_ROLES = [
  { key: "buyer",       label: "Buyer / Category Manager",   note: "The decision-maker at retail and distribution" },
  { key: "owner",       label: "Owner / Principal",          note: "Decision-maker at an independent" },
  { key: "chef",        label: "Chef / Culinary",            note: "Specs product; often can't purchase" },
  { key: "manager",     label: "Store / Department Manager", note: "Cheese or deli counter lead" },
  { key: "dsr",         label: "Distributor Sales Rep (DSR)", note: "Sells your product to their customers", multiplier: true },
  { key: "broker",      label: "Broker",                     note: "Represents the brand into accounts", multiplier: true },
  { key: "journalist",  label: "Journalist / Writer",        note: "Editorial coverage (“press”, as a person)", multiplier: true },
  { key: "influencer",  label: "Influencer / Creator",       note: "Social/content coverage", multiplier: true },
  { key: "other",       label: "Other",                      note: "Escape hatch — review what lands here quarterly" },
];

const bt = new Map(BUSINESS_TYPES.map((t) => [t.key, t]));
const cr = new Map(CONTACT_ROLES.map((r) => [r.key, r]));

export const businessType = (key) => bt.get(key) || null;
export const contactRole = (key) => cr.get(key) || null;
export const businessTypeLabel = (key) => bt.get(key)?.label || "";
export const contactRoleLabel = (key) => cr.get(key)?.label || "";

/** The channel a business type rolls up to — so a rep only ever picks the specific one. */
export const channelForBusinessType = (key) => bt.get(key)?.channel || "";

/** True when this role opens doors rather than buying — used to report them apart from customers. */
export const isMultiplierRole = (key) => !!cr.get(key)?.multiplier;

/** Business types grouped by channel, for rendering an <optgroup> picker. */
export function businessTypesByChannel() {
  const out = new Map();
  for (const t of BUSINESS_TYPES) {
    if (!out.has(t.channel)) out.set(t.channel, []);
    out.get(t.channel).push(t);
  }
  return [...out.entries()];
}

/**
 * Best-guess business type from a HubSpot `channel` value, for seeding a picker from an existing
 * account. Deliberately conservative: it only guesses where a channel maps to ONE obvious type.
 * "Specialty grocer" splits four ways, so it returns nothing there rather than picking wrong —
 * a blank the rep fills is better than a confident mislabel they don't notice.
 */
export function guessBusinessType(channel) {
  const map = {
    "Retail chain": "supermarket",
    "Distributor": "broadline",
    "Restaurant / Chef": "restaurant-ind",
    "Partner / Producer": "producer",
    "Media / Press": "media-outlet",
  };
  return map[String(channel || "").trim()] || "";
}
