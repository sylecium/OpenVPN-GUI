import { byId } from "../lib/dom";
import * as settings from "../lib/settings";

let onDocumentKeydown: ((event: KeyboardEvent) => void) | null = null;

export function closeModal(): void {
  const root = byId<HTMLElement>("settings-modal");
  root.classList.add("hidden");
  root.setAttribute("aria-hidden", "true");
  if (onDocumentKeydown) {
    document.removeEventListener("keydown", onDocumentKeydown);
    onDocumentKeydown = null;
  }
}

export function openSettingsModal(): void {
  // Sync UI with current settings before opening
  const current = settings.getSettings();
  const autoConnect = byId<HTMLInputElement>("setting-auto-connect");
  if (autoConnect) autoConnect.checked = current.autoConnect;

  const root = byId<HTMLElement>("settings-modal");
  root.classList.remove("hidden");
  root.setAttribute("aria-hidden", "false");

  if (!onDocumentKeydown) {
    onDocumentKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
      }
    };
    document.addEventListener("keydown", onDocumentKeydown);
  }
}

export function bindSettingsModal(): void {
  const root = byId<HTMLElement>("settings-modal");
  const backdrop = byId<HTMLElement>("settings-modal-backdrop");
  const closeBtn = byId<HTMLButtonElement>("settings-close");

  backdrop.addEventListener("click", () => {
    closeModal();
  });

  closeBtn.addEventListener("click", () => {
    closeModal();
  });

  const autoConnect = byId<HTMLInputElement>("setting-auto-connect");
  autoConnect.addEventListener("change", () => {
    settings.updateSetting("autoConnect", autoConnect.checked);
  });

  // Modal background click
  root.addEventListener("click", (event) => {
    if (event.target === root) {
      closeModal();
    }
  });
}
