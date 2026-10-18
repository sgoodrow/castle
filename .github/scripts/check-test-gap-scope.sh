#!/usr/bin/env bash
# Fails when a test-gap branch changes more than tests. Those branches state a product requirement
# as a scenario, so they may only touch the features (and the page's test fixtures) and raise a
# file's coverage threshold. Nothing else: no source, no other settings, no CI.
# The Test workflow runs it on test-gap/* branches, which Claude writes (.github/workflows/auto-fix.yml).
set -euo pipefail

base="${1:-origin/main}"
mb=$(git merge-base "$base" HEAD)
fail=0
problem() { echo "::error::$1"; fail=1; }

TESTS='^(bank/web/features|src/web/features|bank/web/src/__fixtures__)/'
CONFIGS='^(jest\.config\.js|bank/web/vite\.config\.ts)$'
# One file's thresholds on one line, as both configs write them:
#   './src/web/auth.ts': { lines: 100, branches: 100, functions: 100 },
THRESHOLD="^[[:space:]]*['\"][^'\"]+['\"]: \{ lines: [0-9]+, branches: [0-9]+, functions: [0-9]+ \},?[[:space:]]*$"

# Each threshold as "file lines branches functions".
thresholds() {
  grep -E "$THRESHOLD" | sed -E "s/^[[:space:]]*['\"]([^'\"]+)['\"]: \{ lines: ([0-9]+), branches: ([0-9]+), functions: ([0-9]+) \}.*/\1 \2 \3 \4/" || true
}

while IFS=$'\t' read -r status path rest; do
  for file in "$path" ${rest:+"$rest"}; do
    if [[ "$file" =~ $TESTS ]]; then continue; fi
    if [[ "$file" =~ $CONFIGS && "$status" == M* ]]; then
      # Everything but the thresholds stays as it was.
      if ! diff -q <(git show "$mb:$file" | grep -vE "$THRESHOLD") <(grep -vE "$THRESHOLD" "$file") >/dev/null; then
        problem "changes $file beyond its coverage thresholds"
      fi
      # Thresholds only go up, and none is dropped.
      while read -r name lines branches functions; do
        now=$(thresholds < "$file" | awk -v n="$name" '$1 == n { print $2, $3, $4 }')
        if [[ -z "$now" ]]; then problem "$file drops the coverage threshold for $name"; continue; fi
        read -r l b f <<< "$now"
        if ((l < lines || b < branches || f < functions)); then
          problem "$file lowers the coverage threshold for $name"
        fi
      done < <(git show "$mb:$file" | thresholds)
      continue
    fi
    problem "changes $file: a test gap may only change features, fixtures and coverage thresholds"
  done
done < <(git diff --name-status "$mb" HEAD)

if ((fail)); then exit 1; fi
echo "Test gap in scope: only tests and coverage thresholds changed."
