#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SERVICE_NAME="openvpn-gui-daemon.service"
INSTALL_BIN="/usr/sbin/openvpn-gui-daemon"
CONFIG_DIR="/etc/openvpn-gui"
CONFIG_PATH="${CONFIG_DIR}/daemon.toml"
SERVICE_PATH="/etc/systemd/system/${SERVICE_NAME}"
TARGET_USER="${SUDO_USER:-$USER}"
TARGET_UID="$(id -u "${TARGET_USER}")"

find_openvpn() {
  if command -v openvpn >/dev/null 2>&1; then
    command -v openvpn
    return 0
  fi
  for candidate in /usr/sbin/openvpn /usr/bin/openvpn /sbin/openvpn /bin/openvpn; do
    if [[ -x "${candidate}" ]]; then
      echo "${candidate}"
      return 0
    fi
  done
  return 1
}

detect_cargo_for_user() {
  if sudo -u "${TARGET_USER}" env PATH="${PATH}:${HOME:-}/.cargo/bin:/home/${TARGET_USER}/.cargo/bin" command -v cargo >/dev/null 2>&1; then
    sudo -u "${TARGET_USER}" env PATH="${PATH}:${HOME:-}/.cargo/bin:/home/${TARGET_USER}/.cargo/bin" command -v cargo
    return 0
  fi
  if command -v cargo >/dev/null 2>&1; then
    command -v cargo
    return 0
  fi
  return 1
}

if ! OPENVPN_BIN="$(find_openvpn)"; then
  echo "Erreur: openvpn est introuvable. Installe OpenVPN (paquet 'openvpn') avant de continuer."
  exit 1
fi

if ! CARGO_BIN="$(detect_cargo_for_user)"; then
  echo "Erreur: cargo est introuvable pour l'utilisateur '${TARGET_USER}'."
  echo "Conseil: lance sans sudo: npm run daemon:install"
  exit 1
fi

cd "${REPO_ROOT}/src-tauri"
sudo -u "${TARGET_USER}" env PATH="$(dirname "${CARGO_BIN}"):${PATH}" cargo build --release -p openvpn-daemon

sudo install -m 0755 "target/release/openvpn-daemon" "${INSTALL_BIN}"
sudo install -d -m 0755 "${CONFIG_DIR}"

if [[ -f "${CONFIG_PATH}" ]]; then
  sudo cp "${CONFIG_PATH}" "${CONFIG_PATH}.bak.$(date +%s)"
fi

sudo tee "${CONFIG_PATH}" >/dev/null <<EOF
socket_path = "/run/openvpn-gui/openvpn-gui.sock"
allowed_uid = ${TARGET_UID}
openvpn_binary = "${OPENVPN_BIN}"
extra_args = ["--verb", "3"]
max_logs = 500
EOF

sudo install -m 0644 "${REPO_ROOT}/systemd/openvpn-gui-daemon.service" "${SERVICE_PATH}"
sudo systemctl daemon-reload
sudo systemctl enable --now "${SERVICE_NAME}"
sudo systemctl restart "${SERVICE_NAME}"

echo "Daemon installé et actif."
echo "Service: ${SERVICE_NAME}"
echo "Utilisateur autorisé (UID): ${TARGET_UID} (${TARGET_USER})"
echo "Config: ${CONFIG_PATH}"
echo "openvpn détecté: ${OPENVPN_BIN}"
echo "cargo détecté: ${CARGO_BIN}"
