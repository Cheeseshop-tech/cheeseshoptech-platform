# Item standards validation — montitrentini — 2026-09-19

Mode: **LIVE item store**

Corpus: 108 real SKUs (catalog.json) · 125 item records · 346 assets · 24 precut line items.

## HIGH (26) — a phantom item number, buyer-visible
- PHANTOM CODE "20163" — tagged on 1 asset(s) but absent from catalog.json, so it is not a real item number. The Buyer Catalog will still render a card for it. Assets: monti/20163. Fix: unlink the code in Media Hub (keep the file), or have Inventory assign a real number and add it to the price list first.
- PHANTOM CODE "30014-back" — this is "30014" with "-back" parsed into the code. The photo is real and belongs on item 30014; right now it is orphaned onto a code that does not exist, so it never shows as that item's second photo. Fix in Media Hub: set the SKU to "30014" and add the "back-shot" usage tag. Asset: monti/30014-back.
- PHANTOM CODE "30015-back" — this is "30015" with "-back" parsed into the code. The photo is real and belongs on item 30015; right now it is orphaned onto a code that does not exist, so it never shows as that item's second photo. Fix in Media Hub: set the SKU to "30015" and add the "back-shot" usage tag. Asset: monti/30015-back.
- PHANTOM CODE "04108" — tagged on 1 asset(s) but absent from catalog.json, so it is not a real item number. The Buyer Catalog will still render a card for it. Assets: monti-trentini/stagionati/le-malghe-di-vezzena-300g-atm-usa-04108-13aj1e. Fix: unlink the code in Media Hub (keep the file), or have Inventory assign a real number and add it to the price list first.
- PHANTOM ITEM RECORD "20163" — "Caciotta Rustega With Truffle" exists in the item store but not in catalog.json. It is buyer-visible and quotes against nothing.
- PHANTOM ITEM RECORD "20282" — "Caciotta Herbs 6 Lbs (4x)" exists in the item store but not in catalog.json. It is buyer-visible and quotes against nothing.
- PHANTOM ITEM RECORD "20586" — "Lagrein" exists in the item store but not in catalog.json. It is buyer-visible and quotes against nothing.
- PHANTOM ITEM RECORD "30009" — "Italian Cheese Flight Green" exists in the item store but not in catalog.json. It is buyer-visible and quotes against nothing.
- PHANTOM ITEM RECORD "30010" — "Italian Cheese Flight Yellow" exists in the item store but not in catalog.json. It is buyer-visible and quotes against nothing.
- PHANTOM ITEM RECORD "30011" — "Italian Cheese Flight Red" exists in the item store but not in catalog.json. It is buyer-visible and quotes against nothing.
- PHANTOM ITEM RECORD "40105" — "Pecorino Granglona Cheese" exists in the item store but not in catalog.json. It is buyer-visible and quotes against nothing.
- PHANTOM ITEM RECORD "40167" — "Pecorino Romano" exists in the item store but not in catalog.json. It is buyer-visible and quotes against nothing.
- PHANTOM ITEM RECORD "40169" — "Ricotta Salata V.P." exists in the item store but not in catalog.json. It is buyer-visible and quotes against nothing.
- PHANTOM ITEM RECORD "10390000" — "Boneless Italian Dry Cured Ham Block" exists in the item store but not in catalog.json. It is buyer-visible and quotes against nothing.
- PHANTOM ITEM RECORD "0001" — "Christmas Gift Box" exists in the item store but not in catalog.json. It is buyer-visible and quotes against nothing.
- PHANTOM ITEM RECORD "01034" — "Smoked Provolone" exists in the item store but not in catalog.json. It is buyer-visible and quotes against nothing.
- PHANTOM ITEM RECORD "01299" — "Mild Provolone Stick" exists in the item store but not in catalog.json. It is buyer-visible and quotes against nothing.
- PHANTOM ITEM RECORD "04197" — "Drunken Aged Cheese (Imbriago) Whole Wheel" exists in the item store but not in catalog.json. It is buyer-visible and quotes against nothing.
- PHANTOM ITEM RECORD "04208" — "Drunken Aged Cheese (Imbriago) 1/4 Wheel" exists in the item store but not in catalog.json. It is buyer-visible and quotes against nothing.
- PHANTOM ITEM RECORD "05422" — "Grana Padano Aged 20 Mesi" exists in the item store but not in catalog.json. It is buyer-visible and quotes against nothing.
- PHANTOM ITEM RECORD "04108" — "(no name)" exists in the item store but not in catalog.json. It is buyer-visible and quotes against nothing.
- PHANTOM ITEM RECORD "tbd" — "Aged Black Truffle 7 Oz EW" exists in the item store but not in catalog.json. It is buyer-visible and quotes against nothing.
- PHANTOM ITEM RECORD "01114" — "(no name)" exists in the item store but not in catalog.json. It is buyer-visible and quotes against nothing.
- DUPLICATE CARD — 20437, 20439, 20440, 20441 share BOTH a name and a pack size ("Cacio Provolone" · "2 × Cylinder for slicing/case"). Indistinguishable to a buyer.
- DUPLICATE CARD — "01034" (Smoked Provolone) duplicates real SKU 01174 "Smoked Provolone": same cheese, but the ghost has no price-list SKU so it cannot be ordered. Remove the ghost.
- DUPLICATE CARD — "04197" (Drunken Aged Cheese (Imbriago) Whole Wheel), "04208" (Drunken Aged Cheese (Imbriago) 1/4 Wheel) duplicate real SKU 04176 "Drunken Cheese 7 Oz EW (Imbriago)": same cheese, but the ghost has no price-list SKU so it cannot be ordered. Remove the ghost.

