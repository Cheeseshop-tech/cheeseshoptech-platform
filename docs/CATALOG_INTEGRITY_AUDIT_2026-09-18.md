# Catalog integrity audit — montitrentini — 2026-09-18

Sources checked: item store (local items-seed.json snapshot, possibly stale), image manifest (src/data/montitrentini/images.json), pricing (src/data/montitrentini/catalog.json).

**123 items · 346 images (57 distinct codes) · 108 priced SKUs.**

Structural checks only — a script can tell you a link is missing or a SKU is a placeholder, not whether a linked photo is actually the right portion/format. For that, see docs/CUT_AND_WRAP_PORTION_RULE_2026-09-17.md's approach: look at the photos.

## High (69) — buyer-visible or data-loss risk
- No photo linked for item "20142" — "Caciotta (Basket Rind)".
- No photo linked for item "20229" — "Caciotta (Basket Rind, Small)".
- No photo linked for item "20282" — "Caciotta Herbs 6 Lbs (4x)".
- No photo linked for item "20313" — "Fioretto Stagionato Small Wheel".
- No photo linked for item "20437" — "Cacio Provolone".
- No photo linked for item "20438" — "Mild Provolone".
- No photo linked for item "20439" — "Cacio Provolone".
- No photo linked for item "20440" — "Cacio Provolone".
- No photo linked for item "20441" — "Cacio Provolone".
- No photo linked for item "20450" — "Bra Piemontese DOP".
- No photo linked for item "20451" — "Bra Piemontese DOP".
- No photo linked for item "20452" — "Toma Piemontese DOP".
- No photo linked for item "20453" — "Raschera Piemontese DOP".
- No photo linked for item "20464" — "Alta Badia Cheese".
- No photo linked for item "20511" — "Fontal Trentinella".
- No photo linked for item "20519" — "Gorgonzola DOP Mild".
- No photo linked for item "20520" — "Taleggio DOP".
- No photo linked for item "20533" — "Fioretto Stagionato with Truffle".
- No photo linked for item "20567" — "Castelmagno DOP".
- No photo linked for item "20569" — "Bianco Duro d'Italia".
- No photo linked for item "20579" — "Aged Black Truffle 7 Oz EW".
- No photo linked for item "20584" — "Stelvio Cheese DOP".
- No photo linked for item "20586" — "Lagrein".
- No photo linked for item "20700" — "Pecorino Siciliano Primosale".
- No photo linked for item "20701" — "Pecorino Siciliano Primosale".
- No photo linked for item "20702" — "Pecorino Siciliano Primosale".
- No photo linked for item "20703" — "Pecorino Siciliano Primosale".
- No photo linked for item "20717" — "Bianco Duro d'Europa".
- No photo linked for item "20719" — "Pecorino Siciliano Primosale".
- No photo linked for item "20720" — "Pecorino Siciliano Primosale".
- No photo linked for item "30009" — "Italian Cheese Flight Green".
- No photo linked for item "30010" — "Italian Cheese Flight Yellow".
- No photo linked for item "30011" — "Italian Cheese Flight Red".
- No photo linked for item "40020" — "Montasio Cheese DOP".
- No photo linked for item "40086" — "Montasio PDO 7 Oz EW".
- No photo linked for item "40103" — "Pecorino Romano DOP".
- No photo linked for item "40104" — "Pecorino Romano DOP".
- No photo linked for item "40105" — "Pecorino Granglona Cheese".
- No photo linked for item "40130" — "Montasio Cheese DOP".
- No photo linked for item "40158" — "Piave Cheese DOP".
- No photo linked for item "40167" — "Pecorino Romano".
- No photo linked for item "40169" — "Ricotta Salata V.P.".
- No photo linked for item "40174" — "Pecorino Toscano DOP".
- No photo linked for item "40175" — "Pecorino Toscano DOP".
- No photo linked for item "10390000" — "Boneless Italian Dry Cured Ham Block".
- No photo linked for item "02302" — "Asiago Fresco DOP".
- No photo linked for item "04168" — "Fontal Trentinella".
- No photo linked for item "05012" — "Grana Padano".
- No photo linked for item "05124" — "Grana Padano".
- No photo linked for item "05018" — "Grana Padano Riserva".
- No photo linked for item "05095" — "Grana Padano Riserva".
- No photo linked for item "04145" — "Lagorai Cheese".
- No photo linked for item "01190" — "Provolone Mild Cheese 7 Oz EW".
- No photo linked for item "01186" — "Naturally Smoked Provolone".
- No photo linked for item "05025" — "Parmigiano Reggiano PDO".
- No photo linked for item "05033" — "Parmigiano Reggiano PDO".
- No photo linked for item "05034" — "Parmigiano Reggiano PDO".
- No photo linked for item "05600" — "Parmigiano Reggiano DOP Aged 18 Months 7 Oz EW".
- No photo linked for item "01032" — "Sharp Provolone".
- No photo linked for item "01126" — "Sharp Provolone".
- No photo linked for item "01154" — "Sharp Provolone".
- No photo linked for item "01401" — "Sharp Provolone".
- No photo linked for item "0001" — "Christmas Gift Box".
- No photo linked for item "01034" — "Smoked Provolone".
- No photo linked for item "01299" — "Mild Provolone Stick".
- No photo linked for item "04197" — "Drunken Aged Cheese (Imbriago) Whole Wheel".
- No photo linked for item "04208" — "Drunken Aged Cheese (Imbriago) 1/4 Wheel".
- No photo linked for item "05417" — "Grana Padano PDO 1/8 Wheel 16 Months".
- No photo linked for item "05422" — "Grana Padano Aged 20 Mesi".

