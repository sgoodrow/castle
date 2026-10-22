#!/usr/bin/env bash
# Passes when a branch changes only docs and tests, so it may merge without the repo owner's go-ahead
# (CLAUDE.md, "Reviewing and merging a PR"). Run main's copy on the PR's head commit, so a branch
# can't change what decides its own tier; merge pinned to the commit it prints.
# Docs are Markdown, except the rules agents follow: CLAUDE.md and the roadmap's "How work runs".
# Tests are the features and their steps, the page's fixtures and *.test.ts(x), and they must be kept
# (check-tests-kept.sh). A test-gap branch may also raise coverage thresholds (check-test-gap-scope.sh).
set -euo pipefail

base="${1:-origin/main}"
mb=$(git merge-base "$base" HEAD)
fail=0
problem() { echo "::error::$1"; fail=1; }

DOCS='\.md$'
TESTS='^(bank/web/features|src/web/features|bank/web/src/__fixtures__)/|\.test\.tsx?$'
RULES='^CLAUDE\.md$'
CONFIGS='^(vitest\.config\.mts|bank/web/vite\.config\.ts)$'
ROADMAP='bank/ROADMAP.md'

# The roadmap's "How work runs" section, up to the next heading.
how_work_runs() { awk '/^## / { on = ($0 == "## How work runs") } on'; }

thresholds=false
while read -r file; do
  if [[ "$file" =~ $RULES ]]; then problem "changes $file, which agents follow as rules"; continue; fi
  if [[ "$file" =~ $DOCS || "$file" =~ $TESTS ]]; then continue; fi
  if [[ "$file" =~ $CONFIGS ]]; then thresholds=true; continue; fi
  problem "changes $file, which isn't docs or tests"
done < <(git diff --name-only --no-renames "$mb" HEAD)

if ! diff -q <(git show "$mb:$ROADMAP" | how_work_runs) <(how_work_runs < "$ROADMAP") >/dev/null; then
  problem "changes \"How work runs\" in $ROADMAP, which agents follow as rules"
fi

if $thresholds && ! git show "$base:.github/scripts/check-test-gap-scope.sh" | bash -s "$base"; then
  problem "changes a coverage config beyond raising its thresholds"
fi
if ! git show "$base:.github/scripts/check-tests-kept.sh" | THRESHOLDS_CHECKED=$thresholds bash -s "$base"; then
  problem "weakens the tests"
fi

if ((fail)); then exit 1; fi
echo "Docs and tests only at $(git rev-parse HEAD)."
