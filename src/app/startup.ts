import { byId } from "../lib/dom";
import { onPowerClick } from "../commands/vpn";
import {
  browseForProfile,
  onServerSelectChange,
  removeProfileFromRecents,
} from "../commands/profiles";
import { bindProfileEditModal, openProfileEditModal } from "../ui/profile-edit-modal";
import { refreshRecentProfiles } from "../sync/profiles";
import { clearHistoryStorage, refreshHistory } from "../sync/history";
import { refreshStatus } from "../sync/status";
import { refreshLogs, clearLogsView, copyLogsToClipboard } from "../sync/logs";
import { refreshTrafficStats } from "../sync/traffic";
import { initThemeToggle } from "../ui/theme";
import { setFeedback } from "../ui/feedback";

function refreshAll(): void {
  void refreshStatus();
  void refreshLogs();
  void refreshHistory();
  void refreshRecentProfiles();
}

function bindVpnListDelegation(): void {
  const list = byId<HTMLElement>("vpn-list");
  list.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const removeBtn = target.closest("button[data-ovpn-action='remove']");
    if (removeBtn instanceof HTMLButtonElement && removeBtn.dataset.path) {
      void removeProfileFromRecents(removeBtn.dataset.path);
      return;
    }
    const editBtn = target.closest("button[data-ovpn-action='edit']");
    if (editBtn instanceof HTMLButtonElement && editBtn.dataset.path) {
      openProfileEditModal(editBtn.dataset.path, editBtn.dataset.customDisplay ?? "");
      return;
    }
    const item = target.closest(".vpn-item[data-path]");
    if (item instanceof HTMLLIElement && item.dataset.path) {
      onServerSelectChange(item.dataset.path);
      return;
    }
    if (target.closest(".vpn-item--demo")) {
      setFeedback("Exemple visuel uniquement : importez un fichier .ovpn réel.", true);
    }
  });
}

export function bootstrapApp(): void {
  initThemeToggle();

  byId<HTMLButtonElement>("connect-btn").addEventListener("click", () => {
    void onPowerClick();
  });

  byId<HTMLButtonElement>("add-ovpn-btn").addEventListener("click", () => {
    void browseForProfile();
  });

  byId<HTMLSelectElement>("server-select").addEventListener("change", (event) => {
    const value = (event.target as HTMLSelectElement).value;
    onServerSelectChange(value);
  });

  byId<HTMLButtonElement>("refresh-btn").addEventListener("click", () => {
    refreshAll();
  });
  byId<HTMLButtonElement>("clear-logs").addEventListener("click", () => {
    clearLogsView();
  });
  byId<HTMLButtonElement>("copy-logs").addEventListener("click", () => {
    void copyLogsToClipboard();
  });

  bindVpnListDelegation();
  bindProfileEditModal();

  const clearHist = document.getElementById("clear-history-btn");
  if (clearHist instanceof HTMLButtonElement) {
    clearHist.addEventListener("click", () => {
      void clearHistoryStorage();
    });
  }
}

export async function runInitialSync(): Promise<void> {
  await refreshRecentProfiles();
  await refreshHistory();
  await refreshStatus();
  await refreshLogs();
}

export function startIntervals(): void {
  window.setInterval(() => {
    void refreshStatus();
    void refreshLogs();
  }, 1800);

  window.setInterval(() => {
    void refreshTrafficStats();
  }, 1000);

}
