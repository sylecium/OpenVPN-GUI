import { invoke } from "@tauri-apps/api/core";
import type {
  HistoryEntry,
  LogsResponse,
  RecentProfile,
  StatusResponse,
  VpnIfaceTraffic,
} from "../types/ipc";

export async function apiVpnConnect(profilePath: string): Promise<string> {
  return invoke<string>("vpn_connect", { profilePath });
}

export async function apiVpnDisconnect(): Promise<string> {
  return invoke<string>("vpn_disconnect");
}

export async function apiVpnStatus(): Promise<StatusResponse> {
  return invoke<StatusResponse>("vpn_status");
}

export async function apiVpnLogs(since: number, limit: number): Promise<LogsResponse> {
  return invoke<LogsResponse>("vpn_logs", { since, limit });
}

export async function apiVpnIfaceTraffic(): Promise<VpnIfaceTraffic> {
  return invoke<VpnIfaceTraffic>("vpn_iface_traffic");
}

export async function apiRecentProfiles(): Promise<RecentProfile[]> {
  return invoke<RecentProfile[]>("recent_profiles");
}

export async function apiUpsertRecentProfile(profilePath: string): Promise<void> {
  return invoke("upsert_recent_profile", { profilePath });
}

export async function apiRemoveRecentProfile(profilePath: string): Promise<void> {
  return invoke("remove_recent_profile", { profilePath });
}

export async function apiSetProfileDisplayName(
  profilePath: string,
  displayName: string | null,
): Promise<void> {
  return invoke("set_profile_display_name", { profilePath, displayName });
}

export async function apiRenameProfileFile(oldPath: string, newPath: string): Promise<string> {
  return invoke<string>("rename_profile_file", { oldPath, newPath });
}

export async function apiHistoryEntries(): Promise<HistoryEntry[]> {
  return invoke<HistoryEntry[]>("history_entries");
}

export async function apiHistoryClear(): Promise<void> {
  return invoke("history_clear");
}
