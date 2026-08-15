# Auto-update the "Updated on:" banner — handoff to Stefano's team

**Status:** not installed, deliberately on hold. Requires Editor access on the Drive file,
which is scoped to `montitrentini-usa.com` (domain) + owner `order@montitrentini-usa.com`.
Rick's connected account is not in that permission list. Rick's call (2026-08-13): hold this
until **Cecilia** is back from maternity leave rather than routing it through Stefano now.

**Why:** the "Updated on:" banner (cell I1 label / J1 value) is hand-typed today. It has
drifted stale before — on 2026-07-25 it read a date 3 days in the future, and as of
2026-08-13 it's showing 2026-08-07, six days behind the sheet's real last edit. The
`monti-inventory-watch` scheduled task already works around this by trusting Google Drive's
`modifiedTime` instead of the banner — that safety net stays regardless of whether this
script gets installed. This script just makes the banner itself trustworthy for anyone
eyeballing the raw sheet.

## Install steps (needs Editor access on the sheet)

1. Open the sheet: "Availability of items and pending orders"
   (fileId `1meZQQ_0dA1S1IR5xjVWzFvuqCJE6DLgVd-fOfSMGvCk`)
2. Extensions → Apps Script
3. Replace the default code with the script below, save.
4. No further setup needed — `onEdit` simple triggers run automatically, no authorization
   prompt, as long as the script only uses built-in services (it does).

```javascript
function onEdit(e) {
  var range = e.range;
  var sheet = range.getSheet();

  // Avoid re-triggering when the script itself writes to J1.
  if (range.getA1Notation() === 'J1') return;

  var stampCell = sheet.getRange('J1'); // "Updated on:" value cell (label is in I1)
  var now = new Date();
  stampCell.setValue(
    Utilities.formatDate(now, Session.getScriptTimeZone(), 'M/d/yyyy h:mm a')
  );
}
```

## What this does

- Any edit to any cell on the sheet updates J1 to the real edit timestamp, automatically.
- Removes the manual step of someone typing the date — which is what caused the drift.
- Does not touch the CSV export or the app pipeline — those keep working exactly as they
  do today.

## What this does NOT change

- `scripts/sync-inventory.mjs` keeps using Google Drive's `modifiedTime` as the source of
  truth for `lastUpdated`, not this banner. That stays as the safety net even after this
  is installed — a script can be deleted, disabled, or fail silently, and Drive's own
  timestamp can't be.
