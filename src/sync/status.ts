import * as backend from "../api/backend";
import { mapStatusLabel } from "../lib/format";
import { byId } from "../lib/dom";
import { session } from "../state/session";
import { setFeedback } from "../ui/feedback";
import { updateConnectLabels } from "../ui/connect-labels";
import { t } from "../i18n";
import {
  applySessionRemoteFromStatus,
  refreshStatRemoteDisplay,
} from "../ui/server-meta-view";
import { refreshTrafficStats } from "./traffic";
import { setLastUsedProfile } from "../lib/settings";

function sameProfilePath(a: string, b: string): boolean {
  return a.trim() === b.trim();
}

export function syncVpnListRowStatusTexts(): void {
  const selected = byId<HTMLInputElement>("profile-path").value.trim();
  const st = session.lastKnownStatus;
  const active = session.lastActiveProfile;
  for (const li of document.querySelectorAll<HTMLLIElement>("#vpn-list .vpn-item[data-path]")) {
    const path = li.dataset.path;
    if (!path) {
      continue;
    }
    const sub = li.querySelector(".vpn-status-text");
    if (!sub) {
      continue;
    }
    const activeMatch = active != null && sameProfilePath(active, path);
    if (st === "connected" && activeMatch) {
      sub.textContent = t("status.connected");
    } else if (st === "connecting" && sameProfilePath(selected, path)) {
      sub.textContent = t("status.connecting");
    } else {
      sub.textContent = t("status.idle");
    }
  }
}

export function syncProfileStatusIndicator(): void {
  const root = byId<HTMLElement>("profile-status-root");
  root.classList.remove("is-online", "is-connecting", "is-error");

  const selected = byId<HTMLInputElement>("profile-path").value.trim();
  const active = session.lastActiveProfile;
  const activeMatch = active != null && selected.length > 0 && sameProfilePath(active, selected);
  const st = session.lastKnownStatus;

  if (activeMatch) {
    if (st === "connected") {
      root.classList.add("is-online");
    } else if (st === "connecting") {
      root.classList.add("is-connecting");
    } else if (st === "error") {
      root.classList.add("is-error");
    }
  }
}

export async function refreshStatus(): Promise<void> {
  try {
    const status = await backend.apiVpnStatus();
    
    session.lastKnownStatus = status.status;
    session.lastActiveProfile = status.activeProfile ?? null;
    applySessionRemoteFromStatus(status.status, status.activeProfile);

    syncProfileStatusIndicator();

    byId<HTMLElement>("status-label").textContent = mapStatusLabel(status.status);
    byId<HTMLElement>("active-profile").textContent = `Active profile (daemon): ${status.activeProfile ?? "none"}`;

    updateConnectLabels(status.status);
    syncVpnListRowStatusTexts();
    refreshStatRemoteDisplay();

    // Persist last used profile on successful connection
    if (status.status === "connected" && status.activeProfile) {
      setLastUsedProfile(status.activeProfile);
    }


    await refreshTrafficStats();
  } catch (error) {
    setFeedback(String(error), true);
  }
}
