#!/usr/bin/env bash
# Prints the next version tag (vMAJOR.MINOR.PATCH) from the conventional
# commits since the latest v* tag:
#   - "type!:" or a "BREAKING CHANGE" footer bumps MAJOR
#   - "feat:" bumps MINOR
#   - anything else bumps PATCH
# While MAJOR is 0, a breaking change bumps MINOR instead (semver 0.x rule).
# With no tag yet, the first version is v0.1.0.
#
#   scripts/next-version.sh [<commit>]   (default HEAD)
set -euo pipefail

target=${1:-HEAD}
last=$(git describe --tags --abbrev=0 --match 'v[0-9]*.[0-9]*.[0-9]*' "$target" 2>/dev/null || true)

if [ -z "$last" ]; then
  echo v0.1.0
  exit 0
fi

IFS=. read -r major minor patch <<<"${last#v}"
log=$(git log --no-merges --format='%s%n%b%n--' "$last..$target")

if [ -z "$log" ]; then
  echo "$last"
  exit 0
fi

if grep -qE '^[a-z]+(\([^)]*\))?!:|^BREAKING[ -]CHANGE:' <<<"$log"; then
  if [ "$major" -eq 0 ]; then
    minor=$((minor + 1)) patch=0
  else
    major=$((major + 1)) minor=0 patch=0
  fi
elif grep -qE '^feat(\([^)]*\))?:' <<<"$log"; then
  minor=$((minor + 1)) patch=0
else
  patch=$((patch + 1))
fi

echo "v$major.$minor.$patch"
