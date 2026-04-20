import { profileDisplayLabel } from "../lib/format";

const SVG_NS = "http://www.w3.org/2000/svg";

function svgIcon(paths: { tag: string; attrs: Record<string, string> }[]): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("aria-hidden", "true");
  for (const p of paths) {
    const el = document.createElementNS(SVG_NS, p.tag);
    for (const [k, v] of Object.entries(p.attrs)) {
      el.setAttribute(k, v);
    }
    svg.append(el);
  }
  return svg;
}

function appendKeyIcon(container: HTMLElement): void {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "vpn-icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute(
    "d",
    "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
  );
  svg.append(path);
  container.append(svg);
}

function pencilIcon(): SVGSVGElement {
  return svgIcon([
    { tag: "path", attrs: { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" } },
    { tag: "path", attrs: { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" } },
  ]);
}

function trashIcon(): SVGSVGElement {
  return svgIcon([
    { tag: "polyline", attrs: { points: "3 6 5 6 21 6" } },
    {
      tag: "path",
      attrs: { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" },
    },
  ]);
}

export function createVpnSidebarRow(profile: {
  path: string;
  displayName?: string | null;
  isDemo?: boolean;
}): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "vpn-item";
  if (profile.isDemo) {
    li.classList.add("vpn-item--demo");
  } else {
    li.dataset.path = profile.path;
  }

  const left = document.createElement("div");
  left.className = "vpn-item-left";
  appendKeyIcon(left);

  const info = document.createElement("div");
  info.className = "vpn-info";
  const name = document.createElement("span");
  name.className = "vpn-name";
  name.textContent = profileDisplayLabel(profile.path, profile.displayName);
  const statusText = document.createElement("span");
  statusText.className = "vpn-status-text";
  statusText.textContent = profile.isDemo ? "Exemple" : "Hors ligne";
  info.append(name, statusText);
  left.append(info);

  const actions = document.createElement("div");
  actions.className = "row-actions";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "row-action row-action--edit";
  editBtn.dataset.ovpnAction = "edit";
  editBtn.setAttribute("aria-label", "Modifier le profil (nom affiché, chemin)");
  editBtn.append(pencilIcon());
  if (profile.isDemo) {
    editBtn.disabled = true;
    editBtn.title = "Exemple non enregistré";
  } else {
    editBtn.dataset.path = profile.path;
    const custom = profile.displayName?.trim();
    if (custom) {
      editBtn.dataset.customDisplay = custom;
    }
  }

  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "row-action row-action--remove";
  delBtn.dataset.ovpnAction = "remove";
  delBtn.setAttribute("aria-label", "Retirer de la liste");
  delBtn.append(trashIcon());
  if (profile.isDemo) {
    delBtn.disabled = true;
    delBtn.title = "Exemple non enregistré";
  } else {
    delBtn.dataset.path = profile.path;
  }

  actions.append(editBtn, delBtn);
  li.append(left, actions);
  return li;
}
