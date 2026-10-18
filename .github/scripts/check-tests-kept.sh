#!/usr/bin/env bash
# Fails when a branch weakens the tests instead of fixing the code: it deletes a test or feature
# file, has fewer test cases, scenarios or examples in one, skips or focuses tests, or edits the
# test and coverage settings.
# The Test workflow runs it on auto-fix/* and test-gap/* branches, which Claude writes
# (.github/workflows/auto-fix.yml). With THRESHOLDS_CHECKED=true the two coverage configs may change,
# because check-test-gap-scope.sh checks that a test-gap branch only raises their thresholds.
set -euo pipefail

base="${1:-origin/main}"
mb=$(git merge-base "$base" HEAD)
fail=0
problem() { echo "::error::$1"; fail=1; }

TESTS='\.test\.(ts|tsx)$'
SETTINGS='^(vitest\.config\.mts|bank/web/vite\.config\.ts|package\.json|bank/web/package\.json|\.github/)'
if [[ "${THRESHOLDS_CHECKED:-}" == true ]]; then SETTINGS='^(package\.json|bank/web/package\.json|\.github/)'; fi
CASE='^\s*(it|test)(\.each\(.*\))?\(' # one test case per line, as the tests here are written
FEATURES='\.feature$'
SCENARIO='^\s*(Scenario|Scenario Outline|Scenario Template|Example):'

# The rows of every Examples table in a feature, less each table's header row.
examples() {
  awk '/^[[:space:]]*(Examples|Scenarios):/ { table = 1; header = 1; next }
       table && /^[[:space:]]*\|/ { if (header) header = 0; else rows++; next }
       table && !/^[[:space:]]*(#.*)?$/ { table = 0 }
       END { print rows + 0 }'
}

while IFS=$'\t' read -r status path rest; do
  case "$status" in
    D*)
      if [[ "$path" =~ $TESTS ]]; then problem "deletes test file $path"; fi
      if [[ "$path" =~ $FEATURES ]]; then problem "deletes feature file $path"; fi
      ;;
    R*)
      if [[ "$path" =~ $TESTS && ! "$rest" =~ $TESTS ]]; then problem "renames test file $path to $rest"; fi
      if [[ "$path" =~ $FEATURES && ! "$rest" =~ $FEATURES ]]; then problem "renames feature file $path to $rest"; fi
      ;;
  esac
  for file in "$path" ${rest:+"$rest"}; do
    if [[ "$file" =~ $SETTINGS ]]; then problem "changes $file (test, coverage or CI settings)"; fi
  done
done < <(git diff --name-status "$mb" HEAD)

# Changed files, and renamed ones under their new name, against what they held before.
while IFS=$'\t' read -r status old new; do
  path="${new:-$old}"
  if [[ "$path" =~ $TESTS ]]; then
    before=$(git show "$mb:$old" 2>/dev/null | grep -cE "$CASE" || true)
    after=$(grep -cE "$CASE" "$path" || true)
    if ((after < before)); then problem "$path has $after test cases, down from $before"; fi
  fi
  if [[ "$path" =~ $FEATURES ]]; then
    before=$(git show "$mb:$old" 2>/dev/null | grep -cE "$SCENARIO" || true)
    after=$(grep -cE "$SCENARIO" "$path" || true)
    if ((after < before)); then problem "$path has $after scenarios, down from $before"; fi
    before=$(git show "$mb:$old" 2>/dev/null | examples)
    after=$(examples < "$path")
    if ((after < before)); then problem "$path has $after examples, down from $before"; fi
  fi
done < <(git diff --name-status --diff-filter=MR "$mb" HEAD)

if git diff -U0 "$mb" HEAD -- '*.test.ts' '*.test.tsx' | grep -E '^\+' | grep -qE '\b(it|test|describe)\.(skip|only|todo)\b|\bx(it|test|describe)\('; then
  problem "skips or focuses tests (.skip, .only, .todo, xit)"
fi

if git diff -U0 "$mb" HEAD -- '*.feature' | grep -E '^\+' | grep -qE '(^\+|\s)@(skip|ignore|only)\b'; then
  problem "skips or focuses scenarios (@skip, @ignore, @only)"
fi

if ((fail)); then exit 1; fi
echo "Tests kept: nothing deleted, skipped or loosened."
