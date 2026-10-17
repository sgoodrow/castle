#!/usr/bin/env bash
# Fails when a branch weakens the tests instead of fixing the code: it deletes a test file, has
# fewer test cases in one, skips or focuses tests, or edits the test and coverage settings.
# The Test workflow runs it on auto-fix/* branches, which Claude writes (.github/workflows/auto-fix.yml).
set -euo pipefail

base="${1:-origin/main}"
mb=$(git merge-base "$base" HEAD)
fail=0
problem() { echo "::error::$1"; fail=1; }

TESTS='\.test\.(ts|tsx)$'
SETTINGS='^(jest\.config\.js|bank/web/vite\.config\.ts|package\.json|bank/web/package\.json|\.github/)'
CASE='^\s*(it|test)(\.each\(.*\))?\(' # one test case per line, as the tests here are written

while IFS=$'\t' read -r status path rest; do
  case "$status" in
    D*) if [[ "$path" =~ $TESTS ]]; then problem "deletes test file $path"; fi ;;
    R*) if [[ "$path" =~ $TESTS && ! "$rest" =~ $TESTS ]]; then problem "renames test file $path to $rest"; fi ;;
  esac
  for file in "$path" ${rest:+"$rest"}; do
    if [[ "$file" =~ $SETTINGS ]]; then problem "changes $file (test, coverage or CI settings)"; fi
  done
done < <(git diff --name-status "$mb" HEAD)

while read -r path; do
  [[ "$path" =~ $TESTS ]] || continue
  before=$(git show "$mb:$path" 2>/dev/null | grep -cE "$CASE" || true)
  after=$(grep -cE "$CASE" "$path" || true)
  if ((after < before)); then problem "$path has $after test cases, down from $before"; fi
done < <(git diff --name-only --diff-filter=M "$mb" HEAD)

if git diff -U0 "$mb" HEAD -- '*.test.ts' '*.test.tsx' | grep -E '^\+' | grep -qE '\b(it|test|describe)\.(skip|only|todo)\b|\bx(it|test|describe)\('; then
  problem "skips or focuses tests (.skip, .only, .todo, xit)"
fi

if ((fail)); then exit 1; fi
echo "Tests kept: nothing deleted, skipped or loosened."
