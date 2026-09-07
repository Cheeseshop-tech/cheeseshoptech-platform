# Future: operations backbone — manufacturing, inventory, replenishment, traffic, logistics

**Status: inventory sync is real. Everything else here is zero code, not even scoped.**

## What's real

Inventory sync (availability sheet → `inventory.json` via `scripts/sync-inventory.mjs`) is live
via Netlify Blobs — no rebuild needed on weekly updates. It has had real gaps: an unconfirmed
sync-registration issue as of 2026-08-12, and a SKU mismatch incident (05417 vs 05018) with no
cross-check mechanism between the inventory feed and `catalog.json`. See
`../monti-inventory-sync.md` and `../monti-inventory-pricing-app-gap.md` in project memory.

## What's not started

- **Manufacturing**: no integration surface defined, no data model.
- **Replenishment**: no logic exists to trigger a reorder or flag a stock-out risk. Would need to
  build on top of the existing inventory sync, not replace it.
- **Traffic**: freight/trucking cost inputs exist as manual line items in the quoting tool
  (`../quoting-tool-principles.md`: $135/1500lb + $300 trucking floor) but there's no traffic
  management system — no carrier selection, routing, or scheduling logic anywhere.
- **Logistics**: zero code footprint. Not addressed in any existing spec doc.

## Why this is its own doc, not folded into e-commerce

Rick's original brain-dump connected "manufacturing, inventory, replenishment, traffic, logistics"
to the self-redesigning storefront in one breath, but they're a different kind of system —
operational/backend, not customer-facing — and depend on real vendor/logistics-partner
integrations that haven't been identified yet, let alone built. Treat this as its own workstream
so it doesn't get silently absorbed into the storefront scope and under-resourced.

## What would need to happen before this is buildable

1. Identify which of these Monti Trentini actually needs first — this list is aspirational
   platform scope, not a Monti-specific requirement yet. Don't build ahead of a real need.
2. A decision on whether any of this is CST's problem to solve in-house versus integrating a
   third-party operations/logistics platform (e.g., an ERP or 3PL API) — likely the latter for
   most of this list, given the specialty/perishable-food complexity involved.

## Status: idea, not scoped. No next concrete action exists yet.
