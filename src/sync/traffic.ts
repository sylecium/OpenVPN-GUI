import * as backend from "../api/backend";
import { formatBitrate, formatBytes } from "../lib/format";
import { byId } from "../lib/dom";
import { session } from "../state/session";

export async function refreshTrafficStats(): Promise<void> {
  const downEl = byId<HTMLElement>("stat-down");
  const upEl = byId<HTMLElement>("stat-up");
  const ifaceEl = byId<HTMLElement>("stat-iface");
  const totalDownEl = byId<HTMLElement>("stat-total-down");
  const totalUpEl = byId<HTMLElement>("stat-total-up");

  if (session.lastKnownStatus !== "connected") {
    session.lastTrafficSample = null;
    session.sessionTrafficBase = null;
    downEl.textContent = "—";
    upEl.textContent = "—";
    ifaceEl.textContent = "Interface : —";
    totalDownEl.textContent = "—";
    totalUpEl.textContent = "—";
    return;
  }

  try {
    const sample = await backend.apiVpnIfaceTraffic();
    ifaceEl.textContent =
      sample.iface === "—" ? "Interface : aucune (tun/tap)" : `Interface : ${sample.iface}`;

    // Capture des valeurs initiales au premier échantillon de la session
    if (!session.sessionTrafficBase) {
      session.sessionTrafficBase = { rx: sample.rxBytes, tx: sample.txBytes };
    }

    const now = Date.now() / 1000;

    // Calcul et affichage du débit instantané
    if (session.lastTrafficSample) {
      const dt = now - session.lastTrafficSample.t;
      if (dt > 0.05) {
        const drx = sample.rxBytes - session.lastTrafficSample.rx;
        const dtx = sample.txBytes - session.lastTrafficSample.tx;
        const safeDrx = drx < 0 ? 0 : drx;
        const safeDtx = dtx < 0 ? 0 : dtx;
        downEl.textContent = formatBitrate(safeDrx / dt);
        upEl.textContent = formatBitrate(safeDtx / dt);
      }
    } else {
      downEl.textContent = "—";
      upEl.textContent = "—";
    }

    // Calcul et affichage du total de session
    const sessionRx = sample.rxBytes - session.sessionTrafficBase.rx;
    const sessionTx = sample.txBytes - session.sessionTrafficBase.tx;
    totalDownEl.textContent = formatBytes(sessionRx < 0 ? 0 : sessionRx);
    totalUpEl.textContent = formatBytes(sessionTx < 0 ? 0 : sessionTx);

    session.lastTrafficSample = { t: now, rx: sample.rxBytes, tx: sample.txBytes };
  } catch {
    downEl.textContent = "—";
    upEl.textContent = "—";
    totalDownEl.textContent = "—";
    totalUpEl.textContent = "—";
  }
}
