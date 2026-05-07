import * as backend from "../api/backend";
import { formatBitrate, formatBytes } from "../lib/format";
import { byId } from "../lib/dom";
import { session } from "../state/session";
import { t } from "../i18n";
import {
  getSessionTrafficBase,
  setSessionTrafficBase,
  clearSessionTrafficBase,
} from "../lib/ui-store";

export async function refreshTrafficStats(): Promise<void> {
  const downEl = byId<HTMLElement>("stat-down");
  const upEl = byId<HTMLElement>("stat-up");
  const ifaceEl = byId<HTMLElement>("stat-iface");
  const totalDownEl = byId<HTMLElement>("stat-total-down");
  const totalUpEl = byId<HTMLElement>("stat-total-up");

  const clearUI = () => {
    downEl.textContent = "—";
    upEl.textContent = "—";
    ifaceEl.textContent = `${t("stats.interface")}: —`;
    totalDownEl.textContent = "—";
    totalUpEl.textContent = "—";
  };

  if (session.lastKnownStatus !== "connected") {
    session.lastTrafficSample = null;
    session.smoothedRxBps = null;
    session.smoothedTxBps = null;
    if (session.sessionTrafficBase !== null) {
      // La session vient de se terminer : on efface la base persistée
      clearSessionTrafficBase();
    }
    session.sessionTrafficBase = null;
    clearUI();
    return;
  }

  try {
    const sample = await backend.apiVpnIfaceTraffic();

    // Capture initial values at the first session sample
    if (!session.sessionTrafficBase) {
      const activeProfile = session.lastActiveProfile ?? "";

      // Tenter de restaurer la base depuis localStorage si elle correspond
      // au profil actuellement connecté (survie à un redémarrage de la GUI)
      const persisted = getSessionTrafficBase();
      if (
        persisted !== null &&
        activeProfile.trim() !== "" &&
        persisted.profilePath === activeProfile.trim() &&
        persisted.rx <= sample.rxBytes &&
        persisted.tx <= sample.txBytes
      ) {
        // Base cohérente : on la réutilise pour préserver les totaux de session
        session.sessionTrafficBase = { rx: persisted.rx, tx: persisted.tx };
      } else {
        // Première connexion ou base invalide : on initialise et on persiste
        session.sessionTrafficBase = { rx: sample.rxBytes, tx: sample.txBytes };
        if (activeProfile.trim() !== "") {
          setSessionTrafficBase({
            profilePath: activeProfile.trim(),
            rx: sample.rxBytes,
            tx: sample.txBytes,
          });
        }
      }
    }

    const now = Date.now() / 1000;

    let currentDrx = 0;
    let currentDtx = 0;
    let validRate = false;

    // Calculate instant bitrate
    if (session.lastTrafficSample) {
      const dt = now - session.lastTrafficSample.t;
      if (dt > 0.05) {
        const drx = sample.rxBytes - session.lastTrafficSample.rx;
        const dtx = sample.txBytes - session.lastTrafficSample.tx;
        currentDrx = (drx < 0 ? 0 : drx) / dt;
        currentDtx = (dtx < 0 ? 0 : dtx) / dt;
        validRate = true;
      }
    }

    session.lastTrafficSample = { t: now, rx: sample.rxBytes, tx: sample.txBytes };

    const selected = byId<HTMLInputElement>("profile-path").value.trim();
    const active = session.lastActiveProfile;
    const activeMatch = active != null && selected.length > 0 && selected === active.trim();

    if (!activeMatch) {
      clearUI();
      return;
    }

    ifaceEl.textContent =
      sample.iface === "—" ? `${t("stats.interface")}: ${t("stats.interface.none")}` : `${t("stats.interface")}: ${sample.iface}`;

    /**
     * Coefficient de lissage EWMA.  0.4 = bon équilibre réactivité / lisibilité.
     * Un α plus faible (ex. 0.2) lisse davantage ; plus élevé (ex. 0.6) réagit plus vite.
     */
    const ALPHA = 0.4;

    if (validRate) {
      // Premier échantillon valide : initialiser l'EWMA
      if (session.smoothedRxBps === null) {
        session.smoothedRxBps = currentDrx;
        session.smoothedTxBps = currentDtx;
      } else {
        session.smoothedRxBps = ALPHA * currentDrx + (1 - ALPHA) * session.smoothedRxBps;
        session.smoothedTxBps = ALPHA * currentDtx + (1 - ALPHA) * session.smoothedTxBps;
      }
    } else if (session.smoothedRxBps === null) {
      // Connexion active mais pas encore de delta mesurable : afficher 0
      session.smoothedRxBps = 0;
      session.smoothedTxBps = 0;
    }
    // Si !validRate mais EWMA déjà initialisé, on garde la dernière valeur
    // (ce cas ne devrait pas arriver avec un dt normal, mais protège contre
    // un écart de temps trop court entre deux appels).

    downEl.textContent = formatBitrate(session.smoothedRxBps ?? 0);
    upEl.textContent   = formatBitrate(session.smoothedTxBps ?? 0);

    // Calculate and display session total
    const sessionRx = sample.rxBytes - session.sessionTrafficBase.rx;
    const sessionTx = sample.txBytes - session.sessionTrafficBase.tx;
    totalDownEl.textContent = formatBytes(sessionRx < 0 ? 0 : sessionRx);
    totalUpEl.textContent = formatBytes(sessionTx < 0 ? 0 : sessionTx);

  } catch {
    clearUI();
  }
}
