import { t } from "../i18n";
import type { VpnStatus } from "../types/ipc";
import { assertNever } from "./assert";

export function basename(path: string): string {
  const normalized = path.replace(/\/+$/, "");
  const index = normalized.lastIndexOf("/");
  return index === -1 ? normalized : normalized.slice(index + 1);
}

/** Libellé utilisé dans l'UI : nom personnalisé ou nom de fichier sans extension. */
export function profileDisplayLabel(path: string, displayName?: string | null): string {
  const trimmed = displayName?.trim();
  if (trimmed) {
    return trimmed;
  }
  const name = basename(path);
  if (name.toLowerCase().endsWith(".ovpn")) {
    return name.slice(0, -5);
  }
  return name;
}


export function formatHistoryEvent(event: string): string {
  switch (event) {
    case "connect_requested":
      return t("event.connectRequested");
    case "connect_failed":
      return t("event.connectFailed");
    case "disconnect_requested":
      return t("event.disconnectRequested");
    default:
      return event;
  }
}

export function mapStatusLabel(status: VpnStatus): string {
  switch (status) {
    case "idle":
      return t("status.idle");
    case "connecting":
      return t("status.connecting");
    case "connected":
      return t("status.connected");
    case "error":
      return t("status.error");
    default:
      return assertNever(status);
  }
}

export function formatBitrate(bytesPerSec: number): string {
  if (!Number.isFinite(bytesPerSec) || bytesPerSec < 0) {
    return "—";
  }
  const units = ["B/s", "KB/s", "MB/s", "GB/s"];
  let value = bytesPerSec;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded =
    unit === 0 ? Math.round(value) : value < 10 ? Number(value.toFixed(1)) : Math.round(value);
  return `${rounded} ${units[unit]}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "—";
  }
  if (bytes === 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded =
    unit === 0 ? Math.round(value) : value < 10 ? Number(value.toFixed(2)) : value < 100 ? Number(value.toFixed(1)) : Math.round(value);
  return `${rounded} ${units[unit]}`;
}
