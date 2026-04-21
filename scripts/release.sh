#!/usr/bin/env bash
# scripts/release.sh — Bump version, commit, tag, and push to trigger CI release.
#
# Usage:
#   npm run release -- patch      # 0.1.0 → 0.1.1
#   npm run release -- minor      # 0.1.0 → 0.2.0
#   npm run release -- major      # 0.1.0 → 1.0.0
#   npm run release -- 0.3.1      # explicit version
#
set -euo pipefail

BUMP="${1:-}"

if [[ -z "$BUMP" ]]; then
  echo "Usage: npm run release -- <patch|minor|major|x.y.z>"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

# ── Sanity checks ──────────────────────────────────────────────────────────────
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: working tree has uncommitted changes. Commit or stash first."
  exit 1
fi

# ── Compute new version ────────────────────────────────────────────────────────
CURRENT="$(node -p "require('./package.json').version")"

if [[ "$BUMP" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  NEW_VERSION="$BUMP"
else
  IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
  case "$BUMP" in
    patch) PATCH=$((PATCH + 1)) ;;
    minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
    major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
    *)
      echo "Error: unknown bump type '$BUMP'. Use patch, minor, major, or x.y.z."
      exit 1
      ;;
  esac
  NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"
fi

echo "==> Bumping version: ${CURRENT} → ${NEW_VERSION}"

# ── Update package.json ────────────────────────────────────────────────────────
# Use npm version to write package.json (no tag, no commit yet)
npm version "${NEW_VERSION}" --no-git-tag-version --allow-same-version

# ── Update tauri.conf.json ─────────────────────────────────────────────────────
TAURI_CONF="${REPO_ROOT}/src-tauri/tauri.conf.json"
if command -v jq &>/dev/null; then
  tmp=$(mktemp)
  jq --arg v "$NEW_VERSION" '.version = $v' "${TAURI_CONF}" > "$tmp"
  mv "$tmp" "${TAURI_CONF}"
else
  # Fallback: portable sed (handles both GNU and BSD sed via temp file)
  sed -i.bak "s/\"version\": \"${CURRENT}\"/\"version\": \"${NEW_VERSION}\"/" "${TAURI_CONF}"
  rm -f "${TAURI_CONF}.bak"
fi

echo "    package.json      → ${NEW_VERSION}"
echo "    tauri.conf.json   → ${NEW_VERSION}"

# ── Commit & tag ───────────────────────────────────────────────────────────────
git add package.json src-tauri/tauri.conf.json
git commit -m "chore(release): v${NEW_VERSION}"
git tag "v${NEW_VERSION}"

echo "==> Created commit and tag v${NEW_VERSION}"
echo ""
echo "Push to trigger the GitHub Actions release:"
echo "  git push origin main --tags"
