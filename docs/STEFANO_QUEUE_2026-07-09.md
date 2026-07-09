# Stefano — Cut & Wrap sheet questions (2026-07-09)

Queued from `MT Assortment Cut nWrap FW.pdf`. Async — send as one batch, don't wait on it.
Nothing below is guessed into the Media Hub; each blocks a specific item record.

## A. Item numbers we don't have

1. **AGED BLACK TRUFFLE** (7 oz EW, vacuum pack) has no item number on the sheet. What is it?
2. **NATURALLY SMOKED PROVOLONE — Disc** and **— Wedge** both print as `01174`, with the same
   UPC `857594000103`. Two different products. What is the Disc's item number and UPC?
3. **VEZZENA, aged min. 5 months** (7 oz EW) has no item number. Is it `04182`?
   UPC `857594000189` is listed but unassigned.

## B. Item numbers that conflict with our records

4. **Asiago Vecchio, 9 months.** Sheet says `03047`. Our availability list says `03073`.
   Which is live? (Both are currently in the system; only one should be.)
5. **Imbriago Drunken Cheese.** Sheet says `40176`. Our list and the Cloudinary packshot both
   say `04176`. Assuming the sheet has a transposed digit — confirm.
6. **UPC `857594000158`** appears twice: on `03047` Asiago Vecchio and on Aged Black Truffle.
   One is a copy-paste. Which item owns it?

## C. Missing UPCs

7. No UPC on any Italian Classic item: `05050` Grana Padano, `05099` Parmigiano Reggiano,
   `40162` Pecorino Romano, `40163` Ricotta Salata, `40086` Montasio. Do these carry piece UPCs?

## D. Hi-res packshots — the real ask

The photos embedded in the C&W sheet are 116×111 to 331×210 px. Unusable for the trade portal,
sell sheets, or print. **13 of the 20 C&W items have no usable image anywhere.**

Need originals (2000 px minimum, white or transparent background) for:

| Item | Product |
|---|---|
| 03044 | Aged Asiago PDO, 5 months |
| 03047 | Asiago Vecchio PDO, 9 months |
| 01101 | Sharp Provolone |
| 01190 | Mild Provolone |
| 01174 | Naturally Smoked Provolone — Wedge **and** Disc |
| 04165 | Lagorai |
| 05050 | Grana Padano PDO |
| 05099 | Parmigiano Reggiano DOP |
| 40162 | Pecorino Romano PDO |
| 40163 | Ricotta Salata |
| 40086 | Montasio PDO |
| — | Aged Black Truffle |
| — | Vezzena 7 oz EW |

Visual checklist for this ask: `src/data/montitrentini/source/cut-and-wrap-thumbnails/`

**Also flag:** `03044` and `03047` use the *identical photograph* in the sheet. At least one is
showing the wrong product.

## E. Pricing — the C&W line has no price anywhere

8. **None of the 17 Cut & Wrap 7 oz exact-weight wedges carry a price** in the 2026-03 food
   service list, or in the 2026-03 ALL PRODUCTS list that catalog.json was built from. They are
   in the app as *price on request*. What is the EXW Elizabeth NJ $/lb for each?

## F. Availability sheet — 4 items missing

9. The 2026-07-09 availability sheet has no rows for `03047`, `05050`, `05099`, `40162`.
   They can't appear in the inventory app until they're on the sheet. (It does carry `03073`
   — see question 4.)

## G. Food-service price list — items we've never seen

10. Twelve items on the food-service list weren't in our catalog at all:
    `01401` shredded sharp provolone, `05123` grana grated, `05124` / `05205` / `05211` grana
    flakes, `20437` / `20439` / `20440` / `20441` cacio provolone cylinders, `20569` Bianco Duro
    d'Italia, `20717` Bianco Duro d'Europa, `01314` bruschetta cheese.
    **Eleven are now live at their printed EXW prices.** Confirm all eleven are still active.
11. **`01314` is printed twice** — once as "Bruschetta cheese diced bags 2 lbs" at $7.08, once as
    "Sharp Provolone diced bags 5 lbs" at $7.34. Which product owns 01314?
    **This is the one item held back.** Nothing for 01314 exists in the app.
12. `01314` bruschetta lists Net Cs Weight = 2 lb for 8 × 2 lb bags. Should that be 16 lb?
13. `20437` / `20440` / `20439` / `20441` show pallet Ti×Hi of 6x12 / 7x12 / 8x12 / 9x12 but all
    say 72 cases per pallet. Only 6×12 = 72. Which Ti×Hi is right?

## Already covered — no action

`02091`, `20423`, `20424`, `20480`, `20481`, `04176` all have hi-res packshots in Cloudinary.
