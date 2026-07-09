# HubSpot company cleanup plan — 2026-07-01

Source: live `crm-hubspot` function (all 591 companies). **Nothing has been written to HubSpot yet** —
this file is the review artifact. Approve in chat and Claude executes Section 5 via the HubSpot connector.

## 1. Summary

| Bucket | Count | Action |
|---|---|---|
| Already tagged | 218 | none |
| Proposed channel (high confidence) | ~240 | write on approval (Section 3 minus corrections/dupes) |
| REVIEW — Rick decides | ~95 | Section 3 rows marked REVIEW + Section 4 moves |
| SKIP — not a buyer | ~52 | leave untagged (vendors, media, misc — Google, Morgan Stanley, law firms, etc.) |
| "(no name)" records | 30 | likely auto-created from contact email domains — bulk-review in HubSpot UI |
| Exact duplicate pairs | 8 | merge in HubSpot UI (Section 2) |
| Near-duplicate pairs | 7 | merge/verify in HubSpot UI (Section 2) |

## 2. Duplicates — merge these in HubSpot (Claude will NOT delete records)

Exact name matches (keep the TAGGED record; merge the null one into it):

| Name | Keep (tagged) | Merge away (untagged) |
|---|---|---|
| Stew Leonard's | 324918060745 [Retail chain] | 324918489831 |
| Roche Bros. Supermarkets | 324776219375 [Retail chain] | 324918505198 |
| Monger's Palate | 327590277843 [Cheese shop] | 324918659807 |
| Casa Della Mozzarella | 327619418870 [Cheese shop] | 324918099648 |
| Emily's Pork Store | 327619418858 [Cheese shop] | 324776219328 |
| Landi's Pork Store | 327621179126 [Cheese shop] | 324777564883 |
| Groceria Merante | both untagged — keep 329537881802, merge 324777564881 |
| Monica's Mercato & Salumeria | both untagged — keep 329333738219, merge 324606953189 |

Near-duplicates (verify, then merge):
- Eataly (324918430425, null) vs Eataly USA (NY/Boston flagship + retail) [Retail chain]
- Wakefern (324917822177, null) vs Wakefern Food Corp. (ShopRite…) [Retail chain]
- Market Basket (324917804731, null) vs Market Basket (Demoulas…) [Retail chain]
- DeCicco & Sons (329668488931, null) vs DeCicco & Sons Markets [Retail chain]
- Wasik (327539444432, null) vs Wasik's Cheese Shop (324918750931, null)
- Piccolo's Gastronomia Italiana (329333738229) vs Piccolo Gastronomia Italiana (329750742747)
- Russo Mozzarella & Pasta (324918708940) vs Russo's Mozzarella and Pasta (5th Ave) [Cheese shop]

HubSpot merge: open the keep-record → Actions → Merge. Merging preserves contacts/activity; deleting doesn't.

## 3. Full classification (343 untagged companies) — id · name · proposed

Channels: Distributor · Restaurant / Chef · Specialty grocer · Retail chain · Partner / Producer · Cheese shop / Boutique grocery.
Note: nothing is auto-proposed as "Specialty grocer" — the heuristics can't split it from "Cheese shop / Boutique grocery"; recategorize during review if you use both.

