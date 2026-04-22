#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "==> Building native RPM package..."
cd "${REPO_ROOT}"
npm run tauri build -- --bundles rpm

echo "==> Done! RPM package is ready in src-tauri/target/release/bundle/rpm/"
