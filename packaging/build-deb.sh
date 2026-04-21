#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "==> Compilation du paquet Tauri natif..."
cd "${REPO_ROOT}"
npm run tauri build -- --bundles deb

DEB_DIR="${REPO_ROOT}/src-tauri/target/release/bundle/deb"
DEB_FILE=$(find "${DEB_DIR}" -name "*.deb" -type f | head -n 1)

if [[ -z "${DEB_FILE}" ]]; then
  echo "Erreur: Aucun fichier .deb trouvé dans ${DEB_DIR}"
  exit 1
fi

echo "==> Injection des scripts Debian dans ${DEB_FILE}..."
TMP_DIR=$(mktemp -d)
dpkg-deb -R "${DEB_FILE}" "${TMP_DIR}"

cp "${SCRIPT_DIR}/debian/postinst" "${TMP_DIR}/DEBIAN/postinst"
cp "${SCRIPT_DIR}/debian/prerm" "${TMP_DIR}/DEBIAN/prerm"
cp "${SCRIPT_DIR}/debian/postrm" "${TMP_DIR}/DEBIAN/postrm"

chmod 755 "${TMP_DIR}/DEBIAN/postinst"
chmod 755 "${TMP_DIR}/DEBIAN/prerm"
chmod 755 "${TMP_DIR}/DEBIAN/postrm"

# Repackage le deb par dessus l'ancien
dpkg-deb -b "${TMP_DIR}" "${DEB_FILE}"

rm -rf "${TMP_DIR}"

echo "==> Terminé ! Le paquet final est prêt: ${DEB_FILE}"
