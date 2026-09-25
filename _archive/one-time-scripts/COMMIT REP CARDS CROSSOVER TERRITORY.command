#!/bin/bash
cd "$(dirname "$0")"
git add "src/components/campaigns/campaign-detail.jsx" "netlify/functions/campaign-state.js" "COMMIT REP CARDS CROSSOVER TERRITORY.command"
git commit -m "Rework rep territory assignment: pick reps first, then per-rep cards; allow overlap

Rick: \"in rep territory assignments modify it so I can first select the reps
then in each rep card assign territory and or accounts. leave the
flexability to assign the same terrritory to multiple reps since there are
a few opperating in the same or crossover areas in the same city or town or
state.\"

This also folds in the earlier same-day change from this session (pick reps
directly in the roster and email that exact list via one compose), which
hadn't been pushed yet.

Old flow: check a territory, pick ONE rep from a dropdown, lock in (bulk
overwrite), then optionally flip a single account to a different single
rep. An account could only ever belong to one rep.

New flow: Step 1 is now just picking which reps you're building territory
for -- each pick opens its own card. Every card owns an independent
territory tree (state/city/town/borough checkboxes into the same place
list) and its own account checklist, so two reps can check the exact same
state or city without conflicting. \"Lock in\" now ADDS a rep to every
matched account instead of overwriting -- any rep already there is kept --
and every account row is its own checkbox per rep instead of a single
dropdown, so a scattered or crossover account can carry several reps at
once. Each row also shows \"also: <other reps>\" when it's shared, so
overlap is visible, not a surprise.

Data model: repVisits.accountAssignments moves from {companyId: repEmail}
to {companyId: [repEmail, ...]}. campaign-state.js's sanitizer accepts
either shape on read (a bare string upgrades to a one-element array) so
nothing already saved needs a migration pass, and always writes arrays from
here on. accountAssignmentScope()/mergeCampaign() in lib/campaigns.js only
ever read the company-id KEYS for Target Prospects' scope, never the rep
value, so neither needed a change.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VEuPL2eRtQzmxd4z6fq89A"
git push origin phase-2-6-build
echo ""
echo "Done. Press any key to close this window."
read -n 1
