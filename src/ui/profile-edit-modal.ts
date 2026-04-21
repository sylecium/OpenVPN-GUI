import { openPath } from "@tauri-apps/plugin-opener";

import * as backend from "../api/backend";
import { basename } from "../lib/format";
import { byId } from "../lib/dom";
import { refreshRecentProfiles } from "../sync/profiles";
import { setFeedback } from "./feedback";

let onDocumentKeydown: ((event: KeyboardEvent) => void) | null = null;

function closeModal(): void {
  const root = byId<HTMLElement>("profile-edit-modal");
  root.classList.add("hidden");
  root.setAttribute("aria-hidden", "true");
  if (onDocumentKeydown) {
    document.removeEventListener("keydown", onDocumentKeydown);
    onDocumentKeydown = null;
  }
}

export function openProfileEditModal(profilePath: string, customDisplay: string, group: string): void {
  const root = byId<HTMLElement>("profile-edit-modal");
  const form = byId<HTMLFormElement>("profile-edit-form");
  const nameInput = byId<HTMLInputElement>("profile-edit-display-name");
  const groupInput = byId<HTMLInputElement>("profile-edit-group");
  const pathInput = byId<HTMLInputElement>("profile-edit-file-path");

  form.dataset.startPath = profilePath;
  nameInput.value = customDisplay.trim();
  groupInput.value = group.trim();
  pathInput.value = profilePath;

  const hint = byId<HTMLElement>("profile-edit-basename-hint");
  hint.textContent = profilePath ? `Nom de fichier : ${basename(profilePath)}` : "";

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

  window.setTimeout(() => {
    nameInput.focus();
  }, 0);
}

async function saveProfileEdits(originalPath: string): Promise<void> {
  const nameInput = byId<HTMLInputElement>("profile-edit-display-name");
  const groupInput = byId<HTMLInputElement>("profile-edit-group");
  const pathInput = byId<HTMLInputElement>("profile-edit-file-path");
  const newPath = pathInput.value.trim();
  const displayTrim = nameInput.value.trim();
  const groupTrim = groupInput.value.trim();

  if (!newPath) {
    setFeedback("Le chemin du fichier ne peut pas être vide.", true);
    return;
  }

  const saveBtn = byId<HTMLButtonElement>("profile-edit-save");
  saveBtn.disabled = true;
  try {
    let pathAfter = originalPath;
    if (newPath !== originalPath) {
      pathAfter = await backend.apiRenameProfileFile(originalPath, newPath);
    }
    await backend.apiSetProfileMetadata(
      pathAfter,
      displayTrim.length > 0 ? displayTrim : null,
      groupTrim.length > 0 ? groupTrim : null,
    );

    byId<HTMLInputElement>("profile-path").value = pathAfter;
    setFeedback("Profil mis à jour");
    closeModal();
    await refreshRecentProfiles();
  } catch (error) {
    setFeedback(String(error), true);
  } finally {
    saveBtn.disabled = false;
  }
}

export function bindProfileEditModal(): void {
  const root = byId<HTMLElement>("profile-edit-modal");
  const backdrop = byId<HTMLElement>("profile-edit-modal-backdrop");
  const cancel = byId<HTMLButtonElement>("profile-edit-cancel");
  const saveBtn = byId<HTMLButtonElement>("profile-edit-save");
  const openEditor = byId<HTMLButtonElement>("profile-edit-open-editor");
  const form = byId<HTMLFormElement>("profile-edit-form");
  const pathInput = byId<HTMLInputElement>("profile-edit-file-path");
  const hint = byId<HTMLElement>("profile-edit-basename-hint");

  pathInput.addEventListener("input", () => {
    const p = pathInput.value.trim();
    hint.textContent = p ? `Nom de fichier : ${basename(p)}` : "";
  });

  backdrop.addEventListener("click", () => {
    closeModal();
  });
  cancel.addEventListener("click", () => {
    closeModal();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const startPath = form.dataset.startPath?.trim() ?? "";
    if (!startPath) {
      return;
    }
    void saveProfileEdits(startPath);
  });

  saveBtn.addEventListener("click", () => {
    form.requestSubmit();
  });

  openEditor.addEventListener("click", () => {
    const target = pathInput.value.trim();
    if (!target) {
      setFeedback("Aucun chemin à ouvrir.", true);
      return;
    }
    void openPath(target).catch((error: unknown) => {
      setFeedback(String(error), true);
    });
  });

  root.addEventListener("click", (event) => {
    if (event.target === root) {
      closeModal();
    }
  });
}
