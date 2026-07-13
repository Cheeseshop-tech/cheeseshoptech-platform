# Client-Side Data Roles — routing convention

**Owner:** Rick Posada · **Status:** Convention · **Updated:** 2026-07-09

How we route client-side data requests and integration touchpoints — **by function, not by personal name.**
Applies to all tenants (Monti Trentini first). While operating during the build, Rick fills these functions
himself; the buckets exist to batch each question to the right counterpart and keep the records clean.

| Function | Owns | Typical requests |
|---|---|---|
| **Marketing** | Brand images/packshots, email campaigns | Hi-res product photography, approved image kits, campaign copy/assets |
| **Sales Management** | Pricing | List prices, class-of-trade %s, freight terms, EXW $/lb |
| **Inventory Manager** | Item master + availability | Item #s, UPCs, pack/size, pallet spec, availability-sheet rows |
| **Traffic** | Inbound/outbound shipments | Replenishment POs, customer orders, samples, UPS/FedEx packages + tracking |

## Conventions
- **Retire personal names** in queues and specs; address by function above.
- New data-request docs are named `CLIENT_DATA_REQUESTS_<date>.md` and grouped by these functions.
- An item can surface in more than one function (e.g. pallet Ti×Hi is Inventory master data that then feeds
  Traffic's pallet build) — note the hand-off rather than duplicating the request.
