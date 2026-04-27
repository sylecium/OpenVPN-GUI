import { open } from "@tauri-apps/plugin-dialog";
import * as backend from "../api/backend";
import { byId } from "../lib/dom";
import { setFeedback } from "../ui/feedback";
import { refreshServerMetaForProfile, resetServerMetaEmpty } from "../ui/server-meta-view";
import { refreshRecentProfiles, syncVpnSidebarFromProfilePath } from "../sync/profiles";
import { refreshStatus } from "../sync/status";
import { session } from "../state/session";
import { t } from "../i18n";

export async function upsertFromPath(profilePath: string): Promise<void> {
  await backend.apiUpsertRecentProfile(profilePath);
  setFeedback(t("feedback.profileSaved"));
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
  refreshServerMetaForProfile(selectedPath);
  setFeedback(t("feedback.profileSelected"));
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
      title: t("dialog.browseTitle"),
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
    setFeedback(t("feedback.profileRemoved"));
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
  
  // Synchronise le select caché pour que syncContentVisibility trouve le bon label
  const select = byId<HTMLSelectElement>("server-select");
  if (select.value !== value) {
    select.value = value;
  }

  if (value) {
    refreshServerMetaForProfile(value);
    setFeedback(t("feedback.profileSelected"));
  } else {
    resetServerMetaEmpty();
  }
  syncVpnSidebarFromProfilePath();
}

