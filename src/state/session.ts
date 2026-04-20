import type { VpnStatus } from "../types/ipc";

export const session = {
  logsCursor: 0,
  isBusy: false,
  lastKnownStatus: "idle" as VpnStatus,
  /** Profil réellement actif côté démon (peut différer de la sélection UI). */
  lastActiveProfile: null as string | null,
  lastTrafficSample: null as { t: number; rx: number; tx: number } | null,
  /** Valeurs initiales de la session pour calculer le total (RX/TX au moment de la connexion). */
  sessionTrafficBase: null as { rx: number; tx: number } | null,
};
