#!/usr/bin/env bash
# Checks that every non-merge commit in a range follows Conventional Commits:
#   <type>(<optional scope>)!: <description>
# GitHub's own "Revert "..."" messages are accepted too.
#
#   scripts/check-commits.sh origin/main..HEAD
set -euo pipefail

range=${1:?usage: scripts/check-commits.sh <base>..<head>}
types='build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test'
pattern="^(($types)(\([a-z0-9._/-]+\))?!?: [^ ].*|Revert \".+\")$"

failed=0
while IFS= read -r line; do
  sha=${line%% *}
  subject=${line#* }
  if ! grep -qE "$pattern" <<<"$subject"; then
    echo "::error::${sha:0:7} \"$subject\" does not follow <type>(<scope>): <description> (types: ${types//|/, })"
    failed=1
  fi
done < <(git log --no-merges --format='%H %s' "$range")

if [ "$failed" -eq 0 ]; then
  echo "All commits in $range follow the convention"
fi
exit "$failed"