## Medium (3) — inconsistent, worth a look
- Photo(s) tagged for item "30014-back" but no matching item record exists: monti/30014-back. Either the item was deleted and the photo was never unlinked, or the code was mistyped when tagging.
- Photo(s) tagged for item "30015-back" but no matching item record exists: monti/30015-back. Either the item was deleted and the photo was never unlinked, or the code was mistyped when tagging.
- Photo(s) tagged for item "04108" but no matching item record exists: monti-trentini/stagionati/le-malghe-di-vezzena-300g-atm-usa-04108-13aj1e. Either the item was deleted and the photo was never unlinked, or the code was mistyped when tagging.

## Info (17) — asymmetries that may be intentional
- SKU "20277" is on the price list (catalog.json) but has no item record (name/description/photo) yet.
- Item "20163" has a record but isn't on the price list (catalog.json) — may be intentional (discontinued, sample-only, etc.).
- Item "20282" has a record but isn't on the price list (catalog.json) — may be intentional (discontinued, sample-only, etc.).
- Item "20586" has a record but isn't on the price list (catalog.json) — may be intentional (discontinued, sample-only, etc.).
- Item "30009" has a record but isn't on the price list (catalog.json) — may be intentional (discontinued, sample-only, etc.).
- Item "30010" has a record but isn't on the price list (catalog.json) — may be intentional (discontinued, sample-only, etc.).
- Item "30011" has a record but isn't on the price list (catalog.json) — may be intentional (discontinued, sample-only, etc.).
- Item "40105" has a record but isn't on the price list (catalog.json) — may be intentional (discontinued, sample-only, etc.).
- Item "40167" has a record but isn't on the price list (catalog.json) — may be intentional (discontinued, sample-only, etc.).
- Item "40169" has a record but isn't on the price list (catalog.json) — may be intentional (discontinued, sample-only, etc.).
- Item "10390000" has a record but isn't on the price list (catalog.json) — may be intentional (discontinued, sample-only, etc.).
- Item "0001" has a record but isn't on the price list (catalog.json) — may be intentional (discontinued, sample-only, etc.).
- Item "01034" has a record but isn't on the price list (catalog.json) — may be intentional (discontinued, sample-only, etc.).
- Item "01299" has a record but isn't on the price list (catalog.json) — may be intentional (discontinued, sample-only, etc.).
- Item "04197" has a record but isn't on the price list (catalog.json) — may be intentional (discontinued, sample-only, etc.).
- Item "04208" has a record but isn't on the price list (catalog.json) — may be intentional (discontinued, sample-only, etc.).
- Item "05422" has a record but isn't on the price list (catalog.json) — may be intentional (discontinued, sample-only, etc.).
