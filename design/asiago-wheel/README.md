# Asiago Wheel — landing showpiece source assets

**Purpose.** Reference images of **Asiago** (Monti Trentini's flagship — Asiago PDO, "Product of the
Mountains") to enhance and build toward the **3D interactive cheese-wheel nav** — the dynamic landing
hero. Concept: a market-size wheel rendered as a **wheel of Asiago** whose wedges are business
segments **and** portal tools. See `prototypes/cheese-wheel-nav-prototype.html` + BUILD_LOG.

## Drop reference images in `references/`
Best shots for a clean **enhance → 3D** pipeline:
- **Top-down whole wheel** (flat lay) — the master form.
- **A cut wedge / piece** showing the interior (eyes/holes + paste color) and the **rind cross-section**.
- **Rind close-up** — texture + color.
- **Angled / 3⁄4 views** — for the 3D form.
- Even soft lighting · neutral background · high resolution.

**Asiago look (for the illustration + 3D texture):** pale straw → golden (aged *d'Allevo* runs deeper
amber); small irregular eyes; natural pale rind. *Illustration over photorealism* — the references guide
the illustrated style and the 3D model, they aren't used as-is.

## Pipeline
1. **Compile** references here (`references/`).
2. **Enhance / clean** (Adobe / Firefly) → an illustrated Asiago master.
3. **Toward 3D** — texture a Three.js / R3F wedge + wheel model.
4. **Embed** as a `kind:"code"`/scene slot in a `flow` manifest (the apex landing hero).

> Raw references can stay local (gitignored) if they get heavy; the enhanced/final assets get committed.
