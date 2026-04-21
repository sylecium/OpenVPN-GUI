import * as backend from "../api/backend";
import { byId } from "../lib/dom";
import { guessProto } from "../lib/server-meta-logic";
import { session } from "../state/session";
import type { VpnStatus } from "../types/ipc";

function sameProfilePath(a: string, b: string): boolean {
  return a.trim() === b.trim();
}

function selectedProfilePath(): string {
  return byId<HTMLInputElement>("profile-path").value.trim();
}

function shouldPreferLogsRemote(vpnStatus: VpnStatus, profilePath: string): boolean {
  const active = session.lastActiveProfile;
  const fromLogs = session.lastRemoteFromLogs;
  return (
    vpnStatus === "connected" &&
    active != null &&
    profilePath.length > 0 &&
    sameProfilePath(active, profilePath) &&
    fromLogs != null &&
    sameProfilePath(fromLogs.path, profilePath)
  );
}

/** Updates the REMOTE card based on selection, VPN state, and logs/.ovpn cache. */
export function refreshStatRemoteDisplay(): void {
  const path = selectedProfilePath();
  const st = session.lastKnownStatus;

  if (!path) {
    byId<HTMLElement>("stat-remote").textContent = "—";
    return;
  }

  if (shouldPreferLogsRemote(st, path)) {
    byId<HTMLElement>("stat-remote").textContent = session.lastRemoteFromLogs?.endpoint ?? "—";
    return;
  }

  void ensureOvpnRemoteHint(path);
}

async function ensureOvpnRemoteHint(profilePath: string): Promise<void> {
  if (session.ovpnRemoteCache?.path === profilePath) {
    if (selectedProfilePath() === profilePath && !shouldPreferLogsRemote(session.lastKnownStatus, profilePath)) {
      byId<HTMLElement>("stat-remote").textContent = session.ovpnRemoteCache.value;
    }
    return;
  }
  try {
    const value = await backend.apiOvpnRemoteHint(profilePath);
    session.ovpnRemoteCache = { path: profilePath, value };
    if (selectedProfilePath() !== profilePath) {
      return;
    }
    if (shouldPreferLogsRemote(session.lastKnownStatus, profilePath)) {
      refreshStatRemoteDisplay();
      return;
    }
    byId<HTMLElement>("stat-remote").textContent = value;
  } catch {
    if (selectedProfilePath() === profilePath) {
      byId<HTMLElement>("stat-remote").textContent = "—";
    }
  }
}

export function updateServerMetaForFilename(filename: string): void {
  byId<HTMLElement>("stat-protocol").textContent = guessProto(filename);
  byId<HTMLElement>("stat-cipher").textContent = "AES-256-GCM";
}

/** Updates protocol/cipher and starts loading remote from .ovpn file. */
export function refreshServerMetaForProfile(profilePath: string): void {
  if (!profilePath.trim()) {
    resetServerMetaEmpty();
    return;
  }
  const base = profilePath.split(/[/\\]/).pop() ?? profilePath;
  updateServerMetaForFilename(base);
  refreshStatRemoteDisplay();
}

export function resetServerMetaEmpty(): void {
  byId<HTMLElement>("stat-protocol").textContent = "—";
  byId<HTMLElement>("stat-cipher").textContent = "—";
  byId<HTMLElement>("stat-remote").textContent = "—";
}

/** After daemon status refresh: invalidates log-based remote if no longer connected. */
export function applySessionRemoteFromStatus(vpnStatus: VpnStatus, _activeProfile: string | undefined | null): void {
  if (vpnStatus !== "connected") {
    session.lastRemoteFromLogs = null;
  }
}
