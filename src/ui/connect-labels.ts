import type { VpnStatus } from "../types/ipc";
import { assertNever } from "../lib/assert";
import { byId } from "../lib/dom";
import { t } from "../i18n";

export function updateConnectLabels(status: VpnStatus): void {
  const sub = byId<HTMLElement>("connect-sub");
  const btn = byId<HTMLButtonElement>("connect-btn");
  const txt = byId<HTMLElement>("connect-btn-text");
  btn.classList.remove("connected");

  switch (status) {
    case "idle":
      txt.textContent = t("btn.connect");
      sub.textContent = "Ready to establish a session.";
      btn.setAttribute("aria-pressed", "false");
      break;
    case "connecting":
      txt.textContent = t("status.connecting");
      sub.textContent = "Negotiating with the server...";
      btn.setAttribute("aria-pressed", "false");
      break;
    case "connected":
      txt.textContent = t("btn.disconnect");
      sub.textContent = "Active VPN session.";
      btn.classList.add("connected");
      btn.setAttribute("aria-pressed", "true");
      break;
    case "error":
      txt.textContent = t("btn.connect");
      sub.textContent = "Check profile or logs.";
      btn.setAttribute("aria-pressed", "false");
      break;
    default:
      assertNever(status);
  }
}
