#!/bin/bash
# COMMIT REP CARD — double-click. Tests, commits, pushes.
#
# Files, named explicitly. No `git add -A`.
#   src/components/campaigns/campaign-detail.jsx     the rep card + PushDialog fix
#   netlify/functions/campaign-state.js              cleanRosterRep: territory[] + keyAccounts[]
#   netlify/functions/crm-hubspot.js                 reads Contact.territory + Company.relationship
#   scripts/test-rep-card.mjs                        30 tests
#   package.json                                     test:repcard wired in
#   docs/DISTRIBUTOR_CAMPAIGN_PHASES_2026-09-26.md   the phase model + decisions
#   docs/CUSTOMER_GAP_2026-09-26.md                  STRAGGLER — written this morning, never committed
#   docs/CUSTOMER_LIST_2024-2025.csv                 STRAGGLER — the 44-customer extract
#   COMMIT DOCS AND GITIGNORE.command                STRAGGLER — that button never added itself
#   COMMIT REP CARD.command                          this button

cd "$(dirname "$0")" || exit 1
export GIT_PAGER=cat PAGER=cat

echo ""
echo "======================================================================"
echo "  COMMIT REP CARD  —  tests, then commit, then push"
echo "======================================================================"
echo ""

if ! npm test; then
  echo ""
  echo "  TESTS FAILED — nothing committed, nothing pushed."
  echo ""
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi

echo ""
echo "  Tests pass. Staging…"
echo ""

git add \
  "src/components/campaigns/campaign-detail.jsx" \
  "netlify/functions/campaign-state.js" \
  "netlify/functions/crm-hubspot.js" \
  "scripts/test-rep-card.mjs" \
  "package.json" \
  "docs/DISTRIBUTOR_CAMPAIGN_PHASES_2026-09-26.md" \
  "docs/CUSTOMER_GAP_2026-09-26.md" \
  "docs/CUSTOMER_LIST_2024-2025.csv" \
  "COMMIT DOCS AND GITIGNORE.command" \
  "COMMIT REP CARD.command" || {
  echo "  git add failed — read above."
  echo "  If it says index.lock exists, delete that file and re-run:"
  echo "     rm \"\$(pwd)/.git/index.lock\""
  echo ""
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
}

git --no-pager diff --cached --stat | cat
echo ""

git commit -m "campaigns: rep card - pick a rep's territory and key accounts

Rick, 2026-09-26: \"open a card for the rep. And in there, I want to be
able to assign accounts. I want to see at least their top three accounts
for each of the reps... a drop down where I can click in and assign a
territory.\"

Built inside the existing Rep roster panel (Setup phase in the model Rick
laid out the same day - see DISTRIBUTOR_CAMPAIGN_PHASES). The row's
'Log call' button is now 'Open card'. Inside:

  Territory      the same 10-value checkbox grid as the call console.
                 HubSpot Contact.territory OWNS this fact; the roster only
                 stages a change. Shows 'From HubSpot' / 'Changed here' /
                 'Not set anywhere yet' so the promotion boundary is visible.
  Key accounts   search the account book, pick up to 10. Campaign state -
                 never pushed. Top three shown on the row without opening.
  The call       outcome + notes, unchanged.

KEY ACCOUNTS ARE PICKED, NOT RANKED. There is no revenue, order or deal
data anywhere in the code to rank by, and the one available ranking -
email engagement - was shown that same morning to be actively misleading:
three paying customers had zero engagement. Rick's own words were
\"selecting their key customers.\" The picker lists Active customers first,
because that field was set from the producer's own sales list and is the
one signal here that means 'buys'.

TWO WRITE-NEVER-READ PROPERTIES NOW READ. crm-hubspot requested neither
Contact.territory nor Company.relationship. Both were being written -
territory by crm-push, relationship on 30 accounts that morning - and both
were invisible to the app that wrote them. A rep who already had a
territory showed an empty picker, inviting someone to set it again,
differently.

PROMOTION reuses PushDialog + crm-push unchanged; no second write path.
A count of unpushed territory changes sits under the roster so a staged
change cannot rot silently (ownership doc guardrail 3). contact_role is
deliberately NOT set to Rep on push: a rep roster can hold a
merchandising manager, and role is picked, never inferred.

CORRECTION to e3e494b. That commit message said the people-spine values
were \"surfaced in the dry run so Rick can see them before they are
written.\" crm-push returned them - PushDialog never rendered them. The
check it described did not exist on screen. It does now: role, territory
and account relationship show per row in the preview.

Also:
- cleanRosterRep() extracted from the inline sanitizer so the roster
  record is testable. 30 tests, including that the three drifted
  territory spellings from 2026-09-25 are refused.
- crm-hubspot's CONTACT_ROLE_PROPERTY was a second copy of a name
  people-fields.js owns; now imported. Retyping property names is how
  four option strings drifted.
- crm-hubspot's header comment still said sales-email-read was
  deprecated and crm.objects.emails.read was required. Disproved
  2026-09-25 (b66acba). Corrected.
- campaign-state's roster comment said a rep's territory lived in
  territory-book. Superseded by the HubSpot decision; corrected.
- The old free-text territory from calls stays visible read-only on the
  card, so nothing Rick typed disappears - it just stops being where
  territory lives.

Verified: all four touched functions BUNDLE with esbuild, which proves the
netlify/functions -> src/lib imports resolve rather than assuming it from
the ai-compose.js precedent.

Stragglers committed with this: CUSTOMER_GAP_2026-09-26.md and
CUSTOMER_LIST_2024-2025.csv (written that morning, never committed), and
the COMMIT DOCS AND GITIGNORE button, which never added itself." | cat

if [ $? -ne 0 ]; then
  echo ""
  echo "  Commit failed or nothing to commit — read above. Not pushing."
  echo ""
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi

echo ""
echo "  Pushing…"
echo ""

if git push origin phase-2-6-build; then
  echo ""
  echo "  Done. Netlify is building — live in ~1-2 min."
  echo ""
  echo "  TO VERIFY: open a campaign -> Rep roster & territory -> 'Open card'"
  echo "  on any rep. Tick a territory; the header should say 'Changed here'."
  echo "  Search an account and add it; it should appear as a numbered chip."
  echo "  Close the card - the row should show 'Key:' with that account."
  echo "  A yellow bar under the roster offers 'Review & push to HubSpot' -"
  echo "  the dry run should now SHOW the territory before anything is written."
else
  echo ""
  echo "  PUSH FAILED — read the error above. The commit is safe locally."
fi

echo ""
read -n 1 -s -r -p "Press any key to close..."
echo ""
