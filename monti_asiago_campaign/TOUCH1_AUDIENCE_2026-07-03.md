# Asiago Touch 1 — Audience readiness (2026-07-03)

**Finding: HubSpot list 17 ("National Cheese Shop") is NOT a cheese-shop list.** It contains
699 contacts — effectively the whole database: distributors (Ace Endico ×72, Eataly ×40, GFI ×31,
KeHE, Musco, Lettieri), retail chains (Costco, Target, Whole Foods, Albertsons), non-buyers
(Morgan Stanley, Google, HubSpot), and Monti's own people (Stefano, Rick). **Do NOT send the
campaign to list 17.**

**The correct audience = companies where `channel` = "Cheese shop / Boutique grocery" (241).**

## Readiness snapshot

| Segment | Count |
|---|---|
| Cheese-shop companies (channel-tagged) | 241 |
| — with 0 contacts | 195 |
| — with contacts (45×1, 1×2) | 46 companies / 47 contacts |
| Contacts WITH email → **send-ready** | **24** |
| Contacts with name but NO email | 23 |

## Send-ready 24 (Touch 1 batch — proof of function)

| Contact | Email | Shop |
|---|---|---|
| Mariel | angelinasitalianmarkets@gmail.com | Angelina's Italian Markets |
| Louise | info@artisancheesecompany.com | Artisan Cheese Company |
| Chris | support@borgattis.com | Borgatti's Ravioli & Egg Noodles |
| Jill | customerservice@cheesetique.com | Cheesetique |
| Heather | hcelentano@citarella.com | Citarella Gourmet Market (UES) |
| Joann | corksandcurds@comcast.net | Corks & Curds |
| Amanda | abernhardt@dibruno.com | Di Bruno Bros. (Italian Market) |
| John | jaalfano@dorismarket.com | Doris Italian Market |
| Angie | hello@eastsidecheese.com | East Side Cheese & Provisions |
| Elizabeth | info@feastvirginia.com | Feast! Market & Cafe |
| Talia | cheeseinfo@idealcheese.com | Ideal Cheese Shop |
| Tonda | tonda@lafemmedufromage.com | La Femme du Fromage |
| Sybille | karinalandf@gmail.com | Loaves & Fishes Foodstore |
| Kurt | info@mazzarosmarket.com | Mazzaro's Italian Market |
| David | info@arthuravenue.com | Mike's Deli (Arthur Ave Market) |
| Vincenzo | contact@originimarket.com | Origini Italian Market |
| Rachel | info@orrmanscheeseshop.com | Orrman's Cheese Shop |
| Michael | brooklyn@pastosa.com | Pastosa Ravioli (Bensonhurst) |
| Eric* | eric@bierandcheese.com | The Bier & Cheese Collective |
| Tony | tony@cheesestorebh.com | The Cheese Store of Beverly Hills |
| Mike | info@cheesewheelgvl.com | The Cheese Wheel |
| Michael | info@thevillagecheeseshop.com | The Village Cheese Shop |
| Trudi | info@goatsheepcow.com | goat.sheep.cow. |

*Bier & Cheese has 2 contacts (Eric + Rick) — send to ONE (Eric), suppress the other.
Note: many are generic inboxes (info@/support@) — fine for Touch 1, whose ask IS "point me to
the buyer."

## Email-gap 23 (named decision-makers, NO email — enrichment queue)

