export type VpnStatus = "idle" | "connecting" | "connected" | "error";

export interface RecentProfile {
  path: string;
  lastUsedUnixMs: number;
  /** Nom affiché dans l'application uniquement (sinon le nom de fichier est utilisé). */
  displayName?: string | null;
}

export interface HistoryEntry {
  tsUnixMs: number;
  event: string;
  profilePath?: string;
  details?: string;
}

export interface StatusResponse {
  status: VpnStatus;
  activeProfile?: string;
}

export interface LogEntry {
  ts_unix_ms: number;
  level: "info" | "warn" | "error";
  message: string;
}

export interface LogsResponse {
  entries: LogEntry[];
  nextCursor: number;
}

export interface VpnIfaceTraffic {
  iface: string;
  rxBytes: number;
  txBytes: number;
}