```tsv
321013166792	HubSpot	SKIP — not a buyer
324918430425	Eataly	REVIEW (near-dupe of Eataly USA)
324918504140	Marketly Collective	SKIP — not a buyer
324917822177	Wakefern	REVIEW (near-dupe of Wakefern Food Corp.)
324917786354	Monti Trentini	Partner / Producer (the client itself)
324918489814	Coupler.io	SKIP — not a buyer
324917786361	Cafasso's Fairway Market	REVIEW
324769453785	Murrays Sports	SKIP — not a buyer
324918430450	The Bier & Cheese Collective	Cheese shop / Boutique grocery
324918489831	Stew Leonard's	(dupe — merge, Section 2)
324917804730	Creative Edge Parties	REVIEW
324917804731	Market Basket	REVIEW (near-dupe of Market Basket Demoulas)
324917788347	Workpoint Stamford	SKIP — not a buyer
324917755581	ShopNorthShoreFarms	REVIEW
324918505198	Roche Bros. Supermarkets	(dupe — merge, Section 2)
324918505209	Wine Library	Retail chain
324918506186	Alto-Imports	Distributor
324918665956	Luigi's Delicatessen	Cheese shop / Boutique grocery
324918059711	Bedford Cheese Shop	Cheese shop / Boutique grocery
324918750918	Crane River Cheese Club	Cheese shop / Boutique grocery
324769492677	Di Bruno Bros. (Italian Market)	Cheese shop / Boutique grocery
324918735592	Formaggio Kitchen - South End	Cheese shop / Boutique grocery
324918659807	Monger's Palate	(dupe — merge, Section 2)
324918059712	The Summit Cheese Shoppe	Cheese shop / Boutique grocery
324918659814	Van Hook Cheese - Montclair	Cheese shop / Boutique grocery
324918768326	Van Hook Cheese & Grocery	Cheese shop / Boutique grocery
324918750931	Wasik's Cheese Shop	Cheese shop / Boutique grocery
324918659815	A & S Pork Store and Deli of Massapequa	Cheese shop / Boutique grocery
324918659816	A&S Fine Foods - Brooklyn	Cheese shop / Boutique grocery
324918098670	A&S Pork Store of Yonkers	Cheese shop / Boutique grocery
324918659817	All'Antico Vinaio	Restaurant / Chef
324769492686	All'Antico Vinaio - Midtown	Restaurant / Chef
324776218353	All'Antico Vinaio - Upper East	Restaurant / Chef
324918793923	Angelo's Market	REVIEW
324606953162	Angelo's Specialties	REVIEW
324777564873	Antonio's Italian American Deli & Catering	Cheese shop / Boutique grocery
324918086369	Avitabile Deli	Cheese shop / Boutique grocery
324635307739	Battimelli's A&S Italian Fine Foods	REVIEW
324569536191	Bella Vista Deli	Cheese shop / Boutique grocery
324567738100	Best Sicily Bottega	Cheese shop / Boutique grocery
324918128319	Bricco Salumeria	Cheese shop / Boutique grocery
324918128320	Buon Amici Delicatessen	Cheese shop / Boutique grocery
324569536192	Calabria Pork Store	Cheese shop / Boutique grocery
324918128321	Cangiano's Marketplace	REVIEW
324918099648	Casa Della Mozzarella	(dupe — merge, Section 2)
324776219326	D&D Market	REVIEW
324918736575	Dattilo's Delicatessen	Cheese shop / Boutique grocery
324776219327	Del Fiore Italian Pork Store	Cheese shop / Boutique grocery
324918059735	Dominick's Italian-American Deli	Cheese shop / Boutique grocery
324776219328	Emily's Pork Store	(dupe — merge, Section 2)
324918099649	Empire Market	REVIEW
324918099650	Esposito's Meats	REVIEW
324918099651	Faicco's Italian Specialties	Cheese shop / Boutique grocery
324635307746	Faicco's Pork Store - Brooklyn	Cheese shop / Boutique grocery
324567739074	Fiore's House of Quality	REVIEW
324762330841	Fusaro's Italian Deli & Market	Cheese shop / Boutique grocery
324569536195	Giovanni's Salumeria	Cheese shop / Boutique grocery
324777564881	Groceria Merante	(dupe — merge, Section 2)
324569536196	Italian Corner	REVIEW
324777564882	Joe Leone's Italian Specialties	Cheese shop / Boutique grocery
324918128331	Joe's Italian Deli	Cheese shop / Boutique grocery
324606953177	Labriola's Italian Market	Cheese shop / Boutique grocery
324777564883	Landi's Pork Store	(dupe — merge, Section 2)
324606953187	Luigi's Italian Deli	Cheese shop / Boutique grocery
324606953188	M & P Biancamano	REVIEW
324567739076	Mangiamo Italian Market & Deli	Cheese shop / Boutique grocery
324567739077	Mona Lisa Salumeria	Cheese shop / Boutique grocery
324606953189	Monica's Mercato & Salumeria	(dupe — merge, Section 2)
324567739078	Nino Jr.'s Italian Deli	Cheese shop / Boutique grocery
324777564886	Parisi Bakery	REVIEW (bakery)
324635307748	Pauli's	REVIEW
324606953190	Pauly Penta's Gourmet Italian Deli	Cheese shop / Boutique grocery
324777564887	Polcari's Coffee	REVIEW (specialty coffee/spice shop)
324918708940	Russo Mozzarella & Pasta	REVIEW (near-dupe of Russo's 5th Ave)
324918751933	Sal, Kris, & Charlie's Deli	Cheese shop / Boutique grocery
324918736605	Salpino Italian Food Market & Caterers	Cheese shop / Boutique grocery
324918736606	Salpino's - Dix Hills	REVIEW
324769492725	Salumeria Italiana	Cheese shop / Boutique grocery
324918059751	San Fratello's	REVIEW
324918099692	Sarcone's Deli	Cheese shop / Boutique grocery
324776219350	Solazzo's Market	REVIEW
324769492726	Sorriso Italian Pork Store	Cheese shop / Boutique grocery
324918099693	Talluto's Authentic Italian Food	Cheese shop / Boutique grocery
324918680313	Taste of Italy	REVIEW
324567739085	Teitel Brothers	REVIEW
324606953196	Tony's Colonial Food Store	REVIEW
324635307759	Tuscany Italian Market	Cheese shop / Boutique grocery
324569536203	Tutto Italiano	REVIEW
324918128337	Venda Ravioli	Cheese shop / Boutique grocery
324606953197	Vito's & Son Italian Deli	Cheese shop / Boutique grocery
324918128338	Fiorella's Automats	Restaurant / Chef
324918128339	Roma Ristorante & Market	Restaurant / Chef
324635307760	Angelo's Pizzeria	Restaurant / Chef
324918769351	Antonio's Deli	Cheese shop / Boutique grocery
324918059756	Breezy's Deli & Market	Cheese shop / Boutique grocery
324918751940	Casa Dei Panini	Restaurant / Chef
324918059757	Cosmi's Deli	Cheese shop / Boutique grocery
324769493700	Gaetano's Deli - Wethersfield	Cheese shop / Boutique grocery
324776219358	Marinucci's Deli - Mayfair	Cheese shop / Boutique grocery
324918751941	Nardelli's Grinder Shoppe	Restaurant / Chef
324769493701	On a Roll	REVIEW
324918769352	Original Ricci's Hoagies	Restaurant / Chef
324918736611	PrimoHoagies (11th St)	Restaurant / Chef
327584010938	LaScala	REVIEW
327497255618	Infinity Worlds	SKIP — not a buyer
327497255621	Association of Food Industries	SKIP — not a buyer
327584010941	Flora Fine Foods	Distributor
327254260445	Fine Italian Food	REVIEW
327506378464	Growthwise Group	SKIP — not a buyer
327510795995	HyeLand's Naturals	SKIP — not a buyer
327506378467	Boni	SKIP — not a buyer
327579178698	Venhue	SKIP — not a buyer
327254260446	Marco Polo Institute	SKIP — not a buyer
327583896298	Detwiler's Farm Market	REVIEW
327506378468	Fiere di Parma	SKIP — not a buyer
327583851246	n10restaurant	Restaurant / Chef
327596703469	Mario Rizzotti	REVIEW
327394531008	Crossed Keys Designs	SKIP — not a buyer
327583851247	FULTON MARKET CHICAGO	REVIEW
327237943024	Stout NYC Corp	Restaurant / Chef
327394531009	Ingles Markets	Retail chain
327596703470	Delphia Food	Distributor
327394531010	Rutgers University	SKIP — not a buyer
327515929333	Luca Osteria	Restaurant / Chef
327596054250	Innovative Food Holdings	Distributor
327596703473	Home Cooking New York	SKIP — not a buyer
327394531011	Seacoast Sales Inc	Distributor
327583851251	D&H Marketing	SKIP — not a buyer
327584040647	Ranieri Fine Foods	Distributor
327584040648	Marriott International	Restaurant / Chef
327596054251	Cento Fine Foods	Distributor
327584040649	Maggie's Place	REVIEW
327584040650	Pacifica Foods	Distributor
327237943028	Toscana Divino	Restaurant / Chef
327394531012	Rossi Organics	REVIEW
327394531013	FoodMix	SKIP — not a buyer
327583851253	The Truffleist	Partner / Producer
327515929336	Oberto	Partner / Producer
327583851254	Dekalb Farmers Market	REVIEW
327237943030	Grandaisy Bakery	REVIEW (bakery/producer)
327581085379	Laissez Faire	SKIP — not a buyer
327584188122	Noodlelove	REVIEW
327512427211	Nuovo Pasta	REVIEW (pasta producer?)
327596703475	Google	SKIP — not a buyer
327497255623	Casa Foods	Distributor
327584153311	GMI Trading	Distributor
327584071412	Oakley Country Club	Restaurant / Chef
327515929337	JAV FOOD	Distributor
327515930299	Isola Imports	Distributor
327581085380	Gourmet International	Distributor
327596679909	Maher Marketing	SKIP — not a buyer
327584071413	Peacock Cheese	REVIEW (likely cheese wholesaler → Distributor?)
327584153312	Felice	SKIP — not a buyer
327506378469	Culture Cheese Magazine	SKIP — media, not a buyer
327254260447	Bang Söderlund	SKIP — not a buyer
327510795997	Formaggio Cheese	REVIEW
327579178702	Peapod Digital Labs	SKIP — not a buyer (Ahold digital arm)
327584109252	The Cheese Professor	SKIP — media, not a buyer
327596679910	Union Market	REVIEW
327584188124	Viola Imports	Distributor
327539444426	Pansardo	SKIP — not a buyer
327581085381	Altomontes	REVIEW
327497255627	Skytop Lodge	Restaurant / Chef
327512427213	Contessa Ristorante	Restaurant / Chef
327506378470	East Hampton Golf Club	Restaurant / Chef
327584071414	Bottle King	Retail chain
327584010944	LUXUNY Atelier	SKIP — not a buyer
327583896302	Porto's Bakery	REVIEW (bakery)
327584153314	USS	SKIP — not a buyer
327584071415	Compass Group	Restaurant / Chef
327596679911	Pepper	SKIP — not a buyer
327510795998	GP Design	SKIP — not a buyer
327579178703	Pinch Kitchen+Bar	Restaurant / Chef
327583945443	PropertyBuyersGroup	SKIP — not a buyer
327583981249	All-Ways	SKIP — not a buyer
327497255630	Cliff House Maine	REVIEW
327581085382	Magnifico Food	Distributor
327581085383	Myles Restaurant Group	Restaurant / Chef
327254260450	Orlando Imports	Distributor
327497255631	Botticelli Foods	Distributor
327254260451	Il Duomo Dei Sapori	REVIEW
327506378472	Jungle Jim's International Market	REVIEW
327579178704	Tarallucci e Vino	Restaurant / Chef
327512427214	Kradjian Co	REVIEW
327510796002	Casa Tua	Restaurant / Chef
327584010947	Onesti Entertainment	SKIP — not a buyer
327254260452	Mohonk Mountain House	REVIEW
327584153318	Indo-European Foods	Distributor
327584109254	International Dairy Farms	REVIEW
327497255632	Sistina	Restaurant / Chef
327584188128	24-7.com	SKIP — not a buyer
327584071416	Bresaola Bordoni	Partner / Producer
327254260453	See & Be Kitchen	SKIP — not a buyer
327506378474	Tadaima	REVIEW
327596679913	Zaca Law	SKIP — not a buyer
327506378476	AIRSCHOTT	Distributor
327583896304	Campari	REVIEW
327510796003	Melchionna	Distributor
327539444432	Wasik	REVIEW (near-dupe of Wasik's Cheese Shop)
327583945446	Cermer	SKIP — not a buyer
327579178706	Citroen Greenpoint	SKIP — not a buyer
327506378477	Fiddler's Elbow Country Club	Restaurant / Chef
327574887122	Landjet	SKIP — not a buyer
327581085385	Morgan Stanley	SKIP — not a buyer
327584071417	Accounting Recruiting	SKIP — not a buyer
327583981251	Trenton Country Club	Restaurant / Chef
327506378478	Brooks Brothers	SKIP — not a buyer
327583896306	Morton Williams Supermarket	Retail chain
327506378480	Ayza Wine & Chocolate Bar	Restaurant / Chef
327574887124	Crystal Springs Resort	Restaurant / Chef
327583896307	Michael Landis CCP	REVIEW
327581085387	Olio&Olive	REVIEW
327584153320	Spec's	Retail chain
327579178707	Super King Markets	Retail chain
327254260457	La Trafila	SKIP — not a buyer
327583945448	Formaggio Asiago	REVIEW
327596679916	Italian Trade Agency	SKIP — not a buyer
327512427220	R G Sellers Co	REVIEW
327254260458	Riverwards Produce	REVIEW
327574887126	Carfagna's	REVIEW
327584153321	Mondadori	SKIP — not a buyer
327512427221	Accardi Foods	Distributor
327497255636	Fresh Meadow Country Club	Restaurant / Chef
327506378482	Jeffrey A. Miller Hospitality Group	REVIEW
327583981258	Maestro Pasta	REVIEW
327583945449	Italy-America Chamber of Commerce of Texas	SKIP — not a buyer
327581085390	Harris Teeter	Retail chain
327584109260	Italsempione	Distributor
327510796010	BoxNCase	Distributor
327510796011	Kayco	Distributor
327579178709	THE CHILAY	SKIP — not a buyer
327584188133	Strategy International	SKIP — not a buyer
327579178710	TryAngle Foods	REVIEW
327584153322	TreeHouse Sales & Solutions	SKIP — not a buyer
327583981260	MAMO	SKIP — not a buyer
327584109262	Airfrigo Dowd	Distributor
327584153323	Birchwood Club	Restaurant / Chef
327539444436	Edgewood Tahoe Resort	Restaurant / Chef
327583896310	Doris Italian Market	Cheese shop / Boutique grocery
327596679920	Meron's Buon Appetito	REVIEW
327596679921	JONS Fresh Marketplace	Retail chain
327574887128	A7 Ventures	SKIP — not a buyer
327512427222	The Kashton Group	SKIP — not a buyer
327510796012	National Co+op Grocers	REVIEW (co-op alliance, not a shop)
327583896311	Richland Community College	SKIP — not a buyer
327584072385	Kesté Pizzeria	Restaurant / Chef
327497255639	Broad Branch Market	REVIEW
327596679922	Zabar's	REVIEW (iconic NYC — Specialty grocer?)
327584072386	Affinity Group	SKIP — not a buyer
327596679923	Fratelli Milano	Restaurant / Chef
327584153324	Sophia Foods	Distributor
327584072388	Flourbud Bakery	REVIEW (bakery)
327584040652	Tommy R's Catering	Restaurant / Chef
327237943032	The Cheese Store of Beverly Hills	Cheese shop / Boutique grocery
327583851257	Hotel Granduca	Restaurant / Chef
327515930304	SFL Imports	Distributor
327355530989	Soltani Food Brokerage	Distributor
327596055228	Tullio Miami	Restaurant / Chef
327355530990	Guckenheimer	Restaurant / Chef
327596055230	Williams-Sonoma	Retail chain
327596703480	Charcuterie Artisans	REVIEW (producer?)
327574887129	Hilton	Restaurant / Chef
327584188138	The Lodge at Woodloch	Restaurant / Chef
327510796017	Talamo Foods	Distributor
327584188141	Flours Pasta & Bakeshop	REVIEW (bakery)
327584010958	Cheese Importers	Distributor
329638017741	Sissle & Daughters	REVIEW
329325177534	Browne Trading Market	REVIEW (seafood purveyor)
329643387595	C'est Cheese	Cheese shop / Boutique grocery
329537881794	Corks & Curds	Cheese shop / Boutique grocery
329537881795	Angela's Pasta & Cheese Shop	Cheese shop / Boutique grocery
329323361008	The Concord Cheese Shop	Cheese shop / Boutique grocery
329333738218	Vermont Farmstead Cheese Co. (Market)	Cheese shop / Boutique grocery
329668488923	City Market / Onion River Co-op	REVIEW
329537881796	Stowe Mercantile	REVIEW
329333738219	Monica's Mercato & Salumeria	(dupe — merge, Section 2; keep this one, tag Cheese shop)
329668488928	American Provisions	Cheese shop / Boutique grocery
329643387601	East Side Cheese & Provisions	Cheese shop / Boutique grocery
329325177538	Fox Point Grocers	Cheese shop / Boutique grocery
329650535112	Edgewood Cheese Shop & Eatery	Cheese shop / Boutique grocery
329325177539	Liuzzi Gourmet Food Market	REVIEW
329537881797	Mike's Deli (Arthur Ave Market)	Cheese shop / Boutique grocery
329333738223	Borgatti's Ravioli & Egg Noodles	Cheese shop / Boutique grocery
329537881798	Pastosa Ravioli (Bensonhurst flagship)	Cheese shop / Boutique grocery
329333738224	Montalbano's Italian Food Specialties	Cheese shop / Boutique grocery
329333738225	Agata & Valentina	REVIEW (Specialty grocer?)
329668488931	DeCicco & Sons	REVIEW (near-dupe of DeCicco & Sons Markets)
329325177542	Mt. Kisco Smokehouse	Cheese shop / Boutique grocery
329643387602	Adams Fairacre Farms	REVIEW
329638017747	Iavarone Bros.	REVIEW
329643387603	A&S Fine Foods (Oceanside)	REVIEW
329323361012	The Village Cheese Shop	Cheese shop / Boutique grocery
329333738228	Loaves & Fishes Foodstore	Cheese shop / Boutique grocery
329668488932	Jerry's Gourmet & More	REVIEW
329333738229	Piccolo's Gastronomia Italiana	REVIEW (near-dupe of Piccolo Gastronomia Italiana)
329650535113	Calandra's Italian Village	REVIEW
329333738233	Corrado's Family Affair	REVIEW
329333739194	Carlino's Market	REVIEW
329325177549	Town Clock Cheese Shoppe	Cheese shop / Boutique grocery
329537881802	Groceria Merante	(dupe survivor — tag Cheese shop after merge)
329638017749	Talula's Daily	REVIEW
329333739195	Cheesetique	Cheese shop / Boutique grocery
329333739198	Feast! Market & Cafe	Cheese shop / Boutique grocery
329333739199	Marchese Italian Market & Cafe	Cheese shop / Boutique grocery
329325177550	Mercato di Grazia	Cheese shop / Boutique grocery
329333739200	Coppola's Deli	Cheese shop / Boutique grocery
329537881805	Orrman's Cheese Shop	Cheese shop / Boutique grocery
329325177554	South Slope Cheese Co.	Cheese shop / Boutique grocery
329668488942	Ferrucci's Old Tyme Italian Market	Cheese shop / Boutique grocery
329638017752	Angelina's Italian Markets	Cheese shop / Boutique grocery
329668488943	A Taste of Italy Deli	Cheese shop / Boutique grocery
329650535120	The Italian Gourmet Market	Cheese shop / Boutique grocery
329650535121	Parker & Otis	REVIEW
329333739201	goat.sheep.cow.	Cheese shop / Boutique grocery
329643387608	The Cheese Wheel	Cheese shop / Boutique grocery
329650535122	Daniela's Downtown	REVIEW
329323361980	Enzo's Italian Specialties	Cheese shop / Boutique grocery
329668488946	The Bluffton Pasta Shoppe	Cheese shop / Boutique grocery
329333739205	Wisconsin Meat & Cheese	Cheese shop / Boutique grocery
329650535126	Capella Cheese	Cheese shop / Boutique grocery
329650535127	E. 48th Street Market	REVIEW
329333739206	Tuscany at Your Table	REVIEW
329323361981	Cucina Baci	REVIEW
329643387609	FraLi Gourmet	REVIEW
329638017755	Dovetail Market	REVIEW
329650535128	Mazzaro's Italian Market	Cheese shop / Boutique grocery
329323361983	Artisan Cheese Company	Cheese shop / Boutique grocery
329668488948	La Femme du Fromage	Cheese shop / Boutique grocery
329537881814	Joseph's Classic Market	REVIEW
329643387611	Origini Italian Market	Cheese shop / Boutique grocery
329668488949	Neapolitan Gourmet Italian Market & Deli	Cheese shop / Boutique grocery
329333739209	Caraluzzi's Markets	REVIEW
329668489925	Tastings Gourmet Market	Cheese shop / Boutique grocery
329537881833	DiPasquale's Italian Market	Cheese shop / Boutique grocery
329643387622	Pastore's Italian Delly	REVIEW
329323362003	Frederick Cheese Shop	Cheese shop / Boutique grocery
329323362004	A. Litteri, Inc.	REVIEW
329643387623	Salumeria 2703	Cheese shop / Boutique grocery
329650535140	Cork Market & Tasting Room	REVIEW
329650535141	Janssen's Market	REVIEW
329638017772	Flora & Fauna	REVIEW
329537881834	Bachetti Bros. Gourmet Market	Cheese shop / Boutique grocery
329750742747	Piccolo Gastronomia Italiana	REVIEW (near-dupe pair)
```

## 4. "(no name)" records — 30 ids

Likely auto-created by HubSpot from contact email domains. Review in bulk in HubSpot UI
(filter: Name is unknown) — merge into the right company or delete manually. Claude will not delete.

## 5. Execution on approval

Claude writes `channel` via the HubSpot connector for every row in Section 3 with a concrete channel
(not REVIEW / SKIP / dupe): ~130 Cheese shop / Boutique grocery, ~40 Restaurant / Chef, ~30 Distributor,
~12 Retail chain, ~5 Partner / Producer ≈ **215 updates**. REVIEW (~85) and SKIP (~52) rows are untouched.
Dupes/merges + no-name cleanup stay manual in the HubSpot UI (merge preserves history; deletion doesn't).
