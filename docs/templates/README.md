# Internal comms templates

Four formats. Pick by **who reads it and when**, not by how big the event felt.

| Template | Audience | When | Length |
|---|---|---|---|
| `BUILD_LOG_ENTRY.md` | future you, future sessions | every fix, decision or finding | as long as it needs to be |
| `INCIDENT_REPORT.md` | you + anyone auditing later | SEV-1/2, or a SEV-3 with a lesson worth keeping | 1–2 pages |
| `STATUS_UPDATE_3P.md` | client, partner, anyone outside the build | weekly, or after a visible event | 30–60 seconds to read |
| `CLIENT_NOTICE.md` | the client, during or after an outage they saw | only when they noticed or will notice | 5 sentences |

**The rule that matters:** an entry in `docs/BUILD_LOG.md` is not optional. Everything else is.
The build log is the project's memory — the 07-24 incident sat undocumented for a day and the next
session started by re-diagnosing ruled-out causes. Write the log entry while the terminal output is
still on screen.

**Second rule:** write what was *ruled out*, not just what was wrong. "Not the env vars, verified
by X" is the sentence that saves the next hour.

**Third rule:** if the user diagnosed it, say so by name. Credit is a fact about the incident.
