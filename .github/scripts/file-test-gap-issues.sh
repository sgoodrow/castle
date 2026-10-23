#!/usr/bin/env bash
# Files the test-gap drafts Claude wrote, at most the number of issues left for today. Claude has no
# permission to file issues itself, so this is the only place they're made, and the cap holds
# however many drafts Claude writes. The Test gaps workflow (.github/workflows/test-gaps.yml) runs it.
# Usage: file-test-gap-issues.sh <drafts directory> <issues left today>
# Each draft is a Markdown file: its first line is "# <title>", and the rest is the issue's body.
set -euo pipefail

drafts="$1"
left="$2"
shopt -s nullglob

filed=0
for draft in "$drafts"/*.md; do
  if ((filed == left)); then break; fi
  body=$(mktemp)
  tail -n +2 "$draft" > "$body"
  title=$(head -n 1 "$draft" | sed -E 's/^#+ *//')
  gh issue create --label test-gap --title "$title" --body-file "$body"
  rm -f "$body"
  filed=$((filed + 1))
done
echo "Filed $filed issue(s); $((left - filed)) left under today's cap."
