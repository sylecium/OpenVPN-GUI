#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="openvpn-gui-daemon.service"
INSTALL_BIN="/usr/sbin/openvpn-gui-daemon"
CONFIG_DIR="/etc/openvpn-gui"
SERVICE_PATH="/etc/systemd/system/${SERVICE_NAME}"
RUNTIME_DIR="/run/openvpn-gui"

echo "==> Stopping and disabling service ${SERVICE_NAME}..."
sudo systemctl stop "${SERVICE_NAME}" || true
sudo systemctl disable "${SERVICE_NAME}" || true

echo "==> Removing systemd service file..."
if [[ -f "${SERVICE_PATH}" ]]; then
  sudo rm -f "${SERVICE_PATH}"
fi

echo "==> Reloading systemd daemon..."
sudo systemctl daemon-reload

echo "==> Removing daemon binary..."
if [[ -f "${INSTALL_BIN}" ]]; then
  sudo rm -f "${INSTALL_BIN}"
fi

echo "==> Removing configuration directory..."
if [[ -d "${CONFIG_DIR}" ]]; then
  sudo rm -rf "${CONFIG_DIR}"
fi

echo "==> Removing runtime directory..."
if [[ -d "${RUNTIME_DIR}" ]]; then
  sudo rm -rf "${RUNTIME_DIR}"
fi

echo "==> Daemon successfully uninstalled."
