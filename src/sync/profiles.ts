import * as backend from "../api/backend";
import { basename, profileDisplayLabel } from "../lib/format";
import type { RecentProfile } from "../types/ipc";
import { byId } from "../lib/dom";
import { setFeedback } from "../ui/feedback";
import { refreshServerMetaForProfile, resetServerMetaEmpty } from "../ui/server-meta-view";
import { createVpnSidebarRow } from "../ui/ovpn-row";
import { syncVpnListRowStatusTexts, syncProfileStatusIndicator } from "./status";

let vpnListDragAbort: AbortController | null = null;

function collectPathsFromVpnList(list: HTMLElement): string[] {
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

function getDragAfterElement(list: HTMLElement, y: number): HTMLLIElement | null {
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
  const list = byId<HTMLElement>("vpn-list");
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
      const dragging = document.querySelector<HTMLElement>(".vpn-item--dragging");
      if (!dragging) {
        return;
      }
      
      const targetUl = (event.target as HTMLElement).closest("ul.vpn-group-list") as HTMLElement | null;
      const container = targetUl ?? list.querySelector<HTMLElement>(".root-group-list");
      if (!container) return;

      const after = getDragAfterElement(container, event.clientY);
      if (after == null) {
        container.append(dragging);
      } else if (after !== dragging) {
        container.insertBefore(dragging, after);
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
      const li = el.closest<HTMLLIElement>("li.vpn-item[data-path]");
      li?.classList.remove("vpn-item--dragging");
      
      if (!li) return;

      const snapshot = orderAtDragStart;
      orderAtDragStart = [];
      if (snapshot.length === 0) {
        return;
      }

      const newUl = li.closest("ul.vpn-group-list");
      let newGroup: string | null = null;
      if (newUl && !newUl.classList.contains("root-group-list")) {
        const details = newUl.closest("details");
        if (details) {
          const titleEl = details.querySelector(".vpn-group-title");
          newGroup = titleEl?.textContent || null;
        }
      }

      const draggedPath = li.dataset.path || "";
      const btn = li.querySelector<HTMLButtonElement>("button[data-ovpn-action='edit']");
      const oldGroup = btn?.dataset.group || null;

      const nowOrder = collectPathsFromVpnList(list);
      const orderChanged = !pathsEqual(nowOrder, snapshot);
      const groupChanged = (newGroup || "") !== (oldGroup || "");

      if (!orderChanged && !groupChanged) {
        return;
      }

      void (async () => {
        try {
          if (groupChanged) {
             const customDisplay = btn?.dataset.customDisplay || null;
             await backend.apiSetProfileMetadata(draggedPath, customDisplay, newGroup);
          }
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

export function syncVpnSidebarFromProfilePath(): void {
  syncContentVisibility();
  syncVpnListSelectionHighlight();
  syncVpnListRowStatusTexts();
  syncProfileStatusIndicator();
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

    const list = byId<HTMLElement>("vpn-list");
    list.replaceChildren();

    if (recent.length === 0) {
      for (const name of DEMO_OVPN_NAMES) {
        list.append(createVpnSidebarRow({ path: `/exemple/${name}`, isDemo: true }));
      }
      syncVpnSidebarFromProfilePath();
      return;
    }

    const groups = new Map<string, HTMLElement[]>();
    const rootItems: HTMLElement[] = [];

    for (const profile of recent) {
      const row = createVpnSidebarRow({
        path: profile.path,
        displayName: profile.displayName,
        group: profile.group,
      });

      if (profile.group) {
        if (!groups.has(profile.group)) {
          groups.set(profile.group, []);
        }
        groups.get(profile.group)!.push(row);
      } else {
        rootItems.push(row);
      }
    }

    const sortedGroups = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));

    for (const groupName of sortedGroups) {
      const details = document.createElement("details");
      details.className = "vpn-group";
      details.open = true;

      const summary = document.createElement("summary");
      summary.className = "vpn-group-header";
      
      const icon = document.createElement("span");
      icon.className = "vpn-group-icon";
      icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
      
      const title = document.createElement("span");
      title.className = "vpn-group-title";
      title.textContent = groupName;
      
      summary.append(icon, title);

      const ul = document.createElement("ul");
      ul.className = "vpn-group-list";
      ul.append(...groups.get(groupName)!);

      details.append(summary, ul);
      list.append(details);
    }

    const ulRoot = document.createElement("ul");
    ulRoot.className = "vpn-group-list root-group-list";
    if (rootItems.length > 0) {
      ulRoot.append(...rootItems);
    }
    list.append(ulRoot);

    initVpnListDragDrop();
    syncVpnSidebarFromProfilePath();
  } catch (error) {
    setFeedback(String(error), true);
  }
}
