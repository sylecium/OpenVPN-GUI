import * as backend from "../api/backend";
import { basename, profileDisplayLabel } from "../lib/format";
import type { RecentProfile } from "../types/ipc";
import { byId } from "../lib/dom";
import { setFeedback } from "../ui/feedback";
import { refreshServerMetaForProfile, resetServerMetaEmpty } from "../ui/server-meta-view";
import { createVpnSidebarRow } from "../ui/ovpn-row";
import { syncVpnListRowStatusTexts } from "./status";

let vpnListDragAbort: AbortController | null = null;

function collectPathsFromVpnList(list: HTMLUListElement): string[] {
  return [...list.querySelectorAll<HTMLLIElement>(".vpn-item[data-path]")]
    .map((li) => li.dataset.path)
    .filter((path): path is string => Boolean(path));
}

function pathsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

function getDragAfterElement(list: HTMLUListElement, y: number): HTMLLIElement | null {
  const candidates = [
    ...list.querySelectorAll<HTMLLIElement>(".vpn-item[data-path]:not(.vpn-item--dragging)"),
  ];
  let closest: { offset: number; element: HTMLLIElement | null } = {
    offset: Number.NEGATIVE_INFINITY,
    element: null,
  };
  for (const child of candidates) {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      closest = { offset, element: child };
    }
  }
  return closest.element;
}

/** Réordonnancement par glisser-déposer (profils enregistrés uniquement). */
function initVpnListDragDrop(): void {
  const list = byId<HTMLUListElement>("vpn-list");
  vpnListDragAbort?.abort();
  vpnListDragAbort = new AbortController();
  const { signal } = vpnListDragAbort;

  const rows = list.querySelectorAll<HTMLLIElement>(".vpn-item[data-path]");
  if (rows.length < 2) {
    return;
  }

  let orderAtDragStart: string[] = [];

  list.addEventListener(
    "dragstart",
    (event) => {
      const raw = (event.target as HTMLElement | null)?.closest("li.vpn-item[data-path]");
      const from = raw instanceof HTMLLIElement ? raw : null;
      if (!from || !list.contains(from)) {
        return;
      }
      orderAtDragStart = collectPathsFromVpnList(list);
      from.classList.add("vpn-item--dragging");
      event.dataTransfer?.setData("text/plain", from.dataset.path ?? "");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
      }
    },
    { signal, capture: true },
  );

  list.addEventListener(
    "dragover",
    (event) => {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
      const dragging = list.querySelector<HTMLElement>(".vpn-item--dragging");
      if (!dragging || !list.contains(dragging)) {
        return;
      }
      const after = getDragAfterElement(list, event.clientY);
      if (after == null) {
        list.append(dragging);
      } else if (after !== dragging) {
        list.insertBefore(dragging, after);
      }
    },
    { signal },
  );

  list.addEventListener(
    "drop",
    (event) => {
      event.preventDefault();
    },
    { signal },
  );

  list.addEventListener(
    "dragend",
    (event) => {
      const el = event.target;
      if (!(el instanceof HTMLElement)) {
        return;
      }
      const li = el.closest("li.vpn-item[data-path]");
      li?.classList.remove("vpn-item--dragging");
      const snapshot = orderAtDragStart;
      orderAtDragStart = [];
      if (snapshot.length === 0) {
        return;
      }
      const nowOrder = collectPathsFromVpnList(list);
      if (pathsEqual(nowOrder, snapshot)) {
        return;
      }
      void (async () => {
        try {
          await backend.apiReorderRecentProfiles(nowOrder);
          const recent = await backend.apiRecentProfiles();
          fillServerSelect(recent);
          syncVpnSidebarFromProfilePath();
        } catch (err) {
          setFeedback(String(err), true);
          await refreshRecentProfiles();
        }
      })();
    },
    { signal },
  );
}

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
    refreshServerMetaForProfile(path);
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
    initVpnListDragDrop();
    syncVpnSidebarFromProfilePath();
  } catch (error) {
    setFeedback(String(error), true);
  }
}