## MEDIUM (27) — spec line off-standard
- 01101 minAge is "—" — the spec line renders incomplete. Expected e.g. "min 5 months  ·  6–8 months".
- 01174 minAge is "—" — the spec line renders incomplete. Expected e.g. "min 5 months  ·  6–8 months".
- 01190 minAge is "—" — the spec line renders incomplete. Expected e.g. "min 5 months  ·  6–8 months".
- 02091 minAge = "30-40 days" does not match the standard. Expected e.g. "min 5 months  ·  6–8 months".
- 03044 minAge = "min. 5 months" does not match the standard. Expected e.g. "min 5 months  ·  6–8 months".
- 03073 weight = "7oz" does not match the standard. Expected e.g. "7 oz".
- 03073 minAge = "9 months" does not match the standard. Expected e.g. "min 5 months  ·  6–8 months".
- 04165 minAge = "60-70 days" does not match the standard. Expected e.g. "min 5 months  ·  6–8 months".
- 04176 minAge is "—" — the spec line renders incomplete. Expected e.g. "min 5 months  ·  6–8 months".
- 05091 weight = "7oz" does not match the standard. Expected e.g. "7 oz".
- 05600 weight = "7oz" does not match the standard. Expected e.g. "7 oz".
- 05600 minAge = "18 months" does not match the standard. Expected e.g. "min 5 months  ·  6–8 months".
- 20423 minAge is "—" — the spec line renders incomplete. Expected e.g. "min 5 months  ·  6–8 months".
- 20424 minAge is "—" — the spec line renders incomplete. Expected e.g. "min 5 months  ·  6–8 months".
- 20480 minAge is "—" — the spec line renders incomplete. Expected e.g. "min 5 months  ·  6–8 months".
- 20481 minAge is "—" — the spec line renders incomplete. Expected e.g. "min 5 months  ·  6–8 months".
- 20579 is on the price list but has no item record — no spec line can render.
- 30014 minAge is blank — the spec line renders incomplete. Expected e.g. "min 5 months  ·  6–8 months".
- 30015 minAge is blank — the spec line renders incomplete. Expected e.g. "min 5 months  ·  6–8 months".
- 30016 minAge is blank — the spec line renders incomplete. Expected e.g. "min 5 months  ·  6–8 months".
- 30017 minAge is blank — the spec line renders incomplete. Expected e.g. "min 5 months  ·  6–8 months".
- 40086 weight = "7oz" does not match the standard. Expected e.g. "7 oz".
- 40086 minAge = "6 months" does not match the standard. Expected e.g. "min 5 months  ·  6–8 months".
- 40163 weight = "7oz" does not match the standard. Expected e.g. "7 oz".
- 40163 minAge is "—" — the spec line renders incomplete. Expected e.g. "min 5 months  ·  6–8 months".
- 40184 minAge is "—" — the spec line renders incomplete. Expected e.g. "min 5 months  ·  6–8 months".
- NAMES DO NOT DISTINGUISH FORMATS — 20 product families where several real SKUs carry the identical name and differ only by pack size. Not duplicates; each is a genuine format. But the catalog shows the same name several times over, so the buyer has to read the spec line to tell them apart. This is the naming standard's job, not a data error: Caciotta (Basket Rind) → 20141, 20142, 20150, 20228  ·  Caciotta (Basket Rind, Small) → 20144, 20161, 20162, 20229  ·  Bra Piemontese DOP → 20450, 20451  ·  Fontal Trentinella → 20511, 04067, 04168  ·  Pecorino Siciliano Primosale → 20700, 20701, 20702, 20703, 20719, 20720  ·  Alpeggio Cheese → 20724, 04211  ·  Montasio Cheese DOP → 40020, 40130  ·  Pecorino Romano DOP → 40103, 40104  ·  Piave Cheese DOP → 40107, 40109, 40158  ·  Pecorino Toscano DOP → 40174, 40175  ·  Asiago Fresco DOP → 02005, 02073, 02302  ·  Asiago Stagionato DOP → 03023, 03010  ·  Asiago Vecchio DOP whole wheel  → 03003, 03014  ·  Vezzena Cheese → 04181, 04046, 04182  ·  Lagorai Cheese → 04154, 04145, 04165  ·  Sharp Provolone → 01269, 01032, 01154, 01126, 01401  ·  Naturally Smoked Provolone → 01021, 01186, 01155  ·  Grana Padano → 05001, 05007, 05012, 05091, 05123, 05124, 05205, 05211  ·  Grana Padano Riserva → 05093, 05018, 05411, 05095  ·  Parmigiano Reggiano PDO → 05034, 05025, 05033

