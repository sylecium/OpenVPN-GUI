import type { VpnStatus } from "../types/ipc";
import { assertNever } from "../lib/assert";
import { byId } from "../lib/dom";

export function updateConnectLabels(status: VpnStatus): void {
  const sub = byId<HTMLElement>("connect-sub");
  const btn = byId<HTMLButtonElement>("connect-btn");
  const txt = byId<HTMLElement>("connect-btn-text");
  btn.classList.remove("connected");

  switch (status) {
    case "idle":
      txt.textContent = "Connecter";
      sub.textContent = "Prêt à établir une session.";
      btn.setAttribute("aria-pressed", "false");
      break;
    case "connecting":
      txt.textContent = "Connexion…";
      sub.textContent = "Négociation avec le serveur…";
      btn.setAttribute("aria-pressed", "false");
      break;
    case "connected":
      txt.textContent = "Déconnecter";
      sub.textContent = "Session VPN active.";
      btn.classList.add("connected");
      btn.setAttribute("aria-pressed", "true");
      break;
    case "error":
      txt.textContent = "Connecter";
      sub.textContent = "Vérifiez le profil ou les journaux.";
      btn.setAttribute("aria-pressed", "false");
      break;
    default:
      assertNever(status);
  }
}
