// Call-note history, rendered the same way everywhere it appears.
//
// ONE COMPONENT ON PURPOSE. This repo already carries three independent SKU→photo resolvers
// because the same job got re-implemented per surface (see CLAUDE.md's TRIGGER block). Call notes
// now surface in two places — the enrichment console where they are captured, and the CRM account
// drawer where they are looked up later — so they get one renderer from the start rather than a
// second implementation to reconcile in three months.
//
// Data shape comes from netlify/functions/campaign-enrichment.js:
//   notes = [{ at, text, campaignId?, outcome? }]   oldest first, newest last, capped at 25
// `note` (the single latest string) is the legacy field and is still the one every OTHER reader
// uses — enrichmentCsv(), the crm-push rows. This component reads the history and falls back to
// the single note when an entry predates the history (nothing is ever blank just because it is old).

import { Badge } from "@/components/ui/badge.jsx";

const fmt = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

/** Normalise an enrichment entry into a newest-first list, tolerating the pre-history shape. */
export function notesOf(entry) {
  if (!entry) return [];
  if (Array.isArray(entry.notes) && entry.notes.length) {
    return entry.notes.filter((n) => n?.text).slice().reverse();
  }
  // Entry saved before note history shipped: show the single note rather than an empty log.
  return entry.note ? [{ at: entry.calledAt || "", text: entry.note, outcome: entry.outcome }] : [];
}

/**
 * @param entry    the enrichment record for one company
 * @param empty    what to say when there are no notes at all
 * @param max      cap the rendered list (the log itself keeps 25)
 */
export function NoteLog({ entry, empty = "No call notes yet.", max = 25 }) {
  const notes = notesOf(entry);
  if (!notes.length) return <p className="text-xs text-fg-muted">{empty}</p>;

  const shown = notes.slice(0, max);
  return (
    <div className="grid gap-2">
      {shown.map((n, i) => (
        <div key={`${n.at || "na"}-${i}`} className="rounded-base border border-border bg-bg p-2">
          <div className="mb-1 flex items-center gap-2">
            {/* The newest note is the one the old single-value field used to hold — flag it so a
                reader knows which line HubSpot and the CSV export would carry. */}
            {i === 0 && <Badge variant="outline">Latest</Badge>}
            {n.at && <span className="text-xs text-fg-muted">{fmt(n.at)}</span>}
            {n.outcome && <span className="text-xs text-fg-muted">· {n.outcome.replace(/-/g, " ")}</span>}
          </div>
          <p className="whitespace-pre-wrap text-sm text-fg">{n.text}</p>
        </div>
      ))}
      {notes.length > shown.length && (
        <p className="text-xs text-fg-muted">+{notes.length - shown.length} older</p>
      )}
    </div>
  );
}
