import * as backend from "../api/backend";
import { basename, profileDisplayLabel } from "../lib/format";
import type { RecentProfile } from "../types/ipc";
import { byId } from "../lib/dom";
import { setFeedback } from "../ui/feedback";
import { updateServerMetaForFilename, resetServerMetaEmpty } from "../ui/server-meta-view";
import { createVpnSidebarRow } from "../ui/ovpn-row";
import { syncVpnListRowStatusTexts } from "./status";

const DEMO_OVPN_NAMES = [
  "work-paris-france.ovpn",
  "home-udp.ovpn",
  "backup-amsterdam-nl.ovpn",
];

export function syncContentVisibility(): void {
  const path = byId<HTMLInputElement>("profile-path").value.trim();
  const empty = byId<HTMLElement>("empty-state");
  const content = byId<HTMLElement>("content-view");
  const has = path.length > 0;
  empty.classList.toggle("hidden", has);
  content.classList.toggle("hidden", !has);
  if (has) {
    const select = byId<HTMLSelectElement>("server-select");
    const opt = select.selectedOptions[0];
    const label =
      opt && opt.value === path && opt.textContent?.trim()
        ? opt.textContent.trim()
        : basename(path);
    byId<HTMLElement>("current-vpn-name").textContent = label;
    byId<HTMLElement>("current-vpn-path").textContent = path;
  }
}

function syncVpnListSelectionHighlight(): void {
  const current = byId<HTMLInputElement>("profile-path").value;
  for (const li of document.querySelectorAll<HTMLLIElement>("#vpn-list .vpn-item")) {
    const p = li.dataset.path;
    li.classList.toggle("vpn-item--active", !!p && p === current);
  }
}

/** Après changement de chemin ou rechargement de la liste : panneau principal + surbrillance liste. */
export function syncVpnSidebarFromProfilePath(): void {
  syncContentVisibility();
  syncVpnListSelectionHighlight();
  syncVpnListRowStatusTexts();
}

export function fillServerSelect(recent: RecentProfile[]): void {
  const select = byId<HTMLSelectElement>("server-select");
  const previous = byId<HTMLInputElement>("profile-path").value;
  const paths = recent.map((item) => item.path);
  select.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Choisir un profil .ovpn";
  select.append(placeholder);

  for (const profile of recent) {
    const option = document.createElement("option");
    option.value = profile.path;
    option.textContent = profileDisplayLabel(profile.path, profile.displayName);
    select.append(option);
  }

  if (paths.includes(previous)) {
    select.value = previous;
  } else if (paths.length > 0) {
    select.selectedIndex = 1;
    byId<HTMLInputElement>("profile-path").value = paths[0] ?? "";
  } else {
    byId<HTMLInputElement>("profile-path").value = "";
  }

  const path = byId<HTMLInputElement>("profile-path").value;
  if (path) {
    updateServerMetaForFilename(basename(path));
  } else {
    resetServerMetaEmpty();
  }

  syncVpnSidebarFromProfilePath();
}

export async function refreshRecentProfiles(): Promise<void> {
  try {
    const recent = await backend.apiRecentProfiles();
    fillServerSelect(recent);

    const list = byId<HTMLUListElement>("vpn-list");
    list.replaceChildren();

    if (recent.length === 0) {
      for (const name of DEMO_OVPN_NAMES) {
        list.append(createVpnSidebarRow({ path: `/exemple/${name}`, isDemo: true }));
      }
      syncVpnSidebarFromProfilePath();
      return;
    }

    for (const profile of recent) {
      list.append(
        createVpnSidebarRow({
          path: profile.path,
          displayName: profile.displayName,
        }),
      );
    }
    syncVpnSidebarFromProfilePath();
  } catch (error) {
    setFeedback(String(error), true);
  }
}
