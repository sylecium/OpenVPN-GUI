import { byId } from "../lib/dom";
import * as backend from "../api/backend";
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
import { bindSettingsModal, openSettingsModal } from "../ui/settings-modal";
import { setFeedback } from "../ui/feedback";
import { t } from "../i18n";
import * as settings from "../lib/settings";
import { session } from "../state/session";
import { getVersion } from "@tauri-apps/api/app";
import { checkForAppUpdate } from "./updater";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { applyPickedProfile } from "../commands/profiles";

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
      openProfileEditModal(
        editBtn.dataset.path,
        editBtn.dataset.customDisplay ?? "",
        editBtn.dataset.group ?? "",
      );
      return;
    }
    const item = target.closest(".vpn-item[data-path]");
    if (item instanceof HTMLLIElement && item.dataset.path) {
      onServerSelectChange(item.dataset.path);
      return;
    }
    if (target.closest(".vpn-item--demo")) {
      setFeedback(t("feedback.demoHint"), true);
    }
  });
}

export function bootstrapApp(): void {
  initThemeToggle();

  void getVersion().then((v) => {
    const el = byId<HTMLElement>("app-version");
    if (el) el.textContent = `v${v}`;
  });

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
  bindSettingsModal();

  const appWindow = getCurrentWindow();
  void appWindow.onDragDropEvent((event) => {
    const overlay = byId<HTMLElement>("drag-drop-overlay");
    if (event.payload.type === "enter") {
      overlay.classList.remove("hidden");
    } else if (event.payload.type === "leave") {
      overlay.classList.add("hidden");
    } else if (event.payload.type === "drop") {
      overlay.classList.add("hidden");
      const paths = event.payload.paths;
      if (paths.length > 0) {
        const path = paths[0];
        if (path.endsWith(".ovpn") || path.endsWith(".conf")) {
          void applyPickedProfile(path);
        }
      }
    }
  });

  const settingsBtn = byId<HTMLButtonElement>("settings-btn");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      openSettingsModal();
    });
  }

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
  void checkForAppUpdate();

  // Auto-connect on startup logic
  const sett = settings.getSettings();
  if (sett.autoConnect && session.lastKnownStatus === "idle") {
    const last = settings.getLastUsedProfile();
    if (last) {
      console.log("Auto-connecting to:", last);
      backend.apiVpnConnect(last).catch((err) => {
        console.error("Auto-connect failed:", err);
      });
    }
  }
}

/**
 * Adaptive polling scheduler.
 *
 * Intervals by VPN status:
 *  - idle      : status every 8 s, traffic OFF (zero IPC calls)
 *  - connecting: status every 1.5 s, traffic OFF
 *  - connected : status+logs every 3 s, traffic every 2 s
 *  - error     : status every 5 s, traffic OFF
 *
 * Using recursive setTimeout instead of setInterval so that overlapping calls
 * cannot pile up when an IPC round-trip takes longer than the interval.
 */
export function startIntervals(): void {
  function statusDelay(): number {
    switch (session.lastKnownStatus) {
      case "connected":   return 3000;
      case "connecting":  return 1500;
      case "error":       return 5000;
      default:            return 8000; // idle
    }
  }

  function trafficActive(): boolean {
    return session.lastKnownStatus === "connected";
  }

  function scheduleStatus(): void {
    setTimeout(async () => {
      await refreshStatus();
      if (session.lastKnownStatus === "connected") {
        await refreshLogs();
      }
      scheduleStatus();
    }, statusDelay());
  }

  function scheduleTraffic(): void {
    setTimeout(async () => {
      if (trafficActive()) {
        await refreshTrafficStats();
      }
      // Re-check every 2 s whether traffic polling should run
      scheduleTraffic();
    }, 2000);
  }

  scheduleStatus();
  scheduleTraffic();
}
