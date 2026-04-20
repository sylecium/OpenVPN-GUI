import type { VpnStatus } from "../types/ipc";

export const session = {
  logsCursor: 0,
  isBusy: false,
  lastKnownStatus: "idle" as VpnStatus,
  /** Profil réellement actif côté démon (peut différer de la sélection UI). */
  lastActiveProfile: null as string | null,
  /** Dernier host:port extrait des journaux pour le profil actuellement connecté au démon. */
  lastRemoteFromLogs: null as { path: string; endpoint: string } | null,
  /** Cache lecture fichier .ovpn (évite de relire à chaque tick). */
  ovpnRemoteCache: null as { path: string; value: string } | null,
  lastTrafficSample: null as { t: number; rx: number; tx: number } | null,
  /** Valeurs initiales de la session pour calculer le total (RX/TX au moment de la connexion). */
  sessionTrafficBase: null as { rx: number; tx: number } | null,
};