Tommy Guarino (A Taste of Italy Deli) · Matthew Thayer (American Provisions) · Steven Freeman
(Angela's Pasta & Cheese) · Kevin Varrasse (Bachetti Bros.) · Nancy Power (C'est Cheese) ·
Raymond Hook (Capella Cheese) · Tom Roukous (Coppola's Deli) · Joe DiPasquale (DiPasquale's) ·
Casey D'Arconte (Edgewood Cheese Shop) · Joe Cardinale (Enzo's) · John Quirin (Ferrucci's) ·
Pam Hitchman (Fox Point Grocers) · Giuseppe Ruscigno (Joe's Italian Deli) · Luigi Gennicola
(Luigi's Delicatessen) · Annamaria Marchese (Marchese) · Antonio Caruana (Mercato di Grazia) ·
Cosimo Parrelli (Montalbano's) · Maria Rusciano (Salumeria 2703) · Anne Saxelby (Saxelby
Cheesemongers) · Stacey Adams (Tastings Gourmet) · Leslie Rohland (Bluffton Pasta Shoppe) ·
Frank Delia (The Italian Gourmet Market) · Bill Houder (Town Clock Cheese Shoppe)

## Enrichment results (2026-07-03, web research — no pattern-guessed emails)

**HIGH confidence (published on the shop's own site) — ✅ WRITTEN to HubSpot 2026-07-03** (6
updates + new contact Benoit Breal 513491038945 assoc. Saxelby Cheesemongers). Send-ready
count: 24 → **31**. Still to do in UI: retire Anne Saxelby's contact (deceased — remove from
any send list); fix C'est Cheese company → Cheese Shop Santa Barbara; check the Luigi's
Delicatessen import row.

| Contact | Shop | Email | Note |
|---|---|---|---|
| Matthew Thayer | American Provisions (Boston) | info@americanprovisions.com | site footer |
| Steven Freeman | Angela's Pasta & Cheese (NH) | cheesemonger@angelaspastaandcheese.com | their BUYING inbox |
| Raymond Hook | Capella Cheese (Atlanta) | info@capellacheese.com | from their wholesale page |
| Pam Hitchman | Fox Point Grocers (Providence) | info@foxpointgrocers.com | owner confirmed |
| Annamaria Marchese | Marchese Italian Market (VA Beach) | marchesemarket@gmail.com | owner's own shop |
| Stacey Adams | Tastings Gourmet (Annapolis) | info@tastingsgourmetmarket.com | owner confirmed |

**MEDIUM confidence (directory/legacy sources) — verify by phone or send 1:1 and watch bounces:**

| Contact | Shop | Email | Caveat |
|---|---|---|---|
| Kevin Varrasse | Bachetti Bros. (DE) | bachetti@bachettis.com | directory only; site is form-only |
| Tom Roukous | Coppola's Deli (Richmond) | Coppolasdeli@aol.com | directories; Carytown loc only (downtown closed) |
| Joe DiPasquale | DiPasquale's (Baltimore) | mustogusto@dipasquales.com | legacy inbox, right domain |
| John Quirin | Ferrucci's (Cornelius **NC**) | meatballs@ferruccis.com | from their 2017 newsletter — stale risk |
| Maria Rusciano | Salumeria 2703 (DC) | salumeria2703@gmail.com | tied to official FB/site |
| Leslie Rohland | Bluffton Pasta Shoppe (SC) | rohland84@gmail.com | personal gmail via her Cottage Cafe profile |

**Data flags (fix in HubSpot):**
- **Anne Saxelby is deceased (Oct 2021).** Do NOT email. Current owner = **Benoit Breal**; correct wholesale contact = orders@saxelbycheese.com. → create new contact, retire Anne's.
- **C'est Cheese (Santa Barbara) closed permanently 2020** → successor at same address = **Cheese Shop Santa Barbara** (info@cheeseshopsb.com, same owners M&K Graham). Nancy Power has no association with either. → update company + contact.
- **"Luigi Gennicola / Luigi's Delicatessen" doesn't resolve to any real shop** — zero web footprint. Likely transcription error; check the source import.
- Location fixes: Ferrucci's = Cornelius NC (not PA) · Town Clock Cheese Shoppe = Gap PA (not Dubuque) · A Taste of Italy + The Italian Gourmet Market are both Wilmington NC.

**No published email (phone/form only) — call-or-form queue:** A Taste of Italy Deli (910-392-7529) · Edgewood Cheese Shop (401-941-2400) · Joe's Italian Deli, Arthur Ave (718-367-7979) · Enzo's Columbia (803-550-9220) · Mercato di Grazia (757-937-6631) · Montalbano's Staten Island (718-448-8077) · Italian Gourmet Market (910-362-0004) · Town Clock (717-442-9090).

## ✅ TEST SEND PASSED — ALL LAUNCH GATES CLEARED (2026-07-04)

Rick sent the Touch 1 test (template + sell sheet) to Mary on 2026-07-04 — delivered and
rendered clean. The last open gate is closed. **LAUNCH IS GO for Monday 2026-07-06, 8:00 AM**
(scheduled task `asiago-touch1-launch-day` fires with the checklist).

Note for the real sends: prefer the **tracked HubSpot Documents link** over a raw PDF
attachment — lighter send (deliverability) + per-contact sell-sheet view analytics for
prioritizing Touch 2. Insert via Email → Documents → sell sheet.

## ✅ CAMPAIGN INFRASTRUCTURE LIVE (2026-07-03)

- **Launch list:** "Asiago Touch 1 — Cheese shops" — HubSpot ACTIVE list **id 19** (Company
  Channel = Cheese shop / Boutique grocery AND Email is known → 31 contacts, grows with
  enrichment). This is THE launchpad — work down it, never list 17.
- **Template:** "Monti Trentini — Buyer Intro" (id 283799276) = Touch 1 copy, first-name token.
- **Document:** Asiago_Sell_Sheet.pdf in HubSpot Documents (tracked link, email-gate OFF).
- **Send flow per shop:** open contact → Email → Templates → Buyer Intro → Insert → Documents →
  sell sheet → check "Create To-do task" (4 days) → Send.
- **Monitor:** Library → Templates → Analyze (opens/replies) · Library → Documents (sell-sheet
  views) · CRM → Tasks (follow-up queue). Replies land in sales@ Gmail + contact timelines.

## Plan

1. **NOW (Rick, in HubSpot UI):** create an active contact list "Asiago Touch 1 — Cheese shops"
   — filters: *Associated company → Channel = Cheese shop / Boutique grocery* AND *Email is known*.
   Grows automatically as enrichment fills gaps.
2. **Proof-of-function send:** Touch 1 to the ~24 (after DKIM/DMARC on cheeseshoptech.com +
   one test-send of the template to a personal inbox). HubSpot Starter = 1:1 sends from the
   connected hello@ inbox using a saved template — manual, fine at this scale.
3. **Enrichment track (Claude):** find emails for the 23 named buyers (web research) →
   add to HubSpot → they join the list automatically.
4. **Bigger pipeline:** 195 tagged companies have zero contacts — systematic contact-finding
   pass (web/Apify), highest-value shops first.
