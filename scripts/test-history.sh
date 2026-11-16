#!/usr/bin/env bash
# For each PR merged into main, count the source and test files it changed.
# Shows whether tests arrived with each change rather than in one final batch.
# Output is a Markdown table: paste it into the iteration's metrics report.
set -euo pipefail

is_test='(^|/)(tests?|__tests__|e2e)/|\.(test|spec)\.[jt]s$'
is_src='^apps/[^/]+/src/.*\.(ts|vue)$'

echo "| Date | PR | Title | Source files | Test files | Tests? |"
echo "|---|---|---|---:|---:|:-:|"
git log main --first-parent --merges --date=short \
  --pretty=format:'%h%x09%ad%x09%s' | while IFS=$'\t' read -r sha date subject; do
  files=$(git diff --name-only "$sha^1" "$sha" -- apps)
  tests=$(grep -cE "$is_test" <<<"$files" || true)
  src=$(grep -E "$is_src" <<<"$files" | grep -cvE "$is_test" || true)
  [ "$src" -eq 0 ] && [ "$tests" -eq 0 ] && continue
  pr=$(grep -oE '#[0-9]+' <<<"$subject" | head -1 || true)
  branch=${subject##* from }
  flag=$([ "$tests" -gt 0 ] && echo yes || echo no)
  echo "| $date | ${pr:-$sha} | ${branch#*/} | $src | $tests | $flag |"
done
