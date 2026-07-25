# Incident report — template

One file per incident: `docs/INCIDENT_YYYY-MM-DD_<slug>.md`. Write it *after* the build log entry,
not instead of it. Only for SEV-1/2, or a SEV-3 carrying a lesson worth keeping.

**Severity:** SEV-1 platform down or data at risk · SEV-2 major feature broken, no workaround ·
SEV-3 feature broken with a workaround · SEV-4 cosmetic or single-asset.

---

# Incident report — <one line, the symptom as experienced>

**Date:** YYYY-MM-DD · **Severity:** SEV-n (justify the number in a short parenthesis)
**Surfaces:** which pages · **Client:** which tenant
**Status:** Resolved / Mitigated / Open — and what's pending
**Related:** link prior incidents on the same surface

## Summary
Five sentences. What the user saw, what caused it, what fixed it, what was lost (usually nothing —
say so explicitly), what still needs doing. Someone should be able to stop reading here.

## Impact
A table: assets/users affected with a denominator · surfaces affected · **what kept working** ·
data at risk · the workaround available during the incident. Then one line of plain English about
whether the affected set was random or concentrated — "8% of assets" reads very differently from
"8% of assets, being the entire flagship product line."

## Timeline
A table, relative offsets after the first absolute time. Include the latent period if the bug
predates the report — the gap between "introduced" and "noticed" is itself a finding. Include the
dead ends.

## Root cause
The mechanism, checkable. Then: **why it stayed hidden.** Empty response bodies, auth paths that
kept working, files that look fine at rest — name the masking factor. Then contributing factors:
the policy that existed in one code path and not another, the guard nobody enforced downstream.

## Resolution
What changed, file and line. What was verified, with the margin. Then **rejected alternatives** —
what else would have worked, and why it lost. A fix with no stated alternative reads like the only
option, and it rarely was. If the fix carries a cost, write the cost down as accepted.

## Latent risk closed
What else was one small change away from the same failure. Usually the strongest argument for the
fix chosen, and it's invisible unless measured deliberately.

## Prevention
Numbered, each marked **Done** / **Recommended** / **Consider**. At least one should address
*detectability*, not just the bug — if the failure was invisible to logging, that is the finding.

## Prior incident
Same surface before? Say what was different, what was the same, and what the pattern suggests.
Two incidents are a coincidence; naming them together is how it stops being one.
