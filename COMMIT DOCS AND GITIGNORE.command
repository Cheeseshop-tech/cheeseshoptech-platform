#!/bin/bash
# COMMIT DOCS AND GITIGNORE — double-click to commit the doc backlog and close the 281MB hazard.
#
# Files are named EXPLICITLY below. No `git add -A`, no `git add .` — that is what swept 870
# files (including .mov) into staging on 2026-09-25.
#
# Committing:
#   .gitignore                                          videos/ (281MB), vendored skills, scratch
#   skills-lock.json                                    pins the vendored skills reproducibly
#   docs/CAMPAIGN_DOCUMENTS_SPEC_2026-09-21.md          approval+comments addendum (code shipped)
#   docs/HANDOFF_2026-09-17_spec-sheet-button-*.md      uncommitted handoff
#   docs/HANDOFF_2026-09-19_template-architecture-*.md  uncommitted handoff
#   docs/ITEM_STANDARDS_VALIDATION_2026-09-19_live.md   uncommitted validation run
#   COMMIT PEOPLE SPINE PROPERTIES.command              the button itself
#   _archive/one-time-scripts/test-sentry-functions-dsn.mjs
#
# NOT committing (now ignored): videos/ 281MB · .agents/ 8.5MB · .claude/skills/* vendored ·
#   Claude outputs/ 3.4MB scratch · src/components/crm/crm-page.jsx.bak

cd "$(dirname "$0")" || exit 1
export GIT_PAGER=cat PAGER=cat

echo ""
echo "======================================================================"
echo "  COMMIT DOCS AND GITIGNORE"
echo "======================================================================"
echo ""

git add \
  ".gitignore" \
  "skills-lock.json" \
  "docs/CAMPAIGN_DOCUMENTS_SPEC_2026-09-21.md" \
  "docs/HANDOFF_2026-09-17_spec-sheet-button-and-pdf-thumbnails.md" \
  "docs/HANDOFF_2026-09-19_template-architecture-redesign.md" \
  "docs/ITEM_STANDARDS_VALIDATION_2026-09-19_live.md" \
  "COMMIT PEOPLE SPINE PROPERTIES.command" \
  "CREATE CRM PROPERTIES.command" \
  "_archive/one-time-scripts/test-sentry-functions-dsn.mjs"

echo "  Staged:"
git --no-pager diff --cached --stat | cat
echo ""
echo "  Sanity check — nothing in videos/ or .agents/ should appear above."
echo ""

git commit -m "docs: catch up the handoff backlog; ignore videos/ and vendored skills

videos/ is 281MB of rendered working files sitting untracked in the repo
root, one \`git add -A\` away from being committed. Ignored, with the
reasoning written into .gitignore: finished video that needs to ship goes
to Cloudinary through the Media Hub, not into git.

Same treatment for the GitHub-installed skills — .agents/ alone is 8.5MB.
skills-lock.json IS committed, pinning source and hash for each, so the
set stays reproducible without carrying the bodies. package-lock.json vs
node_modules/. .claude/skills/accurate-maps is ours and stays tracked.

Docs that were written but never committed:
- CAMPAIGN_DOCUMENTS_SPEC addendum — the 2026-09-22 reversal of decision 2
  (documents as a plain list) into a viewer with approve/request-changes
  and per-document comments. The code shipped; the spec lagged behind it.
- two handoffs (spec-sheet button + PDF thumbnails; template architecture
  redesign) and the 2026-09-19 live item-standards validation run.

Also commits COMMIT PEOPLE SPINE PROPERTIES.command, which was left
untracked — every change gets a button, and the button is part of the
change.

And retires CREATE CRM PROPERTIES.command. It was run by mistake today
and 403'd five times, which is what a button that cannot work looks like
from the outside: identical to one that is merely misconfigured. It now
prints why it cannot work, what exists instead, and the two UI traps
(write-once internal values; the Field type tab) rather than prompting
for a token and failing. scripts/create-crm-properties.mjs stays as the
machine-readable definition." | cat

STATUS=$?
echo ""
if [ $STATUS -eq 0 ]; then
  echo "  Committed. Run DEPLOY TO STAGING.command to push."
else
  echo "  Commit failed or there was nothing to commit - read above."
fi
echo ""
read -n 1 -s -r -p "Press any key to close..."
echo ""
