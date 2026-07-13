# Client Data Requests — Cut & Wrap (2026-07-09)

**Source:** `MT Assortment Cut nWrap FW.pdf` · **Owner:** Rick (retrieving during operate-while-build)
**Supersedes:** `STEFANO_QUEUE_2026-07-09.md` — personal name retired; requests now routed by client-side function.

While we build, Rick is pulling all of this himself. It's grouped by the **client-side function** that owns
each answer so it can be batched to the right counterpart and kept clean in the records. Async — send each
bucket as one batch, don't block on it. Nothing below is guessed into the Media Hub; each item blocks a
specific record.

## Role map
- **Marketing** — images/packshots, email campaigns
- **Sales Management** — pricing (list, class-of-trade, freight terms)
- **Inventory Manager** — item master (item #s, UPCs, pack/size, pallet spec) + availability
- **Traffic** — inbound/outbound shipments (replenishment POs, customer orders, samples, UPS/FedEx)

---

## Inventory Manager — item master + availability

**Missing item numbers**
- [ ] **Aged Black Truffle** (7 oz EW, vacuum pack) — no item # on the sheet. Assign?
- [ ] **Vezzena, aged min. 5 mo** (7 oz EW) — no item #. Is it `04182`? UPC `857594000189` is listed but unassigned.
- [ ] **Naturally Smoked Provolone — Disc vs Wedge** both print `01174` / UPC `857594000103`. Need the Disc's own item # and UPC.

**Conflicts to resolve (both live; only one should be)**
- [ ] **Asiago Vecchio 9 mo** — sheet `03047` vs availability `03073`. Which is live?
- [ ] **Imbriago Drunken** — sheet `40176` vs our list + Cloudinary packshot `04176`. Confirm transposed digit.
- [ ] **Duplicate UPC `857594000158`** on both `03047` Asiago Vecchio and Aged Black Truffle. Which owns it?

**Missing UPCs**
- [ ] **Italian Classics** — `05050` Grana Padano, `05099` Parmigiano Reggiano, `40162` Pecorino Romano, `40163` Ricotta Salata, `40086` Montasio. Do these carry piece UPCs?

**Availability sheet gaps**
- [ ] No rows for `03047`, `05050`, `05099`, `40162` — can't surface in the inventory app until they're on the sheet. (Sheet does carry `03073` — see the Asiago conflict above.)

**Food-service list — identity / pack spec**
- [ ] Confirm the **eleven** newly added items are still active at their printed EXW prices: `01401` shredded sharp provolone, `05123` grana grated, `05124`/`05205`/`05211` grana flakes, `20437`/`20439`/`20440`/`20441` cacio provolone cylinders, `20569` Bianco Duro d'Italia, `20717` Bianco Duro d'Europa.
- [ ] **`01314` printed twice** — "Bruschetta cheese diced 2 lb" @ $7.08 and "Sharp Provolone diced 5 lb" @ $7.34. Which product owns `01314`? *(Held back — nothing for 01314 is in the app yet.)*
- [ ] `01314` bruschetta lists Net Cs Weight = 2 lb for 8 × 2 lb bags. Should that be 16 lb?
- [ ] `20437`/`20439`/`20440`/`20441` show Ti×Hi 6×12 / 7×12 / 8×12 / 9×12 but all say 72 cases/pallet. Only 6×12 = 72. Which Ti×Hi is right? *(feeds Traffic once confirmed — pallet build)*

## Sales Management — pricing
- [ ] **Cut & Wrap line has no price anywhere:** none of the 17 C&W 7 oz exact-weight wedges carry a price (currently "price on request" in the app). Need **EXW Elizabeth NJ $/lb** for each.
- *Note:* the eleven food-service items above are already live at printed EXW prices — no pricing action there, just the active-status confirm (Inventory). Class-of-trade % alignment remains open in `BACKLOG.md` (Sales, blocked on real numbers).

## Marketing — images
- [ ] **Hi-res packshots** (2000 px min, white/transparent bg) for the 13 C&W items with no usable image: `03044`, `03047`, `01101`, `01190`, `01174` (Wedge + Disc), `04165`, `05050`, `05099`, `40162`, `40163`, `40086`, Aged Black Truffle, Vezzena 7 oz EW.
- [ ] **Flag:** `03044` and `03047` use the identical photo in the sheet — at least one shows the wrong product. Confirm correct images.
- Visual checklist: `src/data/montitrentini/source/cut-and-wrap-thumbnails/`

## Traffic — shipments
No open items in this batch. Reserved for replenishment POs, customer orders, samples, and UPS/FedEx packages.
*(The pallet Ti×Hi confirmation above feeds pallet-build here once Inventory resolves it.)*

---

## Already covered — no action
`02091`, `20423`, `20424`, `20480`, `20481`, `04176` all have hi-res packshots in Cloudinary.
