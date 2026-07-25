# Build log entry — template

Newest at the top of `docs/BUILD_LOG.md`, directly under the format-convention block.
Heading is always `## YYYY-MM-DD — TYPE: short title`, where TYPE is one of
`FIX` · `FEATURE` · `DECISION` · `FINDING` · `INCIDENT` · `PHASE`.

---

## YYYY-MM-DD — FIX: <what broke, in the words someone would search for>

**What:** How it surfaced, quoted from whoever reported it. What the symptom actually looked
like on screen — the literal error text, not a paraphrase. What was suspected first, and what
ruled it out. *(Ruling-out is content. It stops the next session re-walking the same ground.)*

**Root cause:** The mechanism, stated so it can be checked rather than believed. Include the
exact identifier — file:line, config key, header, error string. If something masked the failure
(empty response body, an auth path that kept working, a cached success), name it: that's usually
why it took as long as it did.

**Measured:** Numbers with denominators. "31 of 386" not "some." What the failing set had in
common, and what the passing set had in common — the contrast is the proof.

**Shipped (`<sha>`):** The change, by file and line. Whether a comment was left at the site
explaining why, so a later refactor doesn't strip it.

**Verified:** What was tested, how many cases, and the margin. "32/32 return 200, largest output
7.4MB against a 10MB cap" — a number that shows headroom, not just a pass.

**Decision:** Only if a real alternative was rejected. Say what it was and why it lost. If the fix
carries a cost the user accepted knowingly, write the cost down.

**Also found, not fixed:** Anything spotted in passing. This is where the next session's work comes
from.

---

Notes on voice: past tense, factual, no hedging. Prose over bullets — bullets lose the causal
chain, and the causal chain is the point. Quote the person who reported it. If they diagnosed it,
say so.
