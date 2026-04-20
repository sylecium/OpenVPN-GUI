import { open } from "@tauri-apps/plugin-dialog";
import * as backend from "../api/backend";
import { basename } from "../lib/format";
import { byId } from "../lib/dom";
import { setFeedback } from "../ui/feedback";
import { updateServerMetaForFilename, resetServerMetaEmpty } from "../ui/server-meta-view";
import { refreshRecentProfiles, syncVpnSidebarFromProfilePath } from "../sync/profiles";
import { refreshStatus } from "../sync/status";
import { session } from "../state/session";

export async function upsertFromPath(profilePath: string): Promise<void> {
  await backend.apiUpsertRecentProfile(profilePath);
  setFeedback("Profil enregistré dans la liste");
  await refreshRecentProfiles();
}

export async function applyPickedProfile(selectedPath: string): Promise<void> {
  byId<HTMLInputElement>("profile-path").value = selectedPath;
  const select = byId<HTMLSelectElement>("server-select");
  const exists = [...select.options].some((option) => option.value === selectedPath);
  if (exists) {
    select.value = selectedPath;
  } else {
    await upsertFromPath(selectedPath);
    return;
  }
  updateServerMetaForFilename(basename(selectedPath));
  setFeedback("Profil sélectionné");
  syncVpnSidebarFromProfilePath();
}

export async function browseForProfile(): Promise<void> {
  if (session.isBusy) {
    return;
  }
  try {
    const selected = await open({
      multiple: false,
      directory: false,
      title: "Choisir un fichier OpenVPN",
      filters: [{ name: "OpenVPN", extensions: ["ovpn", "conf"] }],
    });
    if (typeof selected === "string") {
      await applyPickedProfile(selected);
    }
  } catch (error) {
    setFeedback(String(error), true);
  }
}

export async function removeProfileFromRecents(profilePath: string): Promise<void> {
  try {
    await backend.apiRemoveRecentProfile(profilePath);
    setFeedback("Profil retiré de la liste");
    if (byId<HTMLInputElement>("profile-path").value === profilePath) {
      byId<HTMLInputElement>("profile-path").value = "";
    }
    await refreshRecentProfiles();
    await refreshStatus();
  } catch (error) {
    setFeedback(String(error), true);
  }
}

export function onServerSelectChange(value: string): void {
  byId<HTMLInputElement>("profile-path").value = value;
  if (value) {
    updateServerMetaForFilename(basename(value));
    setFeedback("Profil sélectionné");
  } else {
    resetServerMetaEmpty();
  }
  syncVpnSidebarFromProfilePath();
}