## LOW (25) — descriptors in the wrong field
- 03073 packSize "12 × 7 oz Exact Weight Wedges (ATM)/case" carries a packaging/age descriptor. Pack size is count × unit; packaging type and age belong in their own fields (docs/PRODUCT_NAMING_STANDARD_2026-09-18.md).
- 01101 name "Provolone Sharp Cheese 7 Oz EW" carries a format descriptor. The name identifies the cheese; format lives in packSize/weight.
- 01190 name "Provolone Mild Cheese 7 Oz EW" carries a format descriptor. The name identifies the cheese; format lives in packSize/weight.
- 02091 name "Asiago Fresco PDO 7 Oz EW" carries a format descriptor. The name identifies the cheese; format lives in packSize/weight.
- 03044 name "Asiago Aged PDO 7 Oz EW" carries a format descriptor. The name identifies the cheese; format lives in packSize/weight.
- 04165 name "Lagorai Cheese 7 Oz EW" carries a format descriptor. The name identifies the cheese; format lives in packSize/weight.
- 04176 name "Drunken Cheese 7 Oz EW (Imbriago)" carries a format descriptor. The name identifies the cheese; format lives in packSize/weight.
- 04182 name "Vezzena Cheese 7 Oz EW" carries a format descriptor. The name identifies the cheese; format lives in packSize/weight.
- 04211 name "Alpeggio Cheese 7 Oz EW" carries a format descriptor. The name identifies the cheese; format lives in packSize/weight.
- 20423 name "Caciotta Black Truffles 7 Oz EW" carries a format descriptor. The name identifies the cheese; format lives in packSize/weight.
- 20424 name "Caciotta Chili Red Pepper 7 Oz EW" carries a format descriptor. The name identifies the cheese; format lives in packSize/weight.
- 20480 name "Caciotta Mnt Herbs 7 Oz EW" carries a format descriptor. The name identifies the cheese; format lives in packSize/weight.
- 20481 name "Caciotta Pepato 7 Oz EW" carries a format descriptor. The name identifies the cheese; format lives in packSize/weight.
- 40184 name "Pecorino Romano PDO 7 Oz EW" carries a format descriptor. The name identifies the cheese; format lives in packSize/weight.
- "01034" is one character from real SKU 01032, 05034. Different product names, so probably coincidence — worth a glance if it has no other provenance.
- "01114" is one character from real SKU 01154, 01174. Different product names, so probably coincidence — worth a glance if it has no other provenance.
- "01299" is one character from real SKU 01269. Different product names, so probably coincidence — worth a glance if it has no other provenance.
- "04108" is one character from real SKU 04168. Different product names, so probably coincidence — worth a glance if it has no other provenance.
- "20163" is one character from real SKU 20161, 20162, 40163. Different product names, so probably coincidence — worth a glance if it has no other provenance.
- "20586" is one character from real SKU 20584. Different product names, so probably coincidence — worth a glance if it has no other provenance.
- "30010" is one character from real SKU 30014, 30015, 30016, 30017. Different product names, so probably coincidence — worth a glance if it has no other provenance.
- "30011" is one character from real SKU 30014, 30015, 30016, 30017. Different product names, so probably coincidence — worth a glance if it has no other provenance.
- "40105" is one character from real SKU 40103, 40104, 40107, 40109, 40175. Different product names, so probably coincidence — worth a glance if it has no other provenance.
- "40167" is one character from real SKU 40107, 40163. Different product names, so probably coincidence — worth a glance if it has no other provenance.
- "40169" is one character from real SKU 40109, 40163. Different product names, so probably coincidence — worth a glance if it has no other provenance.
